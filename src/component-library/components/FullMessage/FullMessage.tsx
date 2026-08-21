import { DeliveryStatus } from "@xmtp/browser-sdk";
import type { PropsWithChildren } from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { classNames } from "../../../helpers";
import type { AppDm, AppMessage } from "../../../contexts/XmtpContext";
import { useXmtpStore } from "../../../store/xmtp";
import { DateDivider } from "../DateDivider/DateDivider";
import { ReplyBar } from "../ReplyBar/ReplyBar";

interface MessageSender {
  displayAddress: string;
  isSelf?: boolean;
}

type FullMessageProps = PropsWithChildren & {
  message: AppMessage;
  /**
   * what conversation is the message part of?
   */
  conversation: AppDm;
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
  /**
   * Does this message have replies in the loaded conversation?
   */
  hasReplies?: boolean;
};

const incomingMessageBackgroundStyles = "bg-gray-200 rounded-br-lg pl-2";
const outgoingMessageBackgroundStyles =
  "bg-indigo-600 text-white rounded-bl-lg message-sender";

export const FullMessage = ({
  children,
  message,
  conversation,
  from,
  datetime,
  showDateDivider = false,
  isReply,
  hasReplies = false,
}: FullMessageProps) => {
  const { t } = useTranslation();
  const [onHover, setOnHover] = useState(false);

  const setActiveMessage = useXmtpStore((s) => s.setActiveMessage);

  const failedToSend = message.deliveryStatus === DeliveryStatus.Failed;

  const messageBackgroundStyles = useMemo(
    () =>
      from.isSelf
        ? outgoingMessageBackgroundStyles
        : incomingMessageBackgroundStyles,
    [from.isSelf],
  );

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
            {failedToSend ? (
              <div className="text-red-600 flex align-center font-bold gap-1">
                <div>{t("messages.message_not_delivered")}</div>
              </div>
            ) : (
              t("{{datetime, time}}", { datetime })
            )}
          </div>
          {hasReplies && !isReply ? (
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
