import { useEffect, useState } from "react";
import type { AppDm } from "./useConversations";
import { useXmtpStore } from "../store/xmtp";
import useXmtpClient from "./useXmtpClient";

/**
 * Resolves the selected conversation id from the store into a live
 * conversation. Reads the local database, so it does not hit the network.
 */
const useSelectedConversation = () => {
  const { client } = useXmtpClient();
  const [selectedConversation, setSelectedConversation] = useState<
    AppDm | undefined
  >();
  const conversationId = useXmtpStore((state) => state.conversationId);

  useEffect(() => {
    if (!client || !conversationId) {
      setSelectedConversation(undefined);
      return undefined;
    }

    let cancelled = false;

    const getSelectedConversation = async () => {
      const conversation =
        await client.conversations.getConversationById(conversationId);
      if (!cancelled) {
        // groups are out of scope for this app; only DMs are selectable
        setSelectedConversation(conversation as AppDm | undefined);
      }
    };

    void getSelectedConversation();

    return () => {
      cancelled = true;
    };
  }, [client, conversationId]);

  return selectedConversation;
};

export default useSelectedConversation;
