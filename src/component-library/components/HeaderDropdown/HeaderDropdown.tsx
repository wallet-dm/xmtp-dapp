import { PlusIcon } from "@heroicons/react/solid";
import { useTranslation } from "react-i18next";
import { classNames } from "../../../helpers";
import { ActiveTab, useXmtpStore } from "../../../store/xmtp";
import { IconButton } from "../IconButton/IconButton";

// To-do: rename this throughout the app, as this is no longer a dropdown
interface HeaderDropdownProps {
  /**
   * On new message button click?
   */
  onClick?: () => void;
  /**
   * What is the recipient input?
   */
  recipientInput: string;
  /**
   * Boolean to determine if screen width is mobile size
   */
  isMobileView?: boolean;
}

const consentStateLabels = {
  allowed: "messages.filter_allowed",
  denied: "messages.filter_blocked",
  unknown: "messages.filter_requests",
};

export const HeaderDropdown = ({
  onClick,
  recipientInput,
  isMobileView,
}: HeaderDropdownProps) => {
  const { t } = useTranslation();

  const activeTab = useXmtpStore((s) => s.activeTab);
  const setActiveTab = useXmtpStore((s) => s.setActiveTab);
  const resetRecipient = useXmtpStore((s) => s.resetRecipient);
  const setConversationTopic = useXmtpStore((s) => s.setConversationTopic);

  const tabs = [
    { name: "messages", testId: "messages-button" },
    { name: "requests", testId: "requests-button" },
    { name: "blocked", testId: "blocked-button" },
  ];

  return (
    <div
      data-modal-target="headerModalId"
      data-testid="conversation-list-header"
      className="border-l border-r border-b border-gray-200 bg-gray-100 h-16 p-4 pt-5">
      <div className="flex justify-between items-center">
        {tabs.map(({ name, testId }) => (
          <button
            key={name}
            data-testid={testId}
            type="button"
            className={classNames(
              "text-lg mr-2 cursor-pointer",
              activeTab === name ? "font-bold" : "",
            )}
            onClick={() => {
              setActiveTab(name as ActiveTab);
              resetRecipient();
              setConversationTopic();
            }}>
            {t(`consent.${name}`)}
          </button>
        ))}
        {(recipientInput || isMobileView) && (
          <IconButton
            onClick={() => onClick?.()}
            label={<PlusIcon color="white" width="20" />}
            testId="new-message-icon-cta"
            srText={t("aria_labels.start_new_message") || ""}
          />
        )}
      </div>
    </div>
  );
};
