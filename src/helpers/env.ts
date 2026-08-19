import type { XmtpEnv } from "@xmtp/browser-sdk";
import { ENVIRONMENT } from "./constants";

export const getEnv = (): XmtpEnv => {
  const envVar = import.meta.env.VITE_XMTP_ENVIRONMENT;
  if (envVar === "production") {
    return envVar;
  }
  if (envVar === "local") {
    return envVar;
  }
  return "dev";
};

// Overrides the endpoint derived from getEnv() when set; unset or empty
// values must stay undefined so the SDK falls back to its per-env URLs.
export const getXmtpApiUrl = (): string | undefined =>
  import.meta.env.VITE_XMTP_API_URL || undefined;

export const isAppEnvDemo = (): boolean =>
  window.location.hostname.includes(ENVIRONMENT.DEMO) ||
  // Added for E2E testing
  localStorage.getItem(ENVIRONMENT.DEMO) === String(true);

export const isAppEnvAlpha = (): boolean =>
  window.location.hostname.includes("alpha");

export const getGoogleTagId = (): string =>
  import.meta.env.VITE_GOOGLE_TAG_ID ?? "";
