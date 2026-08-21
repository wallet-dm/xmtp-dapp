import { IdentifierKind } from "@xmtp/browser-sdk";
import type { Identifier, Signer } from "@xmtp/browser-sdk";
import { hexToBytes } from "viem";
import type { WalletClient } from "viem";
import type { ETHAddress } from "./string";

/**
 * Adapts a wagmi/viem wallet client to the signer browser-sdk expects.
 *
 * Two mismatches are handled here. `getIdentifier` is a function rather than a
 * property, and `signMessage` must resolve to raw bytes — viem returns a 0x
 * hex string, which the SDK rejects during signature validation with an opaque
 * error from WASM.
 *
 * `IdentifierKind` is a numeric enum, so it has to be a value import rather
 * than a type-only one.
 */
export const createEOASigner = (
  address: ETHAddress,
  walletClient: WalletClient,
): Signer => ({
  type: "EOA",
  getIdentifier: (): Identifier => ({
    // libxmtp keys its reachability map on the exact string it is handed, so
    // addresses are lowercased once, here, rather than at each call site
    identifier: address.toLowerCase(),
    identifierKind: IdentifierKind.Ethereum,
  }),
  signMessage: async (message: string): Promise<Uint8Array> => {
    const signature = await walletClient.signMessage({
      account: walletClient.account ?? address,
      message,
    });
    return hexToBytes(signature);
  },
});
