import { useCallback } from "react";
import {
  encodeRemoteAttachment,
  encodeText,
  encryptAttachment,
} from "@xmtp/browser-sdk";
import type { Attachment, RemoteAttachment } from "@xmtp/browser-sdk";
import * as Client from "@web3-storage/w3up-client";
import * as Signer from "@ucanto/principal/ed25519";
import Upload from "../helpers/classes/Upload";
import type { AppDm, AppMessage } from "../contexts/XmtpContext";
import { useXmtpStore } from "../store/xmtp";
import { parseProof } from "../helpers/attachments";

/**
 * Uploads the encrypted bytes to web3.storage and returns the pointer that
 * travels over XMTP. Only ciphertext leaves the browser — the key material
 * stays in the message.
 */
const uploadEncryptedAttachment = async (
  attachment: Attachment,
): Promise<RemoteAttachment> => {
  const principal = Signer.parse(import.meta.env.VITE_KEY);
  const client = await Client.create({ principal });

  const proof = await parseProof(import.meta.env.VITE_PROOF);
  const space = await client.addSpace(proof);
  await client.setCurrentSpace(space.did());

  const encrypted = await encryptAttachment(attachment);

  const cid = await client.uploadFile(
    new Upload("XMTPEncryptedContent", encrypted.payload),
  );

  return {
    url: `https://w3s.link/ipfs/${cid.toString()}`,
    contentDigest: encrypted.contentDigest,
    secret: encrypted.secret,
    salt: encrypted.salt,
    nonce: encrypted.nonce,
    scheme: "https://",
    contentLength: attachment.content.byteLength,
    filename: attachment.filename,
  };
};

const useSendMessage = (
  attachment?: Attachment,
  activeMessage?: AppMessage | undefined,
) => {
  const recipientOnNetwork = useXmtpStore((s) => s.recipientOnNetwork);

  const sendMessage = useCallback(
    async (
      conversation: AppDm,
      message: string | Attachment,
      type: "text" | "attachment",
    ) => {
      // Returning quietly here would drop the message with no feedback at all,
      // which is indistinguishable from a send that worked.
      if (!recipientOnNetwork) {
        throw new Error(
          "This address is not reachable on the XMTP network yet.",
        );
      }

      // A reply carries its parent's id; everything else is sent directly.
      // Reply payloads are EncodedContent, so they go through the async
      // encoders rather than the typed send helpers.
      const replyTo = activeMessage
        ? {
            reference: activeMessage.id,
            referenceInboxId: activeMessage.senderInboxId,
          }
        : undefined;

      if (attachment && type === "attachment") {
        const remoteAttachment = await uploadEncryptedAttachment(attachment);

        if (replyTo) {
          await conversation.sendReply({
            ...replyTo,
            content: await encodeRemoteAttachment(remoteAttachment),
          });
        } else {
          await conversation.sendRemoteAttachment(remoteAttachment);
        }
      } else if (type === "text" && typeof message === "string") {
        if (replyTo) {
          await conversation.sendReply({
            ...replyTo,
            content: await encodeText(message),
          });
        } else {
          await conversation.sendText(message);
        }
      }
    },
    [recipientOnNetwork, attachment, activeMessage],
  );

  return { sendMessage };
};

export default useSendMessage;
