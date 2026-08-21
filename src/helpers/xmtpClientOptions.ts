import type { ClientOptions } from "@xmtp/browser-sdk";
import { getAppVersion } from "./appVersion";
import { getEnv, getXmtpApiUrl } from "./env";

/**
 * Network and storage options for every client this app creates.
 *
 * Codecs are deliberately not set here: they are passed at the `Client.create`
 * call so TypeScript can infer the client's content-type union from the codec
 * list rather than widening it to `ContentCodec[]`.
 *
 * Two options are deliberately absent. `dbEncryptionKey` is accepted but does
 * not encrypt anything in browsers, so there is no key for this app to hold.
 * `dbPath` is left undefined so the SDK names the database
 * `xmtp-<env>-<inboxId>.db3`, which keeps separate wallets and environments on
 * separate databases for free.
 */
export const buildClientOptions = (): Omit<ClientOptions, "codecs"> => {
  const apiUrl = getXmtpApiUrl();

  return {
    env: getEnv(),
    // only set apiUrl when it has a value, so the SDK falls back to its
    // per-environment endpoint table
    ...(apiUrl ? { apiUrl } : {}),
    appVersion: getAppVersion(),
  };
};
