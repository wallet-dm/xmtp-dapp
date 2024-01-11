import { HeaderDropdown } from "../component-library/components/HeaderDropdown/HeaderDropdown";
import { TAILWIND_MD_BREAKPOINT } from "../helpers";
import useWindowSize from "../hooks/useWindowSize";
import { useXmtpStore } from "../store/xmtp";
import { ConsentState } from "@xmtp/react-sdk";

export const HeaderDropdownController = () => {
  const resetRecipient = useXmtpStore((s) => s.resetRecipient);
  const setConversationTopic = useXmtpStore((s) => s.setConversationTopic);
  const recipientInput = useXmtpStore((s) => s.recipientInput);
  const setStartedFirstMessage = useXmtpStore((s) => s.setStartedFirstMessage);
  const [width] = useWindowSize();

  return (
    <HeaderDropdown
      dropdownOptions={[ "allowed", "unknown", "denied" ] as ConsentState[]}
      recipientInput={recipientInput}
      onClick={() => {
        resetRecipient();
        setConversationTopic();
        setStartedFirstMessage(true);
      }}
      isMobileView={width <= TAILWIND_MD_BREAKPOINT}
    />
  );
};
