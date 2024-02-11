import { ChevronLeftIcon } from "@heroicons/react/outline";
import { useTranslation } from "react-i18next";
import { TAILWIND_MD_BREAKPOINT, classNames } from "../../../helpers";
import useWindowSize from "../../../hooks/useWindowSize";
import { useXmtpStore, type ActiveTab } from "../../../store/xmtp";
import { Avatar } from "../Avatar/Avatar";

interface AddressInputProps {
  /**
   * What, if any, resolved address is there?
   */
  resolvedAddress?: {
    displayAddress: string;
    walletAddress?: string;
  };
  /**
   * What, if any, subtext is there?
   */
  subtext?: string;
  /**
   * What are the props associated with the avatar?
   */
  avatarUrlProps?: {
    // What is the avatar url?
    url?: string;
    // Is the avatar url loading?
    isLoading?: boolean;
    // What's the address of this wallet?
    address?: string;
  };
  /**
   * What happens on a submit?
   */
  onChange?: (value: string) => void;
  /**
   * Upon submit, has there been an error?
   */
  isError?: boolean;
  /**
   * Upon submit, is something loading?
   */
  isLoading?: boolean;
  /**
   * Input Value
   */
  value?: string;
  /**
   * Is there a left icon click event that needs to be handled?
   */
  onLeftIconClick?: () => void;
  /**
   * Is there a right icon click event that needs to be handled?
   */
  onRightIconClick?: () => void;
  /**
   * Currently Active Tab
   */
  activeTab: ActiveTab;
}

export const AddressInput = ({
  resolvedAddress,
  subtext,
  avatarUrlProps,
  onChange,
  isError,
  value,
  onLeftIconClick,
  onRightIconClick,
  activeTab,
}: AddressInputProps) => {
  const { t } = useTranslation();
  const subtextColor = isError ? "text-red-600" : "text-gray-500";
  const [width] = useWindowSize();
  const isMobileView = width <= TAILWIND_MD_BREAKPOINT;
  const conversationTopic = useXmtpStore((s) => s.conversationTopic);
  return (
    <div
      className={classNames(
        !resolvedAddress?.displayAddress
          ? "bg-indigo-50 border-b border-indigo-500"
          : "border-b border-gray-200",
        "bg-white flex items-center px-2 md:px-4 py-3 border-l-0 z-10 max-md:h-fit md:max-h-sm w-full h-16",
      )}>
      <div className="max-md:w-fit md:hidden flex w-24 p-0 justify-start">
        <ChevronLeftIcon onClick={onLeftIconClick} width={24} />
      </div>
      <form
        className="flex w-full items-center truncate"
        onSubmit={(e) => e.preventDefault()}>
        <div className="mr-2 font-bold text-sm">{t("common.input_label")}:</div>
        {resolvedAddress?.displayAddress && <Avatar {...avatarUrlProps} />}
        <div className="ml-2 md:ml-4 truncate">
          {resolvedAddress?.displayAddress ? (
            <div
              className="font-bold text-md truncate"
              data-testid="recipient-wallet-address">
              {resolvedAddress.displayAddress}
            </div>
          ) : (
            <input
              data-testid="message-to-input"
              tabIndex={0}
              className="bg-transparent text-gray-900 px-0 h-4 m-1 ml-0 font-mono max-md:text-[16px] md:text-sm w-full leading-tight border border-2 border-transparent focus:border-transparent focus:ring-0 cursor-text"
              id="address"
              type="search"
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              onChange={(e) =>
                onChange && onChange((e.target as HTMLInputElement).value)
              }
              value={value}
              aria-label={t("aria_labels.address_input") || ""}
            />
          )}
          <div
            className={classNames(
              "font-mono",
              "text-sm",
              "max-md:text-xs",
              "h-5",
              subtextColor,
              "truncate",
            )}
            data-testid="message-to-subtext">
            {subtext
              ? t(subtext)
              : resolvedAddress?.walletAddress
              ? resolvedAddress?.walletAddress
              : ""}
          </div>
        </div>
      </form>
      {onRightIconClick && activeTab === "messages" && conversationTopic && (
        <button
          type="button"
          className="text-indigo-600 font-bold text-md"
          onClick={onRightIconClick}>
          {t("consent.block")}
        </button>
      )}
      {/* Check for mobile view to avoid having multiple block elements visible on Desktop */}
      {isMobileView && onRightIconClick && activeTab === "blocked" && (
        <button
          type="button"
          className="text-indigo-600 font-bold text-md"
          onClick={onRightIconClick}>
          {t("consent.unblock")}
        </button>
      )}
    </div>
  );
};
