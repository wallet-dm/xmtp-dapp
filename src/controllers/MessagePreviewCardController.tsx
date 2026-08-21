import {
  ConsentState,
  isAttachment,
  isRemoteAttachment,
  isReply,
  isText,
} from "@xmtp/browser-sdk";
import type { EnrichedReply } from "@xmtp/browser-sdk";
import { contentTypesAreEqual } from "@xmtp/content-type-primitives";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MessagePreviewCard } from "../component-library/components/MessagePreviewCard/MessagePreviewCard";
import { ContentTypeScreenEffect } from "../helpers/codecs/ScreenEffectCodec";
import type { ETHAddress } from "../helpers";
import { shortAddress } from "../helpers";
import type { ConversationSummary } from "../hooks/useConversations";
import { usePeerAvatar, usePeerName } from "../store/identity";
import type { ActiveTab } from "../store/xmtp";
import { useXmtpStore } from "../store/xmtp";

interface MessagePreviewCardControllerProps {
  convo: ConversationSummary;
  tab: ActiveTab;
}

export const MessagePreviewCardController = ({
  convo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tab,
}: MessagePreviewCardControllerProps) => {
  const { t } = useTranslation();
  const { conversation, lastMessage, peerAddress } = convo;

  // XMTP State
  const recipientAddress = useXmtpStore((s) => s.recipientAddress);
  const activeTab = useXmtpStore((s) => s.activeTab);
  const conversationId = useXmtpStore((state) => state.conversationId);

  const setRecipientInput = useXmtpStore((s) => s.setRecipientInput);
  const setRecipientAddress = useXmtpStore((s) => s.setRecipientAddress);
  const setRecipientName = useXmtpStore((s) => s.setRecipientName);
  const setRecipientAvatar = useXmtpStore((s) => s.setRecipientAvatar);
  const setRecipientState = useXmtpStore((s) => s.setRecipientState);
  const setRecipientOnNetwork = useXmtpStore((s) => s.setRecipientOnNetwork);
  const setConversationId = useXmtpStore((s) => s.setConversationId);
  const setActiveMessage = useXmtpStore((s) => s.setActiveMessage);
  const setActiveTab = useXmtpStore((s) => s.setActiveTab);

  const peerName = usePeerName(peerAddress);
  const peerAvatar = usePeerAvatar(peerAddress);

  const isSelected = conversationId === convo.id;

  const onConvoClick = useCallback(() => {
    if (peerAddress && recipientAddress !== peerAddress) {
      setRecipientAvatar(peerAvatar);
      setRecipientName(peerName);
      setRecipientAddress(peerAddress as ETHAddress);
      setRecipientOnNetwork(true);
      setRecipientState("valid");
      setRecipientInput(peerAddress);
    }
    if (conversationId !== convo.id) {
      setConversationId(convo.id);
      setActiveMessage();
    }
  }, [
    convo.id,
    conversationId,
    peerAddress,
    peerAvatar,
    peerName,
    recipientAddress,
    setActiveMessage,
    setConversationId,
    setRecipientAddress,
    setRecipientAvatar,
    setRecipientInput,
    setRecipientName,
    setRecipientOnNetwork,
    setRecipientState,
  ]);

  const messagePreview = useMemo(() => {
    if (!lastMessage) {
      return t("messages.no_preview");
    }

    // screen effects play over the conversation; they are not previewable
    if (
      contentTypesAreEqual(lastMessage.contentType, ContentTypeScreenEffect)
    ) {
      return undefined;
    }

    if (isText(lastMessage)) {
      return lastMessage.content;
    }

    // A reply previews as whatever it is replying with. The type guard narrows
    // to an intersection the compiler will not read `content` off directly, so
    // the reply shape is named explicitly.
    if (isReply(lastMessage)) {
      const replied = (lastMessage.content as EnrichedReply | undefined)
        ?.content;
      return typeof replied === "string"
        ? replied
        : t("messages.attachment") ?? "Attachment";
    }

    if (isAttachment(lastMessage) || isRemoteAttachment(lastMessage)) {
      const attachment = lastMessage.content as
        | { filename?: string }
        | undefined;
      return attachment?.filename ?? t("messages.attachment");
    }

    return lastMessage.fallback ?? t("messages.no_preview");
  }, [lastMessage, t]);

  const allow = useCallback(async () => {
    await conversation.updateConsentState(ConsentState.Allowed);
  }, [conversation]);

  return (
    <MessagePreviewCard
      isSelected={isSelected}
      key={lastMessage?.id}
      text={messagePreview}
      datetime={convo.lastActivity}
      displayAddress={peerName ?? shortAddress(peerAddress ?? "")}
      onClick={onConvoClick}
      avatarUrl={peerAvatar || ""}
      address={peerAddress ?? ""}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      allow={allow}
    />
  );
};
