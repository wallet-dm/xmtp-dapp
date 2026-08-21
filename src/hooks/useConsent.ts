import { ConsentEntityType, ConsentState } from "@xmtp/browser-sdk";
import type { Consent } from "@xmtp/browser-sdk";
import { useCallback } from "react";
import type { AppDm } from "../contexts/XmtpContext";
import { useXmtpStore } from "../store/xmtp";
import useXmtpClient from "./useXmtpClient";

export type ConsentTarget = {
  conversation?: AppDm;
  peerInboxId?: string;
};

/**
 * Allow or block a peer.
 *
 * V3 records consent against two kinds of entity, and the app writes both.
 * The conversation record is what the inbox tabs filter on; the inbox record
 * is what stops a blocked peer from reaching the user again through a new
 * conversation. Writing only the first would make "block" mean "block until
 * they start a new DM".
 */
const useConsent = () => {
  const { client } = useXmtpClient();
  const changedConsentCount = useXmtpStore((s) => s.changedConsentCount);
  const setChangedConsentCount = useXmtpStore((s) => s.setChangedConsentCount);

  const setConsent = useCallback(
    async (
      { conversation, peerInboxId }: ConsentTarget,
      state: ConsentState,
    ) => {
      if (!client) {
        return;
      }

      const records: Consent[] = [];
      if (conversation) {
        records.push({
          entityType: ConsentEntityType.GroupId,
          entity: conversation.id,
          state,
        });
      }
      if (peerInboxId) {
        records.push({
          entityType: ConsentEntityType.InboxId,
          entity: peerInboxId,
          state,
        });
      }
      if (records.length === 0) {
        return;
      }

      await client.preferences.setConsentStates(records);
      // nudges the conversation list to re-query
      setChangedConsentCount(changedConsentCount + 1);
    },
    [changedConsentCount, client, setChangedConsentCount],
  );

  const allow = useCallback(
    (target: ConsentTarget) => setConsent(target, ConsentState.Allowed),
    [setConsent],
  );

  const deny = useCallback(
    (target: ConsentTarget) => setConsent(target, ConsentState.Denied),
    [setConsent],
  );

  return { allow, deny };
};

export default useConsent;
