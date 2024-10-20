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
  options?: {
    retryInterval?: number;
    retries?: number;
    timeout?: number;
  }
): Promise<TXN_RECEIPT_WITH_BLOCK_INFO> {
  const startTime = performance.now();
  const retry =
    (options && options.retries && options.retries > 0) ||
    options?.retries == undefined;
  let retryInterval = options?.retryInterval || 1;
  let startWithFastRetry = options?.retryInterval ? 0 : 3;
  const retriesAtStart = options?.retries || 10;
  let retries = retriesAtStart;
  let receiptForIncludedTransaction = await checkTransaction(
    rpc,
    transaction_hash
  );

  function checkTimeout() {
    if (options?.timeout) {
      const elapsed = performance.now() - startTime;
      if (elapsed > options.timeout * 1000) {
        throw new Error(
          `waitForTransaction timed-out as ${elapsed / 1000} seconds elapsed (more than the specified timeout: ${options.timeout})`
        );
      }
    }
    if (retry) {
      retries--;
      if (retries <= 0) {
        throw new Error(
          `waitForTransaction timed-out after ${retriesAtStart || 0} retries`
        );
      }
    }
  }
  if (!receiptForIncludedTransaction) {
    checkTimeout();
  }

  while (!receiptForIncludedTransaction) {
    if (startWithFastRetry <= 0) {
      if (retryInterval) {
        await wait(retryInterval);
      }
    } else {
      await wait(0.1);
      startWithFastRetry--;
    }
    receiptForIncludedTransaction = await checkTransaction(
      rpc,
      transaction_hash
    );
    if (!receiptForIncludedTransaction) {
      checkTimeout();
    }
  }
  return receiptForIncludedTransaction;
}
