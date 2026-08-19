import { useConsent, useConversation } from "@xmtp/react-sdk";
import { useEffect } from "react";
import { AddressInput } from "../component-library/components/AddressInput/AddressInput";
import { getRecipientInputSubtext, shortAddress } from "../helpers";
import { useAddressInput } from "../hooks/useAddressInput";
import useWindowSize from "../hooks/useWindowSize";
import { useXmtpStore } from "../store/xmtp";

export const AddressInputController = () => {
  // XMTP State
  const recipientAddress = useXmtpStore((s) => s.recipientAddress);
  const recipientAvatar = useXmtpStore((s) => s.recipientAvatar);
  const recipientState = useXmtpStore((s) => s.recipientState);
  const recipientOnNetwork = useXmtpStore((s) => s.recipientOnNetwork);
  const recipientInput = useXmtpStore((s) => s.recipientInput);
  const recipientName = useXmtpStore((s) => s.recipientName);
  const conversationId = useXmtpStore((s) => s.conversationId);
  const resetRecipient = useXmtpStore((s) => s.resetRecipient);
  const loadingConversations = useXmtpStore((s) => s.loadingConversations);
  const setRecipientInput = useXmtpStore((s) => s.setRecipientInput);
  const setStartedFirstMessage = useXmtpStore((s) => s.setStartedFirstMessage);
  const setConversationId = useXmtpStore((s) => s.setConversationId);
  const changedConsentCount = useXmtpStore((s) => s.changedConsentCount);
  const setChangedConsentCount = useXmtpStore((s) => s.setChangedConsentCount);
  const activeTab = useXmtpStore((s) => s.activeTab);
  const setActiveTab = useXmtpStore((s) => s.setActiveTab);

  const { getCachedByPeerAddress, getCachedByTopic } = useConversation();
  const { deny, allow } = useConsent();

  // manage address input state
  useAddressInput();

  const size = useWindowSize();

  useEffect(() => {
    const selectConversation = async () => {
      // if there's a valid network address, look for an existing conversation
      if (recipientAddress && recipientOnNetwork) {
        let updateSelectedConversation = true;
        // if there's an existing selected conversation, check if it has the
        // same peer address as the recipient
        if (conversationId) {
          const convo = await getCachedByTopic(conversationId);
          // if the peer address is the same, do not attempt to update the
          // select conversation
          if (convo?.peerAddress === recipientAddress) {
            updateSelectedConversation = false;
          }
        }
        // if we're updated the selected conversation, look for a conversation
        // with the recipient's address. if present, select that conversation.
        if (updateSelectedConversation) {
          const existing = await getCachedByPeerAddress(recipientAddress);
          if (existing && conversationId !== existing.topic) {
            setConversationId(existing.topic);
          }
        }
      }
    };
    void selectConversation();
  }, [
    conversationId,
    getCachedByPeerAddress,
    getCachedByTopic,
    recipientAddress,
    recipientOnNetwork,
    setConversationId,
  ]);

  return (
    <AddressInput
      isError={recipientState === "invalid" || recipientState === "error"}
      subtext={
        !loadingConversations
          ? getRecipientInputSubtext(
              recipientInput,
              recipientAddress,
              recipientState,
              recipientOnNetwork,
            )
          : ""
      }
      resolvedAddress={{
        displayAddress:
          recipientName ??
          (size[0] < 700
            ? recipientAddress
              ? shortAddress(recipientAddress)
              : ""
            : recipientAddress ?? ""),
        walletAddress: recipientName
          ? recipientAddress ?? undefined
          : undefined,
      }}
      onChange={setRecipientInput}
      isLoading={recipientState === "loading"}
      value={recipientInput}
      avatarUrlProps={{
        url: recipientAvatar || "",
        isLoading: recipientState === "loading",
        address: recipientAddress ?? undefined,
      }}
      onLeftIconClick={() => {
        resetRecipient();
        setStartedFirstMessage(false);
        setConversationId("");
      }}
      onRightIconClick={() => {
        if (activeTab === "messages") {
          void deny([recipientAddress as string]);
          setActiveTab("blocked");
          setChangedConsentCount(changedConsentCount + 1);
        } else if (activeTab === "blocked") {
          void allow([recipientAddress as string]);
          setActiveTab("messages");
          setChangedConsentCount(changedConsentCount + 1);
        }
      }}
      activeTab={activeTab}
    />
  );
};
