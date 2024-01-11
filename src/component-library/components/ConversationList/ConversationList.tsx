import type { ConsentState } from "@xmtp/react-sdk";
import type React from "react";
import { Virtuoso } from "react-virtuoso";
import { EmptyBlocked } from "../EmptyBlocked/EmptyBlocked";
import { EmptyMessage } from "../EmptyMessage/EmptyMessage";
import { EmptyRequest } from "../EmptyRequest/EmptyRequest";
import { MessagePreviewCard } from "../MessagePreviewCard/MessagePreviewCard";

interface ConversationListProps {
  /**
   * What conversations should we render?
   */
  messages?: Array<React.ReactNode>;
  /**
   * Are we waiting on anything loading?
   */
  isLoading?: boolean;
  /**
   * What function do we run to start the first message?
   */
  setStartedFirstMessage?: () => void;
  /**
   * Has a value been entered for the recipient?
   */
  hasRecipientEnteredValue?: boolean;
  /**
   * Active consentFilter
   */
  consentFilter: ConsentState;
}

export const ConversationList = ({
  messages = [],
  isLoading,
  setStartedFirstMessage,
  hasRecipientEnteredValue,
  consentFilter,
}: ConversationListProps) =>
  !messages?.length && isLoading ? (
    <div className="w-full overflow-hidden h-full flex flex-col justify-start sm:w-full bg-gray-100">
      {Array.from({ length: 12 }).map((_, idx) => (
        <MessagePreviewCard key={idx} isLoading />
      ))}
    </div>
  ) : !messages.length &&
    !isLoading &&
    !hasRecipientEnteredValue &&
    consentFilter === "allowed" ? (
    <div className="w-full overflow-hidden sm:w-full sm:p-4 md:p-8 border border-gray-100 h-full">
      <EmptyMessage setStartedFirstMessage={setStartedFirstMessage} />
    </div>
  ) : !messages.length && !isLoading && consentFilter === "denied" ? (
    <EmptyBlocked />
  ) : !messages.length && !isLoading && consentFilter === "unknown" ? (
    <EmptyRequest />
  ) : (
    <Virtuoso
      className="sm:w-full flex flex-col h-full bg-gray-100 border-x"
      data-testid="conversations-list-panel"
      data={messages}
      itemContent={(index, message) => message}
    />
  );
