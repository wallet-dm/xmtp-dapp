import { useDisconnect } from "wagmi";
import SideNav from "../component-library/components/SideNav/SideNav";
import type { ETHAddress } from "../helpers";
import useXmtpClient from "../hooks/useXmtpClient";
import { useXmtpStore } from "../store/xmtp";

export const SideNavController = () => {
  const { client, disconnect } = useXmtpClient();
  const walletAddress = client?.accountIdentifier?.identifier as
    | ETHAddress
    | undefined;
  const resetXmtpState = useXmtpStore((s) => s.resetXmtpState);
  const clientName = useXmtpStore((s) => s.clientName);
  const clientAvatar = useXmtpStore((s) => s.clientAvatar);
  const { reset: resetWagmi } = useDisconnect();
  const { disconnect: disconnectWagmi } = useDisconnect();

  return (
    <SideNav
      displayAddress={clientName ?? walletAddress}
      walletAddress={walletAddress}
      avatarUrl={clientAvatar || ""}
      onDisconnect={() => {
        void disconnect();
        disconnectWagmi();
        resetWagmi();
        resetXmtpState();
      }}
    />
  );
};
