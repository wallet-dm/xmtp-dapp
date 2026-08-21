import { FullMessage } from "../component-library/components/FullMessage/FullMessage";
import type { AppDm, AppMessage } from "../contexts/XmtpContext";
import { classNames, shortAddress } from "../helpers";
import useXmtpClient from "../hooks/useXmtpClient";
import { useAddressForInboxId, usePeerName } from "../store/identity";
import MessageContentController from "./MessageContentController";
import { useXmtpStore } from "../store/xmtp";

interface FullMessageControllerProps {
  message: AppMessage;
  conversation: AppDm;
  isReply?: boolean;
  hasReplies?: boolean;
}

export const FullMessageController = ({
  message,
  conversation,
  isReply,
  hasReplies,
}: FullMessageControllerProps) => {
  const { client } = useXmtpClient();
  const recipientName = useXmtpStore((s) => s.recipientName);

  // V3 identifies senders by inbox id; the address is resolved through the
  // identity cache the conversation list already populated.
  const isSelf = message.senderInboxId === client?.inboxId;
  const senderAddress = useAddressForInboxId(message.senderInboxId);
  const senderName = usePeerName(senderAddress);

  const alignmentStyles = isSelf
    ? "items-end justify-end"
    : "items-start justify-start";

  return (
    <div
      className={classNames(
        "flex flex-col w-full px-4 md:px-8",
        alignmentStyles,
      )}>
      <FullMessage
        isReply={isReply}
        hasReplies={hasReplies}
        message={message}
        conversation={conversation}
        key={message.id}
        from={{
          displayAddress:
            senderName ??
            recipientName ??
            shortAddress(senderAddress ?? message.senderInboxId),
          isSelf,
        }}
        datetime={message.sentAt}>
        <MessageContentController message={message} isSelf={isSelf} />
      </FullMessage>
    </div>
  );
};
