import type {
  CachedConversation,
  CachedMessageWithId
} from "@xmtp/react-sdk";
import {
  useReplies,
  useResendMessage
} from "@xmtp/react-sdk";
import type { KeyboardEventHandler, PropsWithChildren } from "react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { classNames } from "../../../helpers";
import { useXmtpStore } from "../../../store/xmtp";
import { DateDivider } from "../DateDivider/DateDivider";
import { ReplyBar } from "../ReplyBar/ReplyBar";

interface MessageSender {
  displayAddress: string;
  isSelf?: boolean;
}

const enterKey = "Enter";

type FullMessageProps = PropsWithChildren & {
  message: CachedMessageWithId;
  /**
   * what conversation is the message part of?
   */
  conversation: CachedConversation;
  /**
   * who is the message from?
   */
  from: MessageSender;
  /**
   * What is the datetime of the message?
   */
  datetime: Date;
  /**
   * Should we show the date divider?
   */
  showDateDivider?: boolean;
  /**
   * Is this message a reply?
   */
  isReply?: boolean;
};

const incomingMessageBackgroundStyles = "bg-gray-200 rounded-br-lg pl-2";
const outgoingMessageBackgroundStyles =
  "bg-indigo-600 text-white rounded-bl-lg message-sender";
const errorMessageBackgroundStyles =
  "bg-white rounded-bl-lg pl-2 border-gray-200 border";

export const FullMessage = ({
  children,
  message,
  conversation,
  from,
  datetime,
  showDateDivider = false,
  isReply,
}: FullMessageProps) => {
  const { t } = useTranslation();
  const { resend, cancel } = useResendMessage();
  const [onHover, setOnHover] = useState(false);

  const setActiveMessage = useXmtpStore((s) => s.setActiveMessage);
  const replies = useReplies(message);

  const handleResend = useCallback(() => {
    void resend(message);
  }, [message, resend]);

  const handleResendKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (e) => {
      if (e.key === enterKey) {
        void handleResend();
      }
    },
    [handleResend],
  );

  const handleCancel = useCallback(() => {
    void cancel(message);
  }, [message, cancel]);

  const handleCancelKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (e) => {
      if (e.key === enterKey) {
        void handleCancel();
      }
    },
    [handleCancel],
  );

  const messageBackgroundStyles = useMemo(() => {
    if (message.hasLoadError) {
      return errorMessageBackgroundStyles;
    }
    if (from.isSelf) {
      return outgoingMessageBackgroundStyles;
    }
    return incomingMessageBackgroundStyles;
  }, [from.isSelf, message.hasLoadError]);

  const alignmentStyles = from.isSelf
    ? "items-end justify-end"
    : "items-start justify-start";

  return (
    <div
      data-testid="message-tile-container"
      className={classNames("flex flex-col w-full", alignmentStyles)}>
      <div
        className={classNames(
          "text-sm",
          "flex",
          "flex-col",
          "max-w-[80%]",
          "md:max-w-[50%]",
          "w-fit",
          alignmentStyles,
        )}
        onMouseOut={() => setOnHover(false)}
        onBlur={() => setOnHover(false)}>
        <div
          className={classNames("flex flex-col max-w-full", alignmentStyles)}>
          <div
            className={classNames(onHover ? "opacity-1" : "opacity-0")}
            onMouseOver={() => setOnHover(true)}
            onFocus={() => setOnHover(true)}>
            <ReplyBar
              message={message}
              conversation={conversation}
              setOnHover={setOnHover}
            />
          </div>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={() => setOnHover(true)}
            className={classNames(
              "whitespace-pre-wrap p-2 px-3 rounded-tl-xl rounded-tr-xl my-1 w-full break-words text-md pl-3 mt-0",
              messageBackgroundStyles,
            )}
            onMouseOver={() => setOnHover(true)}
            onFocus={() => setOnHover(true)}>
            {children}
          </div>
          <div
            className={classNames(
              "text-xs text-gray-500 w-full flex",
              alignmentStyles,
            )}>
            {message.hasSendError ? (
              <div className="text-red-600 flex align-center font-bold gap-1">
                <div>{t("messages.message_not_delivered")}</div>
                <div>&bull;</div>
                <div
                  role="button"
                  tabIndex={0}
                  className="underline"
                  onKeyDown={handleResendKeyDown}
                  onClick={handleResend}>
                  {t("messages.message_retry")}
                </div>
                <div>&bull;</div>
                <div
                  role="button"
                  tabIndex={0}
                  className="underline"
                  onKeyDown={handleCancelKeyDown}
                  onClick={handleCancel}>
                  {t("messages.message_cancel")}
                </div>
              </div>
            ) : (
              t("{{datetime, time}}", { datetime })
            )}
          </div>
          {replies.length && !isReply ? (
            <button
              type="button"
              onClick={() => setActiveMessage(message)}
              className="text-gray-500"
              data-testid="view-replies-cta">
              {t("messages.view_replies")}
            </button>
          ) : null}
        </div>
      </div>
      {showDateDivider && <DateDivider date={datetime} />}
    </div>
  );
};
