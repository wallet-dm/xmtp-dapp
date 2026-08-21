import { Client, Opfs } from "@xmtp/browser-sdk";
import type {
  DecodedMessage,
  Dm,
  ExtractCodecContentTypes,
} from "@xmtp/browser-sdk";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useWalletClient } from "wagmi";
import { ScreenEffectCodec } from "../helpers/codecs/ScreenEffectCodec";
import type { ETHAddress } from "../helpers";
import type { Installation } from "@xmtp/wasm-bindings";
import {
  fetchInstallations,
  isInstallationLimitError,
  revokeInstallations as revokeInstallationsRequest,
} from "../helpers/installations";
import { useXmtpStore } from "../store/xmtp";
import { buildClientOptions } from "../helpers/xmtpClientOptions";
import { createEOASigner } from "../helpers/xmtpSigner";

export type AppContentTypes = ExtractCodecContentTypes<[ScreenEffectCodec]>;
export type AppXmtpClient = Client<AppContentTypes>;
export type AppDm = Dm<AppContentTypes>;
export type AppMessage = DecodedMessage<AppContentTypes>;

export type XmtpStatus =
  /** no wallet connected */
  | "disconnected"
  /** Client.create in flight */
  | "building"
  /** client exists but this installation still needs the one signature */
  | "unregistered"
  /** waiting on that signature */
  | "signing"
  /** the inbox has used all of its installation slots */
  | "installation-limit"
  | "ready"
  | "error";

export type XmtpContextValue = {
  client: AppXmtpClient | null;
  status: XmtpStatus;
  error: Error | null;
  /** prompts the single signature that registers this installation */
  register: () => Promise<void>;
  /**
   * Ends the session. `wipeLocalData` additionally destroys the local
   * database, which discards this installation's keys — the next login then
   * registers a new installation, consuming one of the inbox's ten slots and
   * losing access to messages encrypted to the old one. Reserve it for an
   * explicit "forget this device", never for an ordinary logout.
   */
  disconnect: (options?: { wipeLocalData?: boolean }) => Promise<void>;
  /** re-attempt client creation after a failure */
  retry: () => void;
  /** installations occupying this inbox's slots, when at the limit */
  installations: Installation[];
  /** revoke every installation so a fresh one can register */
  revokeInstallations: () => Promise<void>;
};

export const XmtpContext = createContext<XmtpContextValue | null>(null);

/**
 * Owns the one XMTP client for the app.
 *
 * Mounted inside the single-tab guard's active branch, so a blocked tab never
 * opens a second connection to the OPFS database.
 */
export const XmtpProvider = ({ children }: PropsWithChildren) => {
  const { data: walletClient } = useWalletClient();
  const [client, setClient] = useState<AppXmtpClient | null>(null);
  const [status, setStatus] = useState<XmtpStatus>("disconnected");
  const [error, setError] = useState<Error | null>(null);
  // bumped by retry() to re-run client creation
  const [attempt, setAttempt] = useState(0);
  const [installations, setInstallations] = useState<Installation[]>([]);
  // the inbox the store's selection state belongs to
  const storeInboxIdRef = useRef<string | undefined>(undefined);
  const [limitedInboxId, setLimitedInboxId] = useState<string | undefined>();

  const address = walletClient?.account.address;

  // wagmi can hand back a new wallet client object on re-render even though
  // the underlying account is unchanged. Keying the effect on that object
  // would tear the client down and rebuild it in a loop, so it is read
  // through a ref and the effect keys on the address instead.
  const walletClientRef = useRef(walletClient);
  walletClientRef.current = walletClient;

  useEffect(() => {
    const activeWalletClient = walletClientRef.current;
    if (!activeWalletClient || !address) {
      setClient(null);
      setStatus("disconnected");
      return undefined;
    }

    let cancelled = false;
    let built: AppXmtpClient | null = null;

    const build = async () => {
      setStatus("building");
      setError(null);
      try {
        const created = await Client.create(
          createEOASigner(address as ETHAddress, activeWalletClient),
          {
            ...buildClientOptions(),
            codecs: [new ScreenEffectCodec()],
            // hold the signature back so the UI can ask for it explicitly
            // rather than firing a wallet prompt on page load
            disableAutoRegister: true,
          },
        );
        built = created;

        // the wallet changed while we were building; this client is orphaned
        if (cancelled) {
          created.close();
          return;
        }

        const registered = await created.isRegistered();
        if (cancelled) {
          created.close();
          return;
        }

        // Selected conversation, recipient and active message all belong to
        // the previous inbox. Left in place they hide the recipient input and
        // make the composer refuse to send, with no visible reason.
        if (
          storeInboxIdRef.current &&
          storeInboxIdRef.current !== created.inboxId
        ) {
          useXmtpStore.getState().resetXmtpState();
        }
        storeInboxIdRef.current = created.inboxId;

        setClient(created);
        setStatus(registered ? "ready" : "unregistered");
      } catch (caught) {
        if (cancelled) {
          return;
        }
        // Hitting the installation cap is recoverable, but only by revoking —
        // retrying the same create would fail identically, so it gets its own
        // state rather than the generic error screen.
        if (isInstallationLimitError(caught)) {
          try {
            const found = await fetchInstallations(address);
            if (!cancelled) {
              setInstallations(found.installations);
              setLimitedInboxId(found.inboxId);
              setError(caught as Error);
              setStatus("installation-limit");
            }
            return;
          } catch {
            // fall through to the generic error below
          }
        }
        setError(caught as Error);
        setStatus("error");
      }
    };

    void build();

    return () => {
      cancelled = true;
      built?.close();
      built = null;
    };
  }, [address, attempt]);

  const register = useCallback(async () => {
    if (!client) {
      return;
    }
    setStatus("signing");
    setError(null);
    try {
      await client.register();
      setStatus("ready");
    } catch (caught) {
      setError(caught as Error);
      setStatus("error");
    }
  }, [client]);

  const disconnect = useCallback(
    async ({ wipeLocalData = false } = {}) => {
      // close() only terminates the worker; the database outlives it
      client?.close();
      setClient(null);
      setStatus("disconnected");
      setError(null);

      if (wipeLocalData) {
        const opfs = await Opfs.create();
        try {
          await opfs.clearAll();
        } finally {
          opfs.close();
        }
      }
    },
    [client],
  );

  const revokeInstallations = useCallback(async () => {
    const activeWalletClient = walletClientRef.current;
    if (!activeWalletClient || !address || !limitedInboxId) {
      return;
    }
    setStatus("signing");
    setError(null);
    try {
      await revokeInstallationsRequest(
        createEOASigner(address as ETHAddress, activeWalletClient),
        limitedInboxId,
        installations,
      );
      setInstallations([]);
      setLimitedInboxId(undefined);
      // slots are free now, so build the client again
      setAttempt((current) => current + 1);
    } catch (caught) {
      setError(caught as Error);
      setStatus("error");
    }
  }, [address, installations, limitedInboxId]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((current) => current + 1);
  }, []);

  const value = useMemo<XmtpContextValue>(
    () => ({
      client,
      status,
      error,
      register,
      disconnect,
      retry,
      installations,
      revokeInstallations,
    }),
    [
      client,
      status,
      error,
      register,
      disconnect,
      retry,
      installations,
      revokeInstallations,
    ],
  );

  return <XmtpContext.Provider value={value}>{children}</XmtpContext.Provider>;
};
