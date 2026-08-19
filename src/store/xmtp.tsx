import type { Client, DecodedMessage } from "@xmtp/browser-sdk";
import { create } from "zustand";
import type { ETHAddress } from "../helpers";

export type RecipientState = "invalid" | "loading" | "error" | "valid";

export type ActiveTab = "messages" | "requests" | "blocked";

export type RecipientAddress = ETHAddress | null;

interface XmtpState {
  client?: Client;
  setClient: (client?: Client) => void;
  loadingConversations: boolean;
  setLoadingConversations: (loadingConversations: boolean) => void;
  clientName: string | null;
  setClientName: (name: string | null) => void;
  clientAvatar: string | null;
  setClientAvatar: (avatar: string | null) => void;
  recipientInput: string;
  setRecipientInput: (input: string) => void;
  recipientAddress: RecipientAddress;
  setRecipientAddress: (address: RecipientAddress) => void;
  recipientInboxId: string | null;
  setRecipientInboxId: (inboxId: string | null) => void;
  recipientName: string | null;
  setRecipientName: (address: string | null) => void;
  recipientAvatar: string | null;
  setRecipientAvatar: (avatar: string | null) => void;
  recipientState: RecipientState;
  setRecipientState: (state: RecipientState) => void;
  recipientOnNetwork: boolean;
  setRecipientOnNetwork: (onNetwork: boolean) => void;
  conversationId?: string;
  setConversationId: (conversationId?: string) => void;
  resetXmtpState: () => void;
  resetRecipient: () => void;
  startedFirstMessage: boolean;
  setStartedFirstMessage: (startedFirstMessage: boolean) => void;
  attachmentError: string;
  setAttachmentError: (attachmentError: string) => void;
  activeMessage?: DecodedMessage;
  setActiveMessage: (message?: DecodedMessage) => void;
  activeTab: ActiveTab;
  setActiveTab: (activeTab: ActiveTab) => void;
  changedConsentCount: number;
  setChangedConsentCount: (changedConsentCount: number) => void;
}

export const useXmtpStore = create<XmtpState>((set) => ({
  client: undefined,
  setClient: (client) => set(() => ({ client })),
  loadingConversations: true,
  setLoadingConversations: (loadingConversations: boolean) =>
    set(() => ({ loadingConversations })),
  clientName: null,
  setClientName: (name) => set(() => ({ clientName: name })),
  clientAvatar: null,
  setClientAvatar: (avatar) => set(() => ({ clientAvatar: avatar })),
  recipientInput: "",
  setRecipientInput: (input) => set(() => ({ recipientInput: input })),
  recipientAddress: null,
  setRecipientAddress: (address) => set(() => ({ recipientAddress: address })),
  recipientInboxId: null,
  setRecipientInboxId: (inboxId) => set(() => ({ recipientInboxId: inboxId })),
  recipientName: null,
  setRecipientName: (name) => set(() => ({ recipientName: name })),
  recipientAvatar: null,
  setRecipientAvatar: (avatar) => set(() => ({ recipientAvatar: avatar })),
  recipientState: "invalid",
  setRecipientState: (state) => set(() => ({ recipientState: state })),
  recipientOnNetwork: false,
  setRecipientOnNetwork: (onNetwork) =>
    set(() => ({ recipientOnNetwork: onNetwork })),
  conversationId: "",
  setConversationId: (conversationId) => set(() => ({ conversationId })),
  resetXmtpState: () =>
    set(() => ({
      client: undefined,
      recipientInput: "",
      recipientAddress: null,
      recipientInboxId: null,
      recipientName: null,
      recipientAvatar: null,
      recipientState: "invalid",
      conversationId: undefined,
      startedFirstMessage: false,
    })),
  resetRecipient: () =>
    set(() => ({
      recipientInput: "",
      recipientAddress: null,
      recipientInboxId: null,
      recipientName: null,
      recipientAvatar: null,
      recipientState: "invalid",
    })),
  startedFirstMessage: false,
  setStartedFirstMessage: (startedFirstMessage) =>
    set(() => ({ startedFirstMessage })),
  attachmentError: "",
  setAttachmentError: (attachmentError) => set(() => ({ attachmentError })),
  activeMessage: undefined,
  setActiveMessage: (activeMessage) => set(() => ({ activeMessage })),
  activeTab: "messages",
  setActiveTab: (activeTab) => set(() => ({ activeTab })),
  changedConsentCount: 0,
  setChangedConsentCount: (changedConsentCount) =>
    set(() => ({ changedConsentCount })),
}));
