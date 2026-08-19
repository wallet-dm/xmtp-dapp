import type { Attachment } from "@xmtp/content-type-remote-attachment";
import {
  type CachedMessageWithId,
  useStartConversation,
} from "@xmtp/react-sdk";
import { MessageInput } from "../component-library/components/MessageInput/MessageInput";
import useSendMessage from "../hooks/useSendMessage";
import useSelectedConversation from "../hooks/useSelectedConversation";
import { useXmtpStore } from "../store/xmtp";

interface MessageInputControllerProps {
  attachment?: Attachment;
  attachmentPreview?: string;
  setAttachment: (attachment: Attachment | undefined) => void;
  setAttachmentPreview: (url: string | undefined) => void;
  setIsDragActive: (status: boolean) => void;
}

export const MessageInputController = ({
  attachment,
  setAttachment,
  attachmentPreview,
  setAttachmentPreview,
  setIsDragActive,
}: MessageInputControllerProps) => {
  // XMTP Hooks
  const conversation = useSelectedConversation();

  const recipientOnNetwork = useXmtpStore((s) => s.recipientOnNetwork);
  const recipientAddress = useXmtpStore((s) => s.recipientAddress);
  const activeMessage = useXmtpStore((s) => s.activeMessage);

  const { startConversation } = useStartConversation();
  const { sendMessage } = useSendMessage(
    attachment || undefined,
    // the store types activeMessage as a browser-sdk DecodedMessage; the
    // send path still speaks react-sdk cached shapes until it migrates
    activeMessage as unknown as CachedMessageWithId | undefined,
  );

  return (
    <MessageInput
      peerAddress={recipientAddress}
      isDisabled={!recipientOnNetwork}
      startConversation={startConversation}
      sendMessage={sendMessage}
      conversation={conversation}
      attachment={attachment}
      setAttachment={setAttachment}
      attachmentPreview={attachmentPreview}
      setAttachmentPreview={setAttachmentPreview}
      setIsDragActive={setIsDragActive}
    />
  );
};
