import { useCallback } from "react";
import type { AppDm } from "../contexts/XmtpContext";
import { resolveInboxId } from "../helpers/inboxIdentity";
import { useXmtpStore } from "../store/xmtp";
import useXmtpClient from "./useXmtpClient";

/**
 * Finds or creates the DM with a peer address.
 *
 * V3 addresses conversations by inbox id, so the address is resolved first.
 * An existing DM is reused rather than creating a duplicate — `createDm` would
 * otherwise add a second conversation with the same peer.
 */
const useStartConversation = () => {
  const { client } = useXmtpClient();
  const refreshConversations = useXmtpStore((s) => s.refreshConversations);

  const startConversation = useCallback(
    async (peerAddress: string): Promise<AppDm | undefined> => {
      if (!client) {
        return undefined;
      }

      const inboxId = await resolveInboxId(client, peerAddress);
      // no inbox means the address has never joined the network
      if (!inboxId) {
        return undefined;
      }

      const existing = await client.conversations.getDmByInboxId(inboxId);
      if (existing) {
        // A DM created before an installation was revoked still lists that
        // installation locally, and sending into it fails verification. Syncing
        // pulls the commits that remove it.
        await existing.sync();
        return existing as AppDm;
      }

      const created = await client.conversations.createDm(inboxId);
      // the stream does not replay conversations created by this client, so
      // the list has to be told explicitly or a new DM stays invisible
      refreshConversations();
      return created;
    },
    [client, refreshConversations],
  );

  return { startConversation };
};

export default useStartConversation;
