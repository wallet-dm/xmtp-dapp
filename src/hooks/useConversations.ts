import { ConsentState } from "@xmtp/browser-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppDm, AppMessage, AppXmtpClient } from "../contexts/XmtpContext";
import type { ETHAddress } from "../helpers";
import { resolveAddressesForInboxIds } from "../helpers/inboxIdentity";
import { resolvePeerIdentities } from "../helpers/peerIdentity";
import type { ActiveTab } from "../store/xmtp";
import { useXmtpStore } from "../store/xmtp";
import useXmtpClient from "./useXmtpClient";

export type { AppDm, AppMessage };

/** What a conversation row needs, with the async lookups already resolved. */
export type ConversationSummary = {
  id: string;
  conversation: AppDm;
  peerInboxId: string;
  peerAddress: ETHAddress | null;
  lastMessage?: AppMessage;
  lastActivity: Date;
};

/**
 * The three inbox tabs map onto V3 consent states, which replaces react-sdk's
 * per-address allow/deny checks with a single filtered query against the local
 * database.
 */
const consentStatesForTab = (tab: ActiveTab): ConsentState[] => {
  switch (tab) {
    case "blocked":
      return [ConsentState.Denied];
    case "requests":
      return [ConsentState.Unknown];
    default:
      return [ConsentState.Allowed];
  }
};

const summarize = async (
  client: AppXmtpClient,
  dms: AppDm[],
): Promise<ConversationSummary[]> => {
  const withPeers = await Promise.all(
    dms.map(async (conversation) => ({
      conversation,
      peerInboxId: await conversation.peerInboxId(),
      lastMessage: await conversation.lastMessage(),
    })),
  );

  // one batched lookup for every peer, rather than a request per row
  const addresses = await resolveAddressesForInboxIds(
    client,
    withPeers.map(({ peerInboxId }) => peerInboxId),
  );

  const summaries = withPeers.map(
    ({ conversation, peerInboxId, lastMessage }) => ({
      id: conversation.id,
      conversation,
      peerInboxId,
      peerAddress: addresses[peerInboxId] ?? null,
      lastMessage,
      lastActivity:
        lastMessage?.sentAt ?? conversation.createdAt ?? new Date(0),
    }),
  );

  // newest first, matching how the list read before the migration
  summaries.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  return summaries;
};

/**
 * Lists the DMs for the active tab and keeps them current.
 *
 * Nothing syncs on its own in browser-sdk, so this owns the initial sync, the
 * consent-filtered query, and the conversation stream that adds new arrivals.
 */
const useConversations = () => {
  const { client, status } = useXmtpClient();
  const activeTab = useXmtpStore((s) => s.activeTab);
  const setLoadingConversations = useXmtpStore(
    (s) => s.setLoadingConversations,
  );
  const setHasConversations = useXmtpStore((s) => s.setHasConversations);
  const conversationsRevision = useXmtpStore((s) => s.conversationsRevision);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ready = status === "ready" && client !== null;

  useEffect(() => {
    if (
      "Notification" in window &&
      window.Notification.permission === "default"
    ) {
      void window.Notification.requestPermission();
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!client) {
      return;
    }
    const dms = await client.conversations.listDms({
      consentStates: consentStatesForTab(activeTab),
    });
    const summaries = await summarize(client, dms);
    setConversations(summaries);
    setHasConversations(summaries.length > 0);

    // fire-and-forget: rows render with truncated addresses and upgrade to
    // names as the lookups land
    void resolvePeerIdentities(
      summaries
        .map(({ peerAddress }) => peerAddress)
        .filter((address): address is ETHAddress => address !== null),
    );
  }, [activeTab, client, setHasConversations]);

  useEffect(() => {
    if (!ready || !client) {
      setConversations([]);
      setIsLoaded(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // the local database starts empty, so pull the network state first
        await client.conversations.syncAll([
          ConsentState.Allowed,
          ConsentState.Unknown,
          ConsentState.Denied,
        ]);
        if (cancelled) {
          return;
        }
        await refresh();
        if (!cancelled) {
          setIsLoaded(true);
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
    // conversationsRevision covers conversations this client creates itself,
    // which never come back through the stream
  }, [client, ready, refresh, conversationsRevision]);

  // Held in a ref so the stream is opened once per client rather than being
  // torn down and reopened every time the active tab changes.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!ready || !client) {
      return undefined;
    }

    let cancelled = false;
    let stream: Awaited<ReturnType<typeof client.conversations.stream>> | null =
      null;

    const open = async () => {
      const opened = await client.conversations.stream({
        // we already synced when loading, so skip the stream's own sync
        disableSync: true,
        onValue: () => {
          void refreshRef.current();
        },
        onError: (streamError) => setError(streamError),
      });
      // the client changed while the stream was opening; it would otherwise
      // stay subscribed with no way to reach it
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
  }, [client, ready]);

  useEffect(() => {
    setLoadingConversations(isLoading);
  }, [isLoading, setLoadingConversations]);

  return { conversations, error, isLoaded, isLoading, refresh };
};

export default useConversations;
