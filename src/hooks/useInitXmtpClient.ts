import type { ClientOptions, Identifier, Signer } from "@xmtp/browser-sdk";
import { Client, IdentifierKind } from "@xmtp/browser-sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConnect, useWalletClient } from "wagmi";
import type { WalletClient } from "viem";
import { toBytes } from "viem";
import {
  getAppVersion,
  getEnv,
  getXmtpApiUrl,
  isAppEnvDemo,
  throttledFetchAddressName,
  throttledFetchEnsAvatar,
} from "../helpers";
import { mockConnector } from "../helpers/mockConnector";
import { useXmtpStore } from "../store/xmtp";

type ClientStatus = "new" | "created" | "enabled";

type ResolveReject<T = void> = (value: T | PromiseLike<T>) => void;

/**
 * This is a helper function for creating a new promise and getting access
 * to the resolve and reject callbacks for external use.
 */
const makePromise = <T = void>() => {
  let reject: ResolveReject<T> = () => {};
  let resolve: ResolveReject<T> = () => {};
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {
    promise,
    reject,
    resolve,
  };
};

// XMTP client options; typed without codecs so Client.create's codec
// generic falls back to the built-in content types
const clientEnv = getEnv();
const clientOptions: Omit<ClientOptions, "codecs"> = {
  env: clientEnv,
  apiUrl: getXmtpApiUrl(),
  appVersion: getAppVersion(),
};

