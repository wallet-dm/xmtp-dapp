import {
  identityKey,
  isIdentityStale,
  useIdentityStore,
} from "../store/identity";
import type { IdentityPatch } from "../store/identity";
import { chunkArray } from "./functions";
import type { ETHAddress } from "./string";
import {
  throttledFetchEnsAvatar,
  throttledFetchEnsName,
  throttledFetchUnsNames,
} from "./string";

/**
 * Resolves ENS/UNS names and avatars for peer addresses.
 *
 * Ported from the Dexie-backed helper this replaces; only the read and write
 * ends changed. The lookup strategy is deliberately unchanged: UNS supports a
 * bulk endpoint so those go out in one request, while ENS has no bulk lookup
 * and is batched ten at a time, yielding to the event loop between batches so
 * a long conversation list does not block rendering.
 */

/** ENS has no bulk endpoint, so lookups go out in batches of this size. */
const ENS_CHUNK_SIZE = 10;

/**
 * Runs a lookup, turning a failure into a miss.
 *
 * These are third-party calls — the UNS API, an ENS resolver, and for
 * NFT-backed avatars an image host that may not send CORS headers. A single
 * rejection inside Promise.all would abandon the whole batch and reject the
 * caller, so failures are contained per address.
 */
const settle = async <T>(lookup: () => Promise<T>): Promise<T | null> => {
  try {
    return await lookup();
  } catch {
    return null;
  }
};

/** Lets the browser paint between batches instead of blocking on a long list. */
const yieldToPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

/** Addresses whose cached identity is missing or has aged out. */
const staleAddresses = (addresses: ETHAddress[]): ETHAddress[] => {
  const { byAddress } = useIdentityStore.getState();
  const seen = new Set<string>();
  return addresses.filter((address) => {
    const key = identityKey(address);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return isIdentityStale(byAddress[key]);
  });
};

/**
 * Look up names and avatars for a set of peer addresses and cache the results.
 * Safe to call with the full conversation list on every render — cached and
 * fresh entries are filtered out before any request goes out.
 */
export const resolvePeerIdentities = async (addresses: ETHAddress[]) => {
  const pending = staleAddresses(addresses);
  if (pending.length === 0) {
    return;
  }

  const { upsertIdentities } = useIdentityStore.getState();
  const names: Record<string, string> = {};

  // UNS first — one request covers every address
  const unsNames = (await settle(() => throttledFetchUnsNames(pending))) ?? {};
  Object.entries(unsNames).forEach(([address, name]) => {
    names[identityKey(address)] = name;
  });

  const unresolved = pending.filter((address) => !names[identityKey(address)]);

  // eslint-disable-next-line no-restricted-syntax
  for (const chunk of chunkArray(unresolved, ENS_CHUNK_SIZE)) {
    // eslint-disable-next-line no-await-in-loop
    await yieldToPaint();
    // eslint-disable-next-line no-await-in-loop
    const resolved = await Promise.all(
      chunk.map(async (address) => ({
        address,
        name: await settle(() =>
          throttledFetchEnsName({ address, chainId: 1 }),
        ),
      })),
    );
    resolved.forEach(({ address, name }) => {
      if (name) {
        names[identityKey(address)] = name;
      }
    });
  }

  // Record every address that was looked up, including the misses — a null
  // name is a cacheable answer and stops the same address being retried on
  // each render.
  const patches: Record<string, IdentityPatch> = {};
  pending.forEach((address) => {
    patches[identityKey(address)] = {
      name: names[identityKey(address)] ?? null,
    };
  });
  upsertIdentities(patches);

  // Avatars are keyed by name, so only addresses that resolved can have one
  const withNames = Object.entries(names);
  // eslint-disable-next-line no-restricted-syntax
  for (const chunk of chunkArray(withNames, ENS_CHUNK_SIZE)) {
    // eslint-disable-next-line no-await-in-loop
    await yieldToPaint();
    // eslint-disable-next-line no-await-in-loop
    const avatars = await Promise.all(
      chunk.map(async ([address, name]) => ({
        address,
        avatar: await settle(() => throttledFetchEnsAvatar({ name })),
      })),
    );
    const avatarPatches: Record<string, IdentityPatch> = {};
    avatars.forEach(({ address, avatar }) => {
      avatarPatches[address] = { avatar: avatar ?? null };
    });
    useIdentityStore.getState().upsertIdentities(avatarPatches);
  }
};

/** Convenience wrapper for a single address. */
export const resolvePeerIdentity = async (address?: ETHAddress | null) => {
  if (address) {
    await resolvePeerIdentities([address]);
  }
};
