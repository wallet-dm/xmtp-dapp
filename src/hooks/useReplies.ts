import { isReply } from "@xmtp/browser-sdk";
import type { EnrichedReply } from "@xmtp/browser-sdk";
import { useMemo } from "react";
import type { AppMessage } from "./useConversations";

/**
 * Replies to a given message, derived from the loaded message list.
 *
 * `ListMessagesOptions` has no reply-reference filter, so there is no
 * server-side "get replies to X" — the thread is assembled client-side.
 *
 * A consequence worth knowing: a reply to a message outside the loaded window
 * is invisible here, so `message.numReplies` (which the network maintains) can
 * exceed this list. That is a no-op today because whole conversations are
 * loaded, but it becomes visible if paging is ever added.
 */
export const useReplies = (
  messages: AppMessage[],
  parent?: AppMessage,
): AppMessage[] =>
  useMemo(() => {
    if (!parent) {
      return [];
    }
    return messages.filter((message) => {
      if (!isReply(message)) {
        return false;
      }
      const reply = message.content as EnrichedReply | undefined;
      return reply?.referenceId === parent.id;
    });
  }, [messages, parent]);

/**
 * Ids of messages that have at least one reply in the loaded list.
 *
 * Derived rather than read from `message.numReplies`, because that count is
 * captured when a message is fetched and is not updated when a reply arrives
 * later on the stream — a parent already on screen would keep reporting zero.
 * Deriving also guarantees the affordance never promises a thread that cannot
 * be rendered from the messages actually loaded.
 */
export const getRepliedToIds = (messages: AppMessage[]): Set<string> => {
  const ids = new Set<string>();
  messages.forEach((message) => {
    if (!isReply(message)) {
      return;
    }
    const reply = message.content as EnrichedReply | undefined;
    if (reply?.referenceId) {
      ids.add(reply.referenceId);
    }
  });
  return ids;
};

export default useReplies;
