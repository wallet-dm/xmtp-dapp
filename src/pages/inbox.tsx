import type React from "react";
import { useEffect, useState } from "react";
import { useDisconnect, useWalletClient } from "wagmi";
import type { Attachment } from "@xmtp/browser-sdk";
import { useNavigate } from "react-router-dom";
import { XIcon } from "@heroicons/react/outline";
import { useXmtpStore } from "../store/xmtp";
import { TAILWIND_MD_BREAKPOINT } from "../helpers";
import { FullConversationController } from "../controllers/FullConversationController";
import { AddressInputController } from "../controllers/AddressInputController";
import { HeaderDropdownController } from "../controllers/HeaderDropdownController";
import { MessageInputController } from "../controllers/MessageInputController";
import { SideNavController } from "../controllers/SideNavController";
import { LearnMore } from "../component-library/components/LearnMore/LearnMore";
import useWindowSize from "../hooks/useWindowSize";
import { ConversationListController } from "../controllers/ConversationListController";
import { useAttachmentChange } from "../hooks/useAttachmentChange";
import useSelectedConversation from "../hooks/useSelectedConversation";
import { ReplyThread } from "../component-library/components/ReplyThread/ReplyThread";
import useXmtpClient from "../hooks/useXmtpClient";

const Inbox: React.FC<{ children?: React.ReactNode }> = () => {
  const navigate = useNavigate();
  const resetXmtpState = useXmtpStore((state) => state.resetXmtpState);
  const activeMessage = useXmtpStore((state) => state.activeMessage);
  const conversationId = useXmtpStore((state) => state.conversationId);

  const { client, disconnect } = useXmtpClient();
  const [isDragActive, setIsDragActive] = useState(false);
  const selectedConversation = useSelectedConversation();
  const { data: walletClient } = useWalletClient();
  // Conversations are listed and streamed by ConversationListController; the
  // inbox only needs to know whether any exist, so it reads the store rather
  // than mounting a second copy of that hook.
  const hasConversations = useXmtpStore((state) => state.hasConversations);

  useEffect(() => {
    if (!client) {
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const activeTab = useXmtpStore((s) => s.activeTab);
  const recipientAddress = useXmtpStore((s) => s.recipientAddress);
  const setActiveMessage = useXmtpStore((s) => s.setActiveMessage);

  const size = useWindowSize();

  const loadingConversations = useXmtpStore(
    (state) => state.loadingConversations,
  );
  const startedFirstMessage = useXmtpStore(
    (state) => state.startedFirstMessage,
  );
  const setStartedFirstMessage = useXmtpStore(
    (state) => state.setStartedFirstMessage,
  );

  const { disconnect: disconnectWagmi, reset: resetWagmi } = useDisconnect();

  const [attachmentPreview, setAttachmentPreview]: [
    string | undefined,
    (url: string | undefined) => void,
  ] = useState();

  const [attachment, setAttachment]: [
    Attachment | undefined,
    (attachment: Attachment | undefined) => void,
  ] = useState();

  const { onAttachmentChange } = useAttachmentChange({
    setAttachment,
    setAttachmentPreview,
    setIsDragActive,
  });

  // if the wallet address changes, disconnect the XMTP client
  useEffect(() => {
    const checkSigners = () => {
      const address1 = walletClient?.account.address;
      const address2 = client?.accountIdentifier?.identifier;
      // addresses must be defined before comparing
      if (address1 && address2 && address1.toLowerCase() !== address2) {
        resetXmtpState();
        // Each inbox gets its own database (xmtp-<env>-<inboxId>.db3), so
        // switching wallets needs no wipe — and wiping would cost the previous
        // wallet its installation and history.
        void disconnect();
        disconnectWagmi();
        resetWagmi();
      }
    };
    void checkSigners();
  }, [
    disconnect,
    resetXmtpState,
    walletClient,
    client,
    resetWagmi,
    disconnectWagmi,
  ]);

  if (!client) {
    return <div />;
  }

  const visible =
    size[0] > TAILWIND_MD_BREAKPOINT ||
    (!recipientAddress && !startedFirstMessage);

  // TODO: re-enable alongside the attachment pickers in MessageInput once the
  // remote-attachment send path works on browser-sdk. Dropping a file is the
  // other way into that path, so it is disabled here too rather than accepting
  // a file and failing silently.
  const ATTACHMENT_DROP_ENABLED = false;

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  return (
    // Controller for drag-and-drop area
    <div
      className={isDragActive ? "bg-slate-100" : "bg-white"}
      onDragOver={ATTACHMENT_DROP_ENABLED ? handleDrag : undefined}
      onDragEnter={ATTACHMENT_DROP_ENABLED ? handleDrag : undefined}
      onDragLeave={ATTACHMENT_DROP_ENABLED ? handleDrag : undefined}
      onDrop={ATTACHMENT_DROP_ENABLED ? onAttachmentChange : undefined}>
      <div className="w-full md:h-full overflow-auto flex flex-col md:flex-row">
        <div className="flex">
          <div style={visible ? { display: "flex" } : { display: "none" }}>
            <SideNavController />
          </div>
          <div
            className="flex flex-col w-full h-dvh overflow-y-auto md:w-[350px]"
            style={visible ? { display: "flex" } : { display: "none" }}>
            <HeaderDropdownController />
            <ConversationListController
              setStartedFirstMessage={setStartedFirstMessage}
            />
          </div>
        </div>
        {size[0] > TAILWIND_MD_BREAKPOINT ||
        recipientAddress ||
        startedFirstMessage ? (
          <div className="flex w-full flex-col h-dvh overflow-hidden">
            {!hasConversations &&
            !loadingConversations &&
            !startedFirstMessage ? (
              <LearnMore
                version="replace"
                setStartedFirstMessage={() => setStartedFirstMessage(true)}
              />
            ) : (
              // Full container including replies
              <div className="flex h-dvh">
                <div className="h-full w-full flex flex-col justify-between">
                  {activeMessage && selectedConversation ? (
                    <div className="h-full overflow-auto">
                      <div className="flex justify-end p-4">
                        <XIcon
                          data-testid="replies-close-icon"
                          width={24}
                          onClick={() => setActiveMessage()}
                        />
                      </div>
                      <ReplyThread conversation={selectedConversation} />
                    </div>
                  ) : (
                    <>
                      {!conversationId && activeTab === "messages" && (
                        <div className="flex">
                          <AddressInputController />
                        </div>
                      )}
                      <div
                        className="h-full overflow-auto flex flex-col"
                        onFocus={() => {
                          setActiveMessage();
                        }}>
                        {selectedConversation && (
                          <FullConversationController
                            conversation={selectedConversation}
                          />
                        )}
                      </div>
                    </>
                  )}

                  {/* Drag event handling needing for content attachments */}
                  {activeTab === "messages" ? (
                    <MessageInputController
                      attachment={attachment}
                      setAttachment={setAttachment}
                      attachmentPreview={attachmentPreview}
                      setAttachmentPreview={setAttachmentPreview}
                      setIsDragActive={setIsDragActive}
                    />
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Inbox;
