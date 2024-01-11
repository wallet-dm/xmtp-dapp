import { useEffect, useMemo, useState } from "react";
import { useDb, useConsent } from "@xmtp/react-sdk";
import { useXmtpStore } from "../store/xmtp";
import useListConversations from "../hooks/useListConversations";
import { ConversationList } from "../component-library/components/ConversationList/ConversationList";
import { MessagePreviewCardController } from "./MessagePreviewCardController";
import useStreamAllMessages from "../hooks/useStreamAllMessages";
import { updateConversationIdentities } from "../helpers/conversation";

type ConversationListControllerProps = {
  setStartedFirstMessage: (startedFirstMessage: boolean) => void;
};

export const ConversationListController = ({
  setStartedFirstMessage,
}: ConversationListControllerProps) => {
  const { isLoaded, isLoading, conversations } = useListConversations();
  const { db } = useDb();
  const { consentState, loadConsentList } = useConsent();
  const [consentStateLoaded, setConsentStateLoaded] = useState<boolean>(false);
  useStreamAllMessages();
  const recipientInput = useXmtpStore((s) => s.recipientInput);
  const consentFilter = useXmtpStore((s) => s.consentFilter);

  // when the conversations are loaded, update their identities
  useEffect(() => {
    const runUpdate = async () => {
      if (isLoaded) {
        await updateConversationIdentities(conversations, db);
      }
    };
    void runUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  useEffect(() => {
    const loadConsent = async () => {
      if (conversations.length && !consentStateLoaded) {
        await loadConsentList();
        setConsentStateLoaded(true);
      }
    };
    void loadConsent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const convos = conversations
      .filter(
        (conversation) =>
          consentState(conversation.peerAddress) === consentFilter,
      )
      .map((conversation) => (
        <MessagePreviewCardController
          key={conversation.topic}
          convo={conversation}
        />
      ));

    return convos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, consentFilter]);

  return (
    <ConversationList
      hasRecipientEnteredValue={!!recipientInput}
      setStartedFirstMessage={() => setStartedFirstMessage(true)}
      isLoading={isLoading}
      messages={!isLoading ? filteredConversations : []}
      consentFilter={consentFilter}
    />
  );
};