const useInitXmtpClient = () => {
  // track if onboarding is in progress
  const onboardingRef = useRef(false);
  const walletClientRef = useRef<WalletClient | null>();
  // client built by an onboarding flow that has not finished yet; a
  // superseding flow must close it to release its worker and local DB
  const pendingClientRef = useRef<Client | null>(null);
  const [client, setClient] = useState<Client>();
  // XMTP identity status
  const [status, setStatus] = useState<ClientStatus | undefined>();
  // is the client being built or the network being queried?
  const [initializing, setInitializing] = useState(false);
  // is there a pending signature?
  const [signing, setSigning] = useState(false);
  // bumped when registration fails so the gate promises below re-arm and the
  // onboarding flow restarts, letting the user retry the signature
  const [registrationAttempt, setRegistrationAttempt] = useState(0);
  const { data: walletClient } = useWalletClient();
  const { connect: connectWallet } = useConnect();
  const setClientName = useXmtpStore((s) => s.setClientName);
  const setClientAvatar = useXmtpStore((s) => s.setClientAvatar);
  const setStoreClient = useXmtpStore((s) => s.setClient);

  /**
   * XMTP v3 registers an identity with a single wallet signature, but the
   * onboarding UI still walks users through explicit steps. These externally
   * resolvable promises park the onboarding flow until the user clicks
   * through the relevant step, so the wallet prompt appears in response to
   * that click.
   */

  // promise and resolver gating registration of a brand new identity (the
  // "create" step of the onboarding UI)
  const { createPromise, resolveCreate } = useMemo(() => {
    const { promise, resolve } = makePromise();
    return {
      createPromise: promise,
      // executing this function lets the onboarding flow continue with the
      // registration signature
      resolveCreate: () => {
        resolve();
        setSigning(true);
      },
    };
    // if the walletClient changes during the onboarding process, or a failed
    // registration is retried, reset the promise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletClient, registrationAttempt]);

  // promise and resolver gating registration when the identity already
  // exists on the network (the "enable" step authorizes this installation)
  const { enablePromise, resolveEnable } = useMemo(() => {
    const { promise, resolve } = makePromise();
    return {
      enablePromise: promise,
      // executing this function lets the onboarding flow continue with the
      // registration signature
      resolveEnable: () => {
        resolve();
        setSigning(true);
      },
    };
    // if the walletClient changes during the onboarding process, or a failed
    // registration is retried, reset the promise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletClient, registrationAttempt]);

  // if this is an app demo, connect to the temporary wallet
  useEffect(() => {
    if (isAppEnvDemo()) {
      connectWallet({ connector: mockConnector });
    }
    if (!client) {
      setStatus(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const startOnboarding = async () => {
      // onboarding is in progress
      if (onboardingRef.current) {
        // the walletClient has changed, restart the onboarding process
        if (walletClient !== walletClientRef.current) {
          setStatus(undefined);
          setSigning(false);
        } else {
          // onboarding in progress and walletClient is the same, do nothing
          return;
        }
      }
      // skip this if we already have a client and ensure we have a walletClient
      if (!client && walletClient) {
        onboardingRef.current = true;
        // close the client of a superseded flow so this one takes over its
        // worker and local DB
        pendingClientRef.current?.close();
        pendingClientRef.current = null;
        setInitializing(true);
        // by the time an await resumes, the ref effect below has recorded any
        // newer walletClient, revealing that this flow has been superseded
        const isStale = () => walletClientRef.current !== walletClient;
        try {
          const { address } = walletClient.account;
          const identifier: Identifier = {
            identifier: address.toLowerCase(),
            identifierKind: IdentifierKind.Ethereum,
          };
          const signer: Signer = {
            type: "EOA",
            getIdentifier: () => identifier,
            signMessage: async (message: string) =>
              toBytes(await walletClient.signMessage({ message })),
          };
          // build the client and its local identity DB up front; with
          // disableAutoRegister the wallet is not asked to sign anything yet
          const xmtpClient = await Client.create(signer, {
            ...clientOptions,
            disableAutoRegister: true,
          });
          if (isStale()) {
            xmtpClient.close();
            return;
          }
          pendingClientRef.current = xmtpClient;
          // an installation registered on a previous visit is stored in the
          // local DB and needs no further signatures
          const registered = await xmtpClient.isRegistered();
          if (isStale()) {
            return;
          }
          if (registered) {
            setStatus("enabled");
          } else {
            // demo mode, the mock wallet signs without prompting the user,
            // so skip the onboarding steps
            if (!isAppEnvDemo()) {
              // the identity may already exist on the network, e.g. it was
              // registered from another device or app
              const canMessageMap = await Client.canMessage(
                [identifier],
                clientEnv,
              );
              const registeredOnNetwork =
                canMessageMap.get(address.toLowerCase()) ?? false;
              if (isStale()) {
                return;
              }
              setInitializing(false);
              if (registeredOnNetwork) {
                // identity exists, wait for the user to authorize this
                // installation
                setStatus("created");
                await enablePromise;
              } else {
                // no identity on the network, wait for the user to create one
                setStatus("new");
                await createPromise;
              }
              if (isStale()) {
                return;
              }
            }
            try {
              // registers the identity (or just this installation) with a
              // single wallet signature requested through the signer
              await xmtpClient.register();
            } catch (error) {
              console.error("Error registering XMTP identity:", error);
              setSigning(false);
              // let the user retry the signature: bumping the attempt counter
              // re-arms the gate promises and restarts the flow, while the
              // status set above keeps the UI on the same step; in demo mode
              // no user gates the retry, so restarting would loop forever
              if (!isAppEnvDemo()) {
                setRegistrationAttempt((attempt) => attempt + 1);
              }
              return;
            }
            if (isStale()) {
              return;
            }
            setStatus("enabled");
          }
          setSigning(false);
          pendingClientRef.current = null;
          setClient(xmtpClient);
          // mirror the client into the store so consumers outside the
          // onboarding flow can reach it without this hook
          setStoreClient(xmtpClient);
          const name = await throttledFetchAddressName(address);
          if (name) {
            const avatar = await throttledFetchEnsAvatar({
              name,
            });
            setClientAvatar(avatar);
            setClientName(name);
          }
        } catch (error) {
          console.error("Error initializing XMTP client:", error);
          setSigning(false);
        } finally {
          onboardingRef.current = false;
          setInitializing(false);
        }
      }
    };
    void startOnboarding();
  }, [
    client,
    createPromise,
    enablePromise,
    setClientAvatar,
    setClientName,
    setStoreClient,
    walletClient,
  ]);

  // it's important that this effect runs last
  useEffect(() => {
    walletClientRef.current = walletClient;
  }, [walletClient]);

  return {
    client,
    isLoading: initializing || signing,
    resolveCreate,
    resolveEnable,
    status,
    setStatus,
  };
};

export default useInitXmtpClient;
