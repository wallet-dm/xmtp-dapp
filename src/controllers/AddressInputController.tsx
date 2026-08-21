import { useEffect, useState } from "react";
import { AddressInput } from "../component-library/components/AddressInput/AddressInput";
import { getRecipientInputSubtext, shortAddress } from "../helpers";
import { useAddressInput } from "../hooks/useAddressInput";
import useConsent from "../hooks/useConsent";
import useWindowSize from "../hooks/useWindowSize";
import useXmtpClient from "../hooks/useXmtpClient";
import { resolveInboxId } from "../helpers/inboxIdentity";
import type { AppDm } from "../contexts/XmtpContext";
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
  const activeTab = useXmtpStore((s) => s.activeTab);
  const setActiveTab = useXmtpStore((s) => s.setActiveTab);

  const { client } = useXmtpClient();
  const { deny, allow } = useConsent();
  // held so the block/unblock button can act on the peer's inbox as well as
  // the conversation
  const [selected, setSelected] = useState<{
    conversation?: AppDm;
    peerInboxId?: string;
  }>({});

  // manage address input state
  useAddressInput();

  const size = useWindowSize();

  useEffect(() => {
    let cancelled = false;

    const selectConversation = async () => {
      if (!recipientAddress || !recipientOnNetwork || !client) {
        setSelected({});
        return;
      }

      const peerInboxId = await resolveInboxId(client, recipientAddress);
      if (cancelled || !peerInboxId) {
        return;
      }

      // Look up the existing DM without creating one — typing an address
      // should not put a conversation on the network.
      const existing = (await client.conversations.getDmByInboxId(
        peerInboxId,
      )) as AppDm | undefined;
      if (cancelled) {
        return;
      }

      setSelected({ conversation: existing, peerInboxId });

      if (existing && conversationId !== existing.id) {
        setConversationId(existing.id);
      }
    };

    void selectConversation();

    return () => {
      cancelled = true;
    };
  }, [
    client,
    conversationId,
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
          void deny(selected);
          setActiveTab("blocked");
        } else if (activeTab === "blocked") {
          void allow(selected);
          setActiveTab("messages");
        }
      }}
      activeTab={activeTab}
    />
  );
};
