import { useMemo } from "react";
import { ConversationList } from "../component-library/components/ConversationList/ConversationList";
import useConversations from "../hooks/useConversations";
import useStreamAllMessages from "../hooks/useStreamAllMessages";
import { useXmtpStore } from "../store/xmtp";
import { MessagePreviewCardController } from "./MessagePreviewCardController";

type ConversationListControllerProps = {
  setStartedFirstMessage: (startedFirstMessage: boolean) => void;
};

export const ConversationListController = ({
  setStartedFirstMessage,
}: ConversationListControllerProps) => {
  // Tab filtering is a consent-filtered query against the local database now,
  // which replaces the per-conversation allow/deny checks this component used
  // to run on every render.
  const { conversations, isLoading } = useConversations();

  useStreamAllMessages();
  const recipientInput = useXmtpStore((s) => s.recipientInput);
  const activeTab = useXmtpStore((s) => s.activeTab);

  const messagesToPass = useMemo(
    () =>
      conversations.map((summary) => (
        <MessagePreviewCardController
          key={summary.id}
          convo={summary}
          tab={activeTab}
        />
      )),
    [conversations, activeTab],
  );

  return (
    <ConversationList
      hasRecipientEnteredValue={!!recipientInput}
      setStartedFirstMessage={() => setStartedFirstMessage(true)}
      isLoading={isLoading}
      messages={messagesToPass}
      activeTab={activeTab}
    />
  );
};
