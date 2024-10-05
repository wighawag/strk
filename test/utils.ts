import { ProxiedRPC } from "remote-procedure-call";
import { Methods as StarknetMethods } from "@starknet-io/types-js";
import { TXN_RECEIPT_WITH_BLOCK_INFO } from "../dist/starknet-types/api/components.js"; // TODO

export function wait(s: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
}

async function checkTransaction(
  rpc: ProxiedRPC<StarknetMethods>,
  transaction_hash: string
) {
  const txStatusResponse = await rpc.starknet_getTransactionStatus({
    transaction_hash,
  });

  if (!txStatusResponse.success) {
    return undefined;
  }

  const execution_status = txStatusResponse.value.execution_status;
  const finality_status = txStatusResponse.value.finality_status;

  if (!finality_status) {
    // Transaction is potentially NOT_RECEIVED or RPC not Synced yet
    // so we will retry '{ retries }' times
    console.error("no finalisty_status");
    return undefined;
  }

  if (finality_status === "REJECTED") {
    const message = `${execution_status}: ${finality_status}`;
    throw new Error(message, { cause: txStatusResponse.value });
  }
  let txResponse = await rpc.starknet_getTransactionReceipt({
    transaction_hash,
  });

  const included = txResponse.success && txResponse.value.block_hash;

  return included ? txResponse.value : undefined;
}

export async function waitForTransaction(
  rpc: ProxiedRPC<StarknetMethods>,
  transaction_hash: string,
  options?: { checkIntervalInSeconds?: number; retries?: number }
): Promise<TXN_RECEIPT_WITH_BLOCK_INFO> {
  const retry = !!options?.retries;
  let retries = options?.retries || 0;
  let receiptForIncludedTransaction = await checkTransaction(
    rpc,
    transaction_hash
  );
  if (retry && !receiptForIncludedTransaction) {
    retries--;
    if (retries <= 0) {
      throw new Error(
        `waitForTransaction timed-out with retries ${options?.retries || 0}`
      );
    }
  }
  while (!receiptForIncludedTransaction) {
    if (options?.checkIntervalInSeconds) {
      await wait(options.checkIntervalInSeconds);
    }
    receiptForIncludedTransaction = await checkTransaction(
      rpc,
      transaction_hash
    );
    if (retry && !receiptForIncludedTransaction) {
      retries--;
      if (retries <= 0) {
        throw new Error(
          `waitForTransaction timed-out with retries ${options?.retries || 0}`
        );
      }
    }
  }
  return receiptForIncludedTransaction;
}
