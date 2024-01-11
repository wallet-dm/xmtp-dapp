import { ClipboardCopyIcon } from "@heroicons/react/outline";
import { useClient } from "@xmtp/react-sdk";
import { useTranslation } from "react-i18next";
import { QRCode } from "react-qrcode-logo";
import type { ETHAddress } from "../../../helpers";

export const EmptyRequest = () => {
  const { t } = useTranslation();
  const { client } = useClient();
  const walletAddress = (client?.address as ETHAddress | undefined) ?? "";

  return (
    <div className="flex flex-col justify-center items-center h-full text-center">
      <div className="p-4 flex items-center justify-center rounded-3xl bg-white">
        <QRCode
          size={200}
          logoImage="/walletdm-icon.png"
          removeQrCodeBehindLogo
          logoPadding={10}
          value={`${window.location.origin}/dm/${walletAddress}`}
        />
      </div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            void navigator.clipboard.writeText(
              `${window.location.origin}/dm/${walletAddress}`,
            );
          }
        }}
        onClick={() => {
          void navigator.clipboard.writeText(
            `${window.location.origin}/dm/${walletAddress}`,
          );
        }}
        className="flex text-sm mt-5 cursor-pointer">
        <span data-testid="share-qr-link" className="underline">
          {t("common.share_link")}
        </span>
        <ClipboardCopyIcon className="ml-2" width={16} />
      </div>
      <h2 className="text-xl font-bold mt-4" data-testid="empty-message-header">
        {t("messages.convos_empty_header")}
      </h2>
      <p className="text-wrap	my-4 px-4" data-testid="empty-message-subheader">
        {t("common.share_code")}
      </p>
    </div>
  );
};
