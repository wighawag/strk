// @scure
import { sign } from "@scure/starknet";

import type { BigNumberish, StarknetChainId } from "starknet-core";
import { formatSignature } from "starknet-core/utils/stark";
import { toHex } from "starknet-core/utils/num";
import { calculateDeclareTransactionHash as calculateDeclareTransactionHashV3 } from "starknet-core/utils/hash/transactionHash/v3";

// @starknet-io/types-js
import { BROADCASTED_DECLARE_TXN_V3 } from "../../starknet-types/api/components.js";

import type { Contract } from "../common/index.js";
import { DeepReadonly } from "../../type-utils/index.js";
import { toLowLevelResourceBound } from "./utils.js";
import { ResourceBounds } from "./types.js";

export function create_declare_transaction_intent_v3(args: {
  sender_address: string;
  nonce: BigNumberish;
  resource_bounds: {
    l1_gas: { max_amount: BigNumberish; max_price_per_unit: BigNumberish };
    l2_gas: { max_amount: BigNumberish; max_price_per_unit: BigNumberish };
  };
  contract: Contract;
  chain_id: string;
}) {
  const deploymentData: DeepReadonly<
    Omit<BROADCASTED_DECLARE_TXN_V3, "signature">
  > = {
    type: "DECLARE",
    contract_class: {
      sierra_program: args.contract.sierra_program,
      contract_class_version: args.contract.contract_class_version,
      entry_points_by_type: args.contract.entry_points_by_type,
      abi: args.contract.abi,
    },
    compiled_class_hash: args.contract.compiled_class_hash,
    version: "0x3",
    sender_address: args.sender_address,
    nonce: toHex(args.nonce),
    resource_bounds: toLowLevelResourceBound(args.resource_bounds), // TODO
    tip: "0x0", // TODO
    paymaster_data: [], // TODO
    account_deployment_data: [], // TODO
    nonce_data_availability_mode: "L1", // TODO L1 or L2
    fee_data_availability_mode: "L1", // TODO L1 or L2
  } as const;

  const msgHash = calculateDeclareTransactionHashV3(
    args.contract.class_hash,
    deploymentData.compiled_class_hash,
    deploymentData.sender_address,
    deploymentData.version,
    args.chain_id as StarknetChainId,
    deploymentData.nonce,
    deploymentData.account_deployment_data as BigNumberish[], // readonly
    deploymentData.nonce_data_availability_mode == "L1" ? 0 : 1,
    deploymentData.fee_data_availability_mode == "L1" ? 0 : 1,
    deploymentData.resource_bounds,
    deploymentData.tip,
    deploymentData.paymaster_data as BigNumberish[] // readonly
  );

  return { data: deploymentData, hash: msgHash };
}

export function create_declare_transaction_v3(
  args: {
    sender_address: string;
    nonce: BigNumberish;
    resource_bounds: ResourceBounds;
    contract: Contract;
    chain_id: string;
  } & { private_key: string }
) {
  const { data, hash } = create_declare_transaction_intent_v3(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}
