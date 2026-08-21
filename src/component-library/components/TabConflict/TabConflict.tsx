import { useTranslation } from "react-i18next";
import { DuplicateIcon } from "@heroicons/react/outline";
import { PillButton } from "../PillButton/PillButton";

interface TabConflictProps {
  /**
   * Hand control of the local database to this tab
   */
  onTakeOver: () => void;
}

/**
 * Shown when another tab already holds the XMTP local database. Blocking is
 * deliberate — browser-sdk's OPFS storage supports only one connection at a
 * time, so two live tabs is not a state the app can render its way out of.
 */
export const TabConflict = ({ onTakeOver }: TabConflictProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="flex h-dvh w-full flex-col items-center justify-center p-6 text-center"
      data-testid="tab-conflict">
      <DuplicateIcon className="mb-4 text-gray-400" width={48} height={48} />
      <h1 className="mb-2 text-2xl font-bold" data-testid="tab-conflict-header">
        {t("status_messaging.tab_conflict_header")}
      </h1>
      <p className="mb-6 max-w-sm text-md text-gray-600">
        {t("status_messaging.tab_conflict_subheader")}
      </p>
      <PillButton
        label={t("status_messaging.tab_conflict_cta")}
        onClick={onTakeOver}
        testId="tab-conflict-cta"
      />
    </div>
  );
};

export default TabConflict;
