// @scure
import { sign } from "@scure/starknet";

// starknet.js
import { StarknetChainId } from "starknet-core/constants";
import type { BigNumberish, Call } from "starknet-core/types/lib";
import { formatSignature } from "starknet-core/utils/stark";
import { getExecuteCalldata } from "starknet-core/utils/transaction";
import { toHex } from "starknet-core/utils/num";
import { calculateTransactionHash as calculateInvokeTransactionHashV1 } from "starknet-core/utils/hash/transactionHash/v2";

// @starknet-io/types-js
import { INVOKE_TXN_V1 } from "../../starknet-types/api/components.js";
import { DeepReadonly } from "../../type-utils/index.js";
import { CallWithABI } from "./types.js";
import { CallData } from "starknet-core";

export function create_invoke_transaction_intent_v1(args: {
  chain_id: string;
  sender_address: string;
  calldata: readonly BigNumberish[];
  max_fee: BigNumberish;
  nonce: BigNumberish;
}) {
  const deploymentData: DeepReadonly<Omit<INVOKE_TXN_V1, "signature">> = {
    type: "INVOKE",
    version: "0x1",
    sender_address: args.sender_address,
    calldata: args.calldata.map(toHex),
    max_fee: toHex(args.max_fee),
    nonce: toHex(args.nonce),
  } as const;

  const msgHash = calculateInvokeTransactionHashV1(
    deploymentData.sender_address,
    deploymentData.version,
    deploymentData.calldata as any, // read only
    deploymentData.max_fee,
    args.chain_id as StarknetChainId,
    deploymentData.nonce
  );

  return { data: deploymentData, hash: msgHash };
}

export function create_invoke_transaction_v1(
  args: {
    chain_id: string;
    sender_address: string;
    calldata: readonly BigNumberish[];
    max_fee: BigNumberish;
    nonce: BigNumberish;
  } & { private_key: string }
) {
  const { data, hash } = create_invoke_transaction_intent_v1(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}

export function create_invoke_transaction_intent_v1_from_calls(args: {
  chain_id: string;
  sender_address: string;
  calls: readonly Call[];
  max_fee: BigNumberish;
  nonce: BigNumberish;
}) {
  const calldata = getExecuteCalldata(args.calls as Call[], "1"); // readonly

  return create_invoke_transaction_intent_v1({
    chain_id: args.chain_id,
    sender_address: args.sender_address,
    calldata,
    max_fee: args.max_fee,
    nonce: args.nonce,
  });
}

export function create_invoke_transaction_v1_from_calls(
  args: {
    chain_id: string;
    sender_address: string;
    calls: readonly Call[];
    max_fee: BigNumberish;
    nonce: BigNumberish;
  } & { private_key: string }
) {
  const { data, hash } = create_invoke_transaction_intent_v1_from_calls(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}

export function create_invoke_transaction_intent_v1_from_calls_with_abi(args: {
  chain_id: string;
  sender_address: string;
  calls: readonly CallWithABI[];
  max_fee: BigNumberish;
  nonce: BigNumberish;
}) {
  const calls = args.calls.map((call) => {
    const calldataParser = new CallData(call.abi);
    const calldata = calldataParser.compile(call.entrypoint, call.args || []);
    const actualCall: Call = {
      contractAddress: call.contractAddress,
      entrypoint: call.entrypoint,
      calldata,
    };
    return actualCall;
  });

  const calldata = getExecuteCalldata(calls, "1");

  return create_invoke_transaction_intent_v1({
    chain_id: args.chain_id,
    sender_address: args.sender_address,
    calldata,
    max_fee: args.max_fee,
    nonce: args.nonce,
  });
}

export function create_invoke_transaction_v1_from_calls_with_abi(
  args: {
    chain_id: string;
    sender_address: string;
    calls: readonly CallWithABI[];
    max_fee: BigNumberish;
    nonce: BigNumberish;
  } & { private_key: string }
) {
  const { data, hash } =
    create_invoke_transaction_intent_v1_from_calls_with_abi(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}
