import { isReply } from "@xmtp/browser-sdk";
import { contentTypesAreEqual } from "@xmtp/content-type-primitives";
import { isSameDay } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { DateDivider } from "../component-library/components/DateDivider/DateDivider";
import { FullConversation } from "../component-library/components/FullConversation/FullConversation";
import RainEffect from "../component-library/components/ScreenEffects/RainEffect";
import SnowEffect from "../component-library/components/ScreenEffects/SnowEffect";
import type { AppDm, AppMessage } from "../contexts/XmtpContext";
import type {
  EffectType,
  ScreenEffect,
} from "../helpers/codecs/ScreenEffectCodec";
import { ContentTypeScreenEffect } from "../helpers/codecs/ScreenEffectCodec";
import { isMessageSupported } from "../helpers/isMessagerSupported";
import useConversationMessages from "../hooks/useConversationMessages";
import { getRepliedToIds } from "../hooks/useReplies";
import { useXmtpStore } from "../store/xmtp";
import { FullMessageController } from "./FullMessageController";

type FullConversationControllerProps = {
  conversation: AppDm;
};

const asScreenEffect = (message: AppMessage): ScreenEffect | undefined =>
  contentTypesAreEqual(message.contentType, ContentTypeScreenEffect)
    ? (message.content as ScreenEffect | undefined)
    : undefined;

export const FullConversationController: React.FC<
  FullConversationControllerProps
> = ({ conversation }) => {
  const renderedDatesRef = useRef<Date[]>([]);
  const [effect, setEffect] = useState<EffectType | undefined>(undefined);
  const [effectMessageId, setEffectMessageId] = useState<string>("");
  const recipientAddress = useXmtpStore((s) => s.recipientAddress);

  const { messages, isLoading } = useConversationMessages(conversation);
  const [peerInboxId, setPeerInboxId] = useState<string | undefined>();

  // the consent banner writes against the peer's inbox as well as the
  // conversation, so a block survives them starting a new DM
  useEffect(() => {
    let cancelled = false;
    void conversation.peerInboxId().then((inboxId) => {
      if (!cancelled) {
        setPeerInboxId(inboxId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversation]);
  const repliedToIds = useMemo(() => getRepliedToIds(messages), [messages]);

  const messagesWithDates = useMemo(
    () =>
      messages.map((msg, index) => {
        // Screen effects play over the whole conversation rather than
        // rendering inline, and only the first time they are seen.
        const screenEffect = asScreenEffect(msg);
        if (screenEffect) {
          if (!localStorage.getItem(msg.id)) {
            setEffect(screenEffect.effectType);
            setEffectMessageId(msg.id);
          }
          return null;
        }

        // Replies are reached through the parent's "view replies" affordance
        // rather than appearing inline, which is how the conversation read
        // before the migration.
        if (isReply(msg)) {
          return null;
        }

        // unsupported content with no fallback text has nothing to render
        if (!isMessageSupported(msg) && !msg.fallback) {
          return null;
        }

        if (renderedDatesRef.current.length === 0) {
          renderedDatesRef.current.push(msg.sentAt);
        }
        const lastRenderedDate = renderedDatesRef.current.at(-1) as Date;
        const isFirstMessage = index === 0;
        const isSameDate = isSameDay(lastRenderedDate, msg.sentAt);
        const shouldDisplayDate = isFirstMessage || !isSameDate;

        if (shouldDisplayDate) {
          renderedDatesRef.current.push(msg.sentAt);
        }

        return (
          <div key={msg.id}>
            {shouldDisplayDate && (
              <DateDivider date={renderedDatesRef.current.at(-1) as Date} />
            )}
            <FullMessageController
              message={msg}
              conversation={conversation}
              hasReplies={repliedToIds.has(msg.id)}
            />
          </div>
        );
      }),
    [messages, conversation, repliedToIds],
  );

  return (
    <div
      id="scrollableDiv"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="w-full h-full flex flex-col overflow-auto relative">
      {effect === "SNOW" ? (
        <SnowEffect messageId={effectMessageId} key={effectMessageId} />
      ) : effect === "RAIN" ? (
        <RainEffect messageId={effectMessageId} key={effectMessageId} />
      ) : null}
      <FullConversation
        isLoading={isLoading}
        messages={messagesWithDates}
        address={recipientAddress ?? ""}
        conversation={conversation}
        peerInboxId={peerInboxId}
      />
    </div>
  );
};
