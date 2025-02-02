import { useEffect } from "react";
import { useCanMessage } from "@xmtp/react-sdk";
import debounce from "lodash/debounce";
import {
  isEnsName,
  isUnsName,
  isValidLongWalletAddress,
  throttledFetchEnsAddress,
  throttledFetchEnsAvatar,
  throttledFetchEnsName,
  throttledFetchUnsAddress,
  throttledFetchUnsName,
} from "../helpers";
import { useXmtpStore } from "../store/xmtp";

/**
 * Hook to manage the state of the recipient address input
 *
 * DO NOT RENDER THIS HOOK MORE THAN ONCE
 */
export const useAddressInput = () => {
  const { canMessage } = useCanMessage();
  const recipientInput = useXmtpStore((s) => s.recipientInput);
  const recipientAddress = useXmtpStore((s) => s.recipientAddress);
  const recipientName = useXmtpStore((s) => s.recipientName);
  const recipientAvatar = useXmtpStore((s) => s.recipientAvatar);
  const recipientOnNetwork = useXmtpStore((s) => s.recipientOnNetwork);
  const setRecipientState = useXmtpStore((s) => s.setRecipientState);
  const setRecipientAddress = useXmtpStore((s) => s.setRecipientAddress);
  const setRecipientName = useXmtpStore((s) => s.setRecipientName);
  const setRecipientAvatar = useXmtpStore((s) => s.setRecipientAvatar);
  const setRecipientOnNetwork = useXmtpStore((s) => s.setRecipientOnNetwork);

  /**
   * When the recipient address is updated with a valid address, fetch the
   * recipient's name and avatar if necessary, then verify the address is
   * on the network
   */
  useEffect(() => {
    const fetchAddressIdentity = async () => {
      // must have a valid recipient address
      if (recipientAddress) {
        try {
          // no name
          if (!recipientName) {
            setRecipientState("loading");
            // check for UNS name
            const unsName = await throttledFetchUnsName(recipientAddress);
            if (unsName) {
              setRecipientName(unsName);
            } else {
              // check for ENS name
              const ensName = await throttledFetchEnsName({
                address: recipientAddress,
                chainId: 1,
              });
              setRecipientName(ensName);
            }
          }
        } catch (e) {
          console.error(e);
        }
        try {
          // no avatar
          if (!recipientAvatar && recipientName) {
            setRecipientState("loading");
            // check for avatar
            const avatar = await throttledFetchEnsAvatar({
              name: recipientName,
            });
            setRecipientAvatar(avatar);
          }
        } catch (e) {
          console.error(e);
        }
        try {
          // make sure we can message the recipient
          if (!recipientOnNetwork) {
            setRecipientState("loading");
            const validRecipient = await canMessage(recipientAddress);
            if (validRecipient) {
              setRecipientOnNetwork(true);
            } else {
              setRecipientOnNetwork(false);
            }
          }
        } catch (e) {
          console.error(e);
        }
        setRecipientState("valid");
      }
    };
    void fetchAddressIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientAddress]);

  /**
   * When the recipient input changes, check for a valid ETH address, ENS name,
   * or UNS name, and update the recipient address accordingly
   */
  useEffect(() => {
    const validateAddress = debounce(async () => {
      try {
        // input is a valid ETH address
        if (isValidLongWalletAddress(recipientInput)) {
          setRecipientAddress(recipientInput);
          // if input is a uns name
        } else if (isUnsName(recipientInput)) {
          setRecipientState("loading");
          // fetch uns address
          const address = await throttledFetchUnsAddress(recipientInput);
          if (address) {
            setRecipientAddress(address);
            setRecipientName(recipientInput);
          } else {
            setRecipientState("invalid");
          }
        } else if (isEnsName(recipientInput)) {
          setRecipientState("loading");
          const address = await throttledFetchEnsAddress({
            name: recipientInput,
            chainId: 1,
          });
          if (address) {
            setRecipientAddress(address);
            setRecipientName(recipientInput);
          } else {
            setRecipientState("invalid");
          }
        }
      } catch {
        setRecipientState("error");
      }
    }, 500);
    void validateAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientInput]);
};
