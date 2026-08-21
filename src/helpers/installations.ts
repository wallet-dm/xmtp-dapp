import { Client, getInboxIdForIdentifier } from "@xmtp/browser-sdk";
import type { Signer } from "@xmtp/browser-sdk";
import type { Installation } from "@xmtp/wasm-bindings";
import { getEnv } from "./env";
import { toEthIdentifier } from "./inboxIdentity";

/**
 * XMTP caps an inbox at ten installations, and every browser profile or
 * cleared local database consumes one. Once the cap is reached registration
 * fails outright, so the app needs a way out that does not itself require a
 * registered client — which is why the revocation calls here are the static
 * ones rather than the client instance methods.
 */
export const isInstallationLimitError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /already registered\s*\d+\s*\/\s*\d+\s*installations/i.test(message);
};

export type InboxInstallations = {
  inboxId?: string;
  installations: Installation[];
};

/** Reads the installations registered against an address's inbox. */
export const fetchInstallations = async (
  address: string,
): Promise<InboxInstallations> => {
  const env = getEnv();
  const inboxId = await getInboxIdForIdentifier(toEthIdentifier(address), env);
  if (!inboxId) {
    return { installations: [] };
  }
  const [state] = await Client.fetchInboxStates([inboxId], env);
  return { inboxId, installations: state?.installations ?? [] };
};

/**
 * Revokes the given installations. Requires a wallet signature.
 *
 * At the cap there is no current installation worth preserving — this client
 * could not register one — so callers pass the full list and register fresh
 * afterwards.
 */
export const revokeInstallations = async (
  signer: Signer,
  inboxId: string,
  installations: Installation[],
): Promise<void> => {
  await Client.revokeInstallations(
    signer,
    inboxId,
    installations.map((installation) => installation.bytes),
    getEnv(),
  );
};
