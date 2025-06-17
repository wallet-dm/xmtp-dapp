import { getDataSuffix, submitReferral } from "@divvi/referral-sdk";
import { useWalletClient } from "wagmi";
import { mainnet } from "viem/chains";
import { useCallback } from "react";

interface UseDivviReferralProps {
  consumer: `0x${string}`;
  providers: `0x${string}`[];
}

export const useDivviReferral = ({
  consumer,
  providers,
}: UseDivviReferralProps) => {
  const { data: walletClient } = useWalletClient();

  const getReferralDataSuffix = useCallback(async () => {
    if (!walletClient) {
      throw new Error("Wallet client not initialized");
    }

    return getDataSuffix({
      consumer,
      providers,
    });
  }, [walletClient, consumer, providers]);

  const submitReferralTransaction = useCallback(
    async (txHash: `0x${string}`) => {
      if (!walletClient) {
        throw new Error("Wallet client not initialized");
      }

      const chainId = await walletClient.getChainId();

      return submitReferral({
        txHash,
        chainId,
      });
    },
    [walletClient],
  );

  const sendTransactionWithReferral = useCallback(
    async ({
      to,
      data,
      value,
      ...rest
    }: {
      to: `0x${string}`;
      data: `0x${string}`;
      value?: bigint;
      [key: string]: any;
    }) => {
      if (!walletClient) {
        throw new Error("Wallet client not initialized");
      }

      const [account] = await walletClient.getAddresses();
      const dataSuffix = await getReferralDataSuffix();

      const txHash = await walletClient.sendTransaction({
        account,
        to,
        data: `${data}${dataSuffix}` as `0x${string}`,
        value,
        ...rest,
      });

      await submitReferralTransaction(txHash);

      return txHash;
    },
    [walletClient, getReferralDataSuffix, submitReferralTransaction],
  );

  return {
    getReferralDataSuffix,
    submitReferralTransaction,
    sendTransactionWithReferral,
  };
};
