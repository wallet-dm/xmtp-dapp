import { useConversation } from "@xmtp/react-sdk";
import type { CachedConversationWithId } from "@xmtp/react-sdk";
import { useEffect, useState } from "react";
import { useXmtpStore } from "../store/xmtp";

const useSelectedConversation = () => {
  const [selectedConversation, setSelectedConversation] = useState<
    CachedConversationWithId | undefined
  >();
  const { getCachedByTopic } = useConversation();
  const conversationId = useXmtpStore((state) => state.conversationId);

  useEffect(() => {
    const getSelectedConversation = async () => {
      if (conversationId) {
        const conversation = await getCachedByTopic(conversationId);
        setSelectedConversation(conversation);
      } else {
        setSelectedConversation(undefined);
      }
    };
    void getSelectedConversation();
  }, [conversationId, getCachedByTopic]);

  return selectedConversation;
};

export default useSelectedConversation;
