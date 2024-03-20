import type { CachedConversation, CachedMessageWithId } from "@xmtp/react-sdk";
import { useTranslation } from "react-i18next";
import { useXmtpStore } from "../../../store/xmtp";

export type ReplyBarProps = {
  conversation: CachedConversation;
  message: CachedMessageWithId;
  setOnHover: (hover: boolean) => void;
};

export const ReplyBar: React.FC<ReplyBarProps> = ({ message }) => {
  // For replies
  const activeMessage = useXmtpStore((state) => state.activeMessage);
  const setActiveMessage = useXmtpStore((state) => state.setActiveMessage);
  const { t } = useTranslation();

  return (
    <div data-testid="reply-bar">
      <div className="flex items-center gap-1">
        {!activeMessage ? (
          <button
            className="bg-gray-100 p-1 px-2 rounded-lg"
            data-testid="reply-icon"
            onClick={() => {
              setActiveMessage(message);
            }}
            type="button">
            {t("messages.reply")}
          </button>
        ) : null}
      </div>
    </div>
  );
};
