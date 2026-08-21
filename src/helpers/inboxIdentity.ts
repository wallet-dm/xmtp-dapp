import { IdentifierKind } from "@xmtp/browser-sdk";
import type { Identifier, InboxState } from "@xmtp/browser-sdk";
import type { AppXmtpClient } from "../contexts/XmtpContext";
import { identityKey, useIdentityStore } from "../store/identity";
import type { ETHAddress } from "./string";

/**
 * V3 addresses conversations by inbox ID, but every identity this app shows a
 * user is a wallet address — the recipient input, `/dm/:address` deep links,
 * blockies, ENS/UNS names. These helpers bridge the two and cache both
 * directions, since the mapping never changes for a given pair.
 */

export const toEthIdentifier = (address: string): Identifier => ({
  identifier: address.toLowerCase(),
  identifierKind: IdentifierKind.Ethereum,
});

/**
 * Picks the address to display for an inbox.
 *
 * An inbox can hold several wallets, so the choice needs to be deterministic
 * or the same peer renders differently in different places. The recovery
 * identifier is preferred because it is the inbox's stable root.
 */
export const getDisplayAddress = (state: InboxState): ETHAddress | null => {
  const { recoveryIdentifier } = state;
  if (recoveryIdentifier?.identifierKind === IdentifierKind.Ethereum) {
    return recoveryIdentifier.identifier as ETHAddress;
  }
  const ethereum = state.accountIdentifiers.find(
    (identifier) => identifier.identifierKind === IdentifierKind.Ethereum,
  );
  return (ethereum?.identifier as ETHAddress) ?? null;
};

/** Resolves an address to its inbox ID, or undefined if it is not reachable. */
export const resolveInboxId = async (
  client: AppXmtpClient,
  address: string,
): Promise<string | undefined> => {
  const cached =
    useIdentityStore.getState().addressToInboxId[identityKey(address)];
  if (cached) {
    return cached;
  }

  const inboxId = await client.fetchInboxIdByIdentifier(
    toEthIdentifier(address),
  );
  if (inboxId) {
    useIdentityStore.getState().linkInbox(inboxId, address);
  }
  return inboxId;
};

/**
 * Resolves inbox IDs to display addresses in one batch.
 *
 * Checks the local database first and only reaches the network for the
 * remainder, because conversation lists call this for every visible row.
 */
export const resolveAddressesForInboxIds = async (
  client: AppXmtpClient,
  inboxIds: string[],
): Promise<Record<string, ETHAddress>> => {
  const { inboxIdToAddress, linkInboxes } = useIdentityStore.getState();

  const resolved: Record<string, ETHAddress> = {};
  const unknown: string[] = [];

  inboxIds.forEach((inboxId) => {
    const cached = inboxIdToAddress[inboxId];
    if (cached) {
      resolved[inboxId] = cached as ETHAddress;
    } else {
      unknown.push(inboxId);
    }
  });

  if (unknown.length === 0) {
    return resolved;
  }

  const collect = (states: InboxState[]) => {
    states.forEach((state) => {
      const address = getDisplayAddress(state);
      if (address) {
        resolved[state.inboxId] = address;
      }
    });
  };

  collect(await client.preferences.getInboxStates(unknown));

  const stillUnknown = unknown.filter((inboxId) => !resolved[inboxId]);
  if (stillUnknown.length > 0) {
    collect(await client.preferences.fetchInboxStates(stillUnknown));
  }

  linkInboxes(
    Object.entries(resolved).map(([inboxId, address]) => [inboxId, address]),
  );

  return resolved;
};
