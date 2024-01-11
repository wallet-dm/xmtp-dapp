import { useTranslation } from "react-i18next";

export const EmptyBlocked = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col justify-center items-center h-full text-center px-4">
      <h2 className="text-xl font-bold mt-4" data-testid="empty-message-header">
        {t("messages.convos_empty_blocker_header")}
      </h2>
    </div>
  );
};
