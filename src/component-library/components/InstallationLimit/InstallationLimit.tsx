import type { Installation } from "@xmtp/wasm-bindings";
import { ExclamationIcon } from "@heroicons/react/solid";
import { useTranslation } from "react-i18next";
import { GhostButton } from "../GhostButton/GhostButton";
import { DisconnectIcon } from "../Icons/DisconnectIcon";
import { PillButton } from "../PillButton/PillButton";

interface InstallationLimitProps {
  installations: Installation[];
  isLoading?: boolean;
  onRevoke: () => void;
  onDisconnect?: () => void;
}

const formatRegistered = (installation: Installation) => {
  if (!installation.clientTimestampNs) {
    return null;
  }
  // nanoseconds since epoch
  return new Date(Number(installation.clientTimestampNs / 1_000_000n));
};

/**
 * Shown when an inbox has used every installation slot, which blocks
 * registration entirely. Revoking is destructive to other sessions, so the
 * consequence is stated up front rather than buried behind the button.
 */
export const InstallationLimit = ({
  installations,
  isLoading,
  onRevoke,
  onDisconnect,
}: InstallationLimitProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="bg-white flex flex-col justify-center items-center max-w-md text-center m-auto w-screen p-4 h-dvh"
      data-testid="installation-limit">
      <ExclamationIcon className="text-red-600" width={72} />
      <h1 className="text-3xl font-bold p-4 pt-2">
        {t("installations.limit_header")}
      </h1>
      <p className="text-md text-gray-700">
        {t("installations.limit_subheader", { COUNT: installations.length })}
      </p>
      <p className="mt-3 text-sm text-gray-500">
        {t("installations.limit_warning")}
      </p>

      {installations.length > 0 ? (
        <ul
          className="mt-4 w-full max-h-48 overflow-auto rounded-lg border border-gray-200 text-left"
          data-testid="installation-list">
          {installations.map((installation) => {
            const registered = formatRegistered(installation);
            return (
              <li
                key={installation.id}
                className="border-b border-gray-100 px-3 py-2 text-xs text-gray-600 last:border-b-0">
                <span className="font-mono">
                  {installation.id.slice(0, 16)}…
                </span>
                {registered ? (
                  <span className="ml-2 text-gray-400">
                    {registered.toLocaleDateString()}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="p-3">
        <PillButton
          label={t("installations.revoke_button")}
          onClick={onRevoke}
          isLoading={isLoading}
          isDisabled={isLoading || installations.length === 0}
          testId="revoke-installations-cta"
        />
      </div>
      {onDisconnect ? (
        <GhostButton
          onClick={onDisconnect}
          label={t("common.disconnect")}
          variant="secondary"
          icon={<DisconnectIcon />}
        />
      ) : null}
    </div>
  );
};

export default InstallationLimit;
