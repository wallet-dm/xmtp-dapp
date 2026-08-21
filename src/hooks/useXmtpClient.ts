import { useContext } from "react";
import { XmtpContext } from "../contexts/XmtpContext";
import type { XmtpContextValue } from "../contexts/XmtpContext";

/**
 * Access the app's XMTP client and its lifecycle state.
 *
 * Replaces react-sdk's `useClient`. Throws rather than returning a null-ish
 * shape, because every consumer sits under `XmtpProvider` and a missing
 * provider is a wiring bug, not a state to render around.
 */
export const useXmtpClient = (): XmtpContextValue => {
  const context = useContext(XmtpContext);
  if (!context) {
    throw new Error("useXmtpClient must be used within an XmtpProvider");
  }
  return context;
};

export default useXmtpClient;
