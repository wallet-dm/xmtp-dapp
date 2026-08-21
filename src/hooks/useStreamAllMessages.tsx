import { ConsentState, isText } from "@xmtp/browser-sdk";
import { useEffect, useRef } from "react";
import { shortAddress, truncate } from "../helpers";
import { resolveAddressesForInboxIds } from "../helpers/inboxIdentity";
import { getPeerName } from "../store/identity";
import type { AppMessage } from "../contexts/XmtpContext";
import useXmtpClient from "./useXmtpClient";

/**
 * Raises a browser notification for inbound messages while the tab is hidden.
 *
 * Denied senders are filtered out at the stream rather than after the fact, so
 * a blocked peer cannot raise a notification.
 */
const useStreamAllMessages = () => {
  const { client, status } = useXmtpClient();
  const latestMsgId = useRef<string>();

  useEffect(() => {
    if (status !== "ready" || !client) {
      return undefined;
    }

    let cancelled = false;
    let stream: Awaited<
      ReturnType<typeof client.conversations.streamAllMessages>
    > | null = null;

    const notify = async (message: AppMessage) => {
      if (
        latestMsgId.current === message.id ||
        !("Notification" in window) ||
        window.Notification.permission !== "granted" ||
        message.senderInboxId === client.inboxId ||
        !document.hidden
      ) {
        return;
      }
      latestMsgId.current = message.id;

      const addresses = await resolveAddressesForInboxIds(client, [
        message.senderInboxId,
      ]);
      const address = addresses[message.senderInboxId];
      const sender =
        getPeerName(address) ?? shortAddress(address ?? message.senderInboxId);

      // only text previews well in a notification body
      const body = isText(message) ? truncate(message.content ?? "", 75) : "";

      // eslint-disable-next-line no-new
      new window.Notification("XMTP", { body: `${sender}\n${body}` });
    };

    const open = async () => {
      const opened = await client.conversations.streamAllMessages({
        consentStates: [ConsentState.Allowed, ConsentState.Unknown],
        onValue: (message) => {
          void notify(message);
        },
      });
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
  }, [client, status]);
};

export default useStreamAllMessages;
