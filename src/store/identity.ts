import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Resolved ENS/UNS identity for a peer address.
 *
 * react-sdk kept this in Dexie conversation metadata. browser-sdk has no
 * metadata store, so the app owns the cache — keyed by address rather than by
 * conversation, which means one entry is shared across every conversation with
 * that peer and it survives the local database being wiped.
 */
export type IdentityEntry = {
  name: string | null;
  avatar: string | null;
  /** epoch ms, for staleness checks */
  resolvedAt: number;
};

/** Successful lookups are cached for a week. */
const POSITIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Misses expire sooner, but not so fast that we hammer the APIs. */
const NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000;

/** Keeps localStorage bounded; oldest entries are dropped first. */
const MAX_ENTRIES = 500;

export type IdentityPatch = Partial<Omit<IdentityEntry, "resolvedAt">>;

interface IdentityState {
  byAddress: Record<string, IdentityEntry>;
  inboxIdToAddress: Record<string, string>;
  addressToInboxId: Record<string, string>;
  upsertIdentity: (address: string, patch: IdentityPatch) => void;
  /** one store write per batch, rather than one per lookup */
  upsertIdentities: (entries: Record<string, IdentityPatch>) => void;
  linkInbox: (inboxId: string, address: string) => void;
  linkInboxes: (pairs: [string, string][]) => void;
  resetIdentities: () => void;
}

export const identityKey = (address: string) => address.toLowerCase();

const mergeEntry = (
  existing: IdentityEntry | undefined,
  patch: IdentityPatch,
): IdentityEntry => ({
  name: patch.name !== undefined ? patch.name : existing?.name ?? null,
  avatar: patch.avatar !== undefined ? patch.avatar : existing?.avatar ?? null,
  resolvedAt: Date.now(),
});

/** Drops the oldest entries once the cache outgrows MAX_ENTRIES. */
const trim = (entries: Record<string, IdentityEntry>) => {
  const keys = Object.keys(entries);
  if (keys.length <= MAX_ENTRIES) {
    return entries;
  }
  return Object.fromEntries(
    keys
      .sort((a, b) => entries[b].resolvedAt - entries[a].resolvedAt)
      .slice(0, MAX_ENTRIES)
      .map((key) => [key, entries[key]]),
  );
};

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      byAddress: {},
      inboxIdToAddress: {},
      addressToInboxId: {},
      upsertIdentity: (address, patch) =>
        set((state) => ({
          byAddress: trim({
            ...state.byAddress,
            [identityKey(address)]: mergeEntry(
              state.byAddress[identityKey(address)],
              patch,
            ),
          }),
        })),
      upsertIdentities: (entries) =>
        set((state) => {
          const byAddress = { ...state.byAddress };
          Object.entries(entries).forEach(([address, patch]) => {
            byAddress[identityKey(address)] = mergeEntry(
              byAddress[identityKey(address)],
              patch,
            );
          });
          return { byAddress: trim(byAddress) };
        }),
      linkInbox: (inboxId, address) =>
        set((state) => ({
          inboxIdToAddress: {
            ...state.inboxIdToAddress,
            [inboxId]: identityKey(address),
          },
          addressToInboxId: {
            ...state.addressToInboxId,
            [identityKey(address)]: inboxId,
          },
        })),
      linkInboxes: (pairs) =>
        set((state) => {
          const inboxIdToAddress = { ...state.inboxIdToAddress };
          const addressToInboxId = { ...state.addressToInboxId };
          pairs.forEach(([inboxId, address]) => {
            inboxIdToAddress[inboxId] = identityKey(address);
            addressToInboxId[identityKey(address)] = inboxId;
          });
          return { inboxIdToAddress, addressToInboxId };
        }),
      resetIdentities: () =>
        set(() => ({
          byAddress: {},
          inboxIdToAddress: {},
          addressToInboxId: {},
        })),
    }),
    {
      name: "walletdm:identity:v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/** True when the address has never been looked up, or the entry has aged out. */
export const isIdentityStale = (entry?: IdentityEntry) => {
  if (!entry) {
    return true;
  }
  const ttl = entry.name ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS;
  return Date.now() - entry.resolvedAt > ttl;
};

export const getPeerName = (address?: string | null) =>
  address
    ? useIdentityStore.getState().byAddress[identityKey(address)]?.name ?? null
    : null;

export const getPeerAvatar = (address?: string | null) =>
  address
    ? useIdentityStore.getState().byAddress[identityKey(address)]?.avatar ??
      null
    : null;

/** Subscribing selectors, so components re-render when a lookup lands. */
export const usePeerName = (address?: string | null) =>
  useIdentityStore((state) =>
    address ? state.byAddress[identityKey(address)]?.name ?? null : null,
  );

export const usePeerAvatar = (address?: string | null) =>
  useIdentityStore((state) =>
    address ? state.byAddress[identityKey(address)]?.avatar ?? null : null,
  );

export const useAddressForInboxId = (inboxId?: string | null) =>
  useIdentityStore((state) =>
    inboxId ? state.inboxIdToAddress[inboxId] ?? null : null,
  );
