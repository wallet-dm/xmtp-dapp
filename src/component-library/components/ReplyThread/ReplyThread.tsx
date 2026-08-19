import {
  type CachedConversation,
  type CachedMessageWithId,
  useReplies,
} from "@xmtp/react-sdk";
import { FullMessageController } from "../../../controllers/FullMessageController";
import { useXmtpStore } from "../../../store/xmtp";

export type ReplyThreadProps = {
  conversation: CachedConversation;
};

export const ReplyThread: React.FC<ReplyThreadProps> = ({ conversation }) => {
  // the store types activeMessage as a browser-sdk DecodedMessage, but until
  // the reply path migrates, the runtime value is still a react-sdk cached
  // message set by the unmigrated message components
  const activeMessage = useXmtpStore(
    (state) => state.activeMessage,
  ) as unknown as CachedMessageWithId | undefined;
  const replies = useReplies(activeMessage);

  return (
    <div data-testid="replies-container" className="flex flex-col h-full">
      {activeMessage ? (
        <FullMessageController
          key={activeMessage?.xmtpID}
          message={activeMessage}
          conversation={conversation}
          isReply
        />
      ) : null}
      {replies.map((msg) => (
        <FullMessageController
          key={msg.xmtpID}
          message={msg}
          conversation={conversation}
          isReply
        />
      ))}
    </div>
  );
};
