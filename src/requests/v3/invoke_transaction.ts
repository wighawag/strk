// @scure
import { poseidonHashMany, sign } from "@scure/starknet";

// starknet.js
import {
  StarknetChainId,
  TransactionHashPrefix,
} from "starknet-core/constants";
import type { BigNumberish, Call } from "starknet-core/types/lib";
import { formatSignature } from "starknet-core/utils/stark";
import { getExecuteCalldata } from "starknet-core/utils/transaction";
import { toHex } from "starknet-core/utils/num";

// @starknet-io/types-js
import { INVOKE_TXN_V3 } from "../../starknet-types/api/components.js";
import { DeepReadonly } from "../../type-utils/index.js";
import { calculateTransactionHashCommon } from "starknet-core/utils/hash/transactionHash/v3";
import { AToBI, toLowLevelResourceBound } from "./utils.js";
import { EDAMode, ResourceBounds } from "./types.js";

export function create_invoke_transaction_intent_v3(args: {
  chain_id: string;
  sender_address: string;
  calldata: BigNumberish[];
  nonce: BigNumberish;
  account_deployment_data?: BigNumberish[];
  nonce_data_availability_mode?: EDAMode;
  fee_data_availability_mode?: EDAMode;
  resource_bounds: ResourceBounds;
  tip?: BigNumberish;
  paymaster_data?: BigNumberish[];
}) {
  const deploymentData: DeepReadonly<Omit<INVOKE_TXN_V3, "signature">> = {
    type: "INVOKE",
    version: "0x3",
    sender_address: args.sender_address,
    calldata: args.calldata.map(toHex),
    nonce: toHex(args.nonce),
    account_deployment_data: args.account_deployment_data
      ? args.account_deployment_data.map(toHex)
      : [],
    fee_data_availability_mode:
      args.fee_data_availability_mode || ("L1" as any), // readonly
    nonce_data_availability_mode:
      args.nonce_data_availability_mode || ("L1" as any), // readonly
    paymaster_data: args.paymaster_data ? args.paymaster_data.map(toHex) : [],
    resource_bounds: toLowLevelResourceBound(args.resource_bounds),
    tip: args.tip ? toHex(args.tip) : "0x0",
  } as const;

  // TODO make it readonly
  const msgHash = calculateTransactionHashCommon(
    TransactionHashPrefix.INVOKE,
    deploymentData.version,
    deploymentData.sender_address,
    args.chain_id as StarknetChainId,
    deploymentData.nonce,
    deploymentData.tip,
    deploymentData.paymaster_data as any, // TODO readonly
    deploymentData.nonce_data_availability_mode === "L1" ? 0 : 1, // TODO use our own calculateTransactionHashCommon
    deploymentData.fee_data_availability_mode === "L1" ? 0 : 1, // TODO use our own calculateTransactionHashCommon
    deploymentData.resource_bounds,
    [
      poseidonHashMany(AToBI(deploymentData.account_deployment_data as any)), // TODO readonly
      poseidonHashMany(AToBI(deploymentData.calldata as any)), // TODO readonly
    ]
  );

  return { data: deploymentData, hash: msgHash };
}

export function create_invoke_transaction_v3(
  args: {
    chain_id: string;
    sender_address: string;
    calldata: BigNumberish[];
    nonce: BigNumberish;
    account_deployment_data?: BigNumberish[];
    nonce_data_availability_mode?: EDAMode;
    fee_data_availability_mode?: EDAMode;
    resource_bounds: ResourceBounds;
    tip?: BigNumberish;
    paymaster_data?: BigNumberish[];
  } & { private_key: string }
) {
  const { data, hash } = create_invoke_transaction_intent_v3(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}

export function create_invoke_transaction_intent_v3_from_calls(args: {
  chain_id: string;
  sender_address: string;
  calls: Call[];
  nonce: BigNumberish;
  account_deployment_data?: BigNumberish[];
  nonce_data_availability_mode?: EDAMode;
  fee_data_availability_mode?: EDAMode;
  resource_bounds: ResourceBounds;
  tip?: BigNumberish;
  paymaster_data?: BigNumberish[];
}) {
  const calldata = getExecuteCalldata(args.calls, "1");

  return create_invoke_transaction_intent_v3({
    ...args,
    calldata,
  });
}

export function create_invoke_transaction_v3_from_calls(
  args: {
    chain_id: string;
    sender_address: string;
    calls: Call[];
    nonce: BigNumberish;
    account_deployment_data?: BigNumberish[];
    nonce_data_availability_mode?: EDAMode;
    fee_data_availability_mode?: EDAMode;
    resource_bounds: ResourceBounds;
    tip?: BigNumberish;
    paymaster_data?: BigNumberish[];
  } & { private_key: string }
) {
  const { data, hash } = create_invoke_transaction_intent_v3_from_calls(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}
