import { useCallback, useEffect } from "react";
import { useConnect } from "wagmi";
import type { ETHAddress } from "../helpers";
import {
  isAppEnvDemo,
  throttledFetchAddressName,
  throttledFetchEnsAvatar,
} from "../helpers";
import { mockConnector } from "../helpers/mockConnector";
import { useXmtpStore } from "../store/xmtp";
import useXmtpClient from "./useXmtpClient";

/**
 * Drives the onboarding screen.
 *
 * XMTP V3 needs a single signature to register an installation, replacing V2's
 * create-identity-then-enable-identity pair. The externally-resolvable promises
 * that used to sequence those two prompts are gone, and so is the local key
 * storage they produced — browser-sdk keeps key material in its own database.
 */
const useInitXmtpClient = () => {
  const {
    client,
    status,
    error,
    register,
    disconnect,
    retry,
    installations,
    revokeInstallations,
  } = useXmtpClient();
  const { connect: connectWallet } = useConnect();
  const setClientName = useXmtpStore((s) => s.setClientName);
  const setClientAvatar = useXmtpStore((s) => s.setClientAvatar);

  // demo builds connect to a throwaway wallet so no signature is needed
  useEffect(() => {
    if (isAppEnvDemo()) {
      connectWallet({ connector: mockConnector });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo builds sign with a throwaway wallet, so there is no prompt to gate
  // and no CTA on the demo onboarding step. Register as soon as the client
  // reports it needs to, or the flow stalls before it is usable.
  useEffect(() => {
    if (isAppEnvDemo() && status === "unregistered") {
      void register();
    }
  }, [status, register]);

  // resolve the connected account's name and avatar for the side nav
  useEffect(() => {
    const address = client?.accountIdentifier?.identifier;
    if (status !== "ready" || !address) {
      return;
    }

    const resolveIdentity = async () => {
      const name = await throttledFetchAddressName(address as ETHAddress);
      if (!name) {
        return;
      }
      setClientName(name);
      try {
        setClientAvatar(await throttledFetchEnsAvatar({ name }));
      } catch {
        // an NFT-backed ENS avatar can fail CORS; the name is enough
        setClientAvatar(null);
      }
    };

    void resolveIdentity();
  }, [client, status, setClientAvatar, setClientName]);

  const resolveCreate = useCallback(() => {
    void register();
  }, [register]);

  return {
    client,
    error,
    isLoading: status === "building" || status === "signing",
    resolveCreate,
    status,
    retry,
    disconnect,
    installations,
    revokeInstallations,
  };
};

export default useInitXmtpClient;
