import { SortDirection } from "@xmtp/browser-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppDm, AppMessage } from "./useConversations";

/**
 * Loads a conversation's messages and keeps them current.
 *
 * react-sdk backed this with a Dexie live query; browser-sdk has no reactive
 * layer, so the list is loaded once and then merged with the conversation
 * stream. Merging is keyed on message id because a message this client sent
 * arrives back through the stream and would otherwise appear twice.
 */
const useConversationMessages = (conversation?: AppDm) => {
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upsert = useCallback((incoming: AppMessage[]) => {
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));
      incoming.forEach((message) => byId.set(message.id, message));
      return [...byId.values()].sort(
        (a, b) => a.sentAt.getTime() - b.sentAt.getTime(),
      );
    });
  }, []);

  const conversationId = conversation?.id;

  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      // start from empty so the previous conversation's messages never flash
      setMessages([]);
      try {
        await conversation.sync();
        if (cancelled) {
          return;
        }
        const loaded = await conversation.messages({
          direction: SortDirection.Ascending,
        });
        if (!cancelled) {
          upsert(loaded);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // conversation objects are recreated on each list refresh, so key the load
    // on the id rather than the instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, upsert]);

  const upsertRef = useRef(upsert);
  useEffect(() => {
    upsertRef.current = upsert;
  }, [upsert]);

  useEffect(() => {
    if (!conversation) {
      return undefined;
    }

    let cancelled = false;
    let stream: Awaited<ReturnType<typeof conversation.stream>> | null = null;

    const open = async () => {
      const opened = await conversation.stream({
        onValue: (message) => upsertRef.current([message]),
        onError: (streamError) => setError(streamError),
      });
      // the conversation changed while the stream was opening
      if (cancelled) {
        void opened.end();
        return;
      }
      stream = opened;
    };

    void open();

    return () => {
      cancelled = true;
      void stream?.end();
      stream = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return { messages, isLoading, error };
};

export default useConversationMessages;
