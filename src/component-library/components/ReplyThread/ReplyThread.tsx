import { FullMessageController } from "../../../controllers/FullMessageController";
import type { AppDm } from "../../../contexts/XmtpContext";
import useConversationMessages from "../../../hooks/useConversationMessages";
import useReplies from "../../../hooks/useReplies";
import { useXmtpStore } from "../../../store/xmtp";

export type ReplyThreadProps = {
  conversation: AppDm;
};

export const ReplyThread: React.FC<ReplyThreadProps> = ({ conversation }) => {
  const activeMessage = useXmtpStore((state) => state.activeMessage);
  // There is no server-side query for replies, so the thread is derived from
  // the conversation's loaded messages.
  const { messages } = useConversationMessages(conversation);
  const replies = useReplies(messages, activeMessage);

  return (
    <div data-testid="replies-container" className="flex flex-col h-full">
      {activeMessage ? (
        <FullMessageController
          key={activeMessage.id}
          message={activeMessage}
          conversation={conversation}
          isReply
        />
      ) : null}
      {replies.map((msg) => (
        <FullMessageController
          key={msg.id}
          message={msg}
          conversation={conversation}
          isReply
        />
      ))}
    </div>
  );
};
