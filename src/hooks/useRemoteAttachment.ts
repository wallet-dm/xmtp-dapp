import { decryptAttachment } from "@xmtp/browser-sdk";
import type { Attachment, RemoteAttachment } from "@xmtp/browser-sdk";
import { useCallback, useEffect, useState } from "react";
import { MAX_FILE_SIZE } from "../helpers";

/**
 * Fetches and decrypts a remote attachment.
 *
 * The SDK provides the crypto but neither the fetch nor the state machine, so
 * both live here. The status union deliberately matches the one react-sdk
 * exposed, so the tile that renders it keeps every branch it already had.
 */
export type AttachmentStatus =
  | "init"
  | "loading"
  | "loaded"
  | "error"
  | "autoloadMaxFileSizeExceeded";

export const useRemoteAttachment = (remoteAttachment?: RemoteAttachment) => {
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [status, setStatus] = useState<AttachmentStatus>("init");

  const load = useCallback(async () => {
    if (!remoteAttachment) {
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch(remoteAttachment.url);
      if (!response.ok) {
        throw new Error(`gateway responded ${response.status}`);
      }
      const encrypted = new Uint8Array(await response.arrayBuffer());
      setAttachment(await decryptAttachment(encrypted, remoteAttachment));
      setStatus("loaded");
    } catch {
      setStatus("error");
    }
  }, [remoteAttachment]);

  useEffect(() => {
    if (!remoteAttachment) {
      return;
    }
    // Large attachments wait for an explicit tap rather than downloading on
    // sight, which is what the "load attachment" affordance in the tile is for.
    if (Number(remoteAttachment.contentLength ?? 0) > MAX_FILE_SIZE) {
      setStatus("autoloadMaxFileSizeExceeded");
      return;
    }
    void load();
  }, [load, remoteAttachment]);

  return { attachment, status, load };
};

export default useRemoteAttachment;
