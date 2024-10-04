// @scure
import { sign } from "@scure/starknet";

// starknet.js
import { StarknetChainId } from "starknet-core/constants";
import type { BigNumberish } from "starknet-core/types/lib";
import { formatSignature } from "starknet-core/utils/stark";
import { toHex } from "starknet-core/utils/num";
import { calculateDeclareTransactionHash as calculateDeclareTransactionHashV2 } from "starknet-core/utils/hash/transactionHash/v2";

// @starknet-io/types-js
import { BROADCASTED_DECLARE_TXN_V2 } from "../../starknet-types/api/components.js";
import { Contract } from "../common/index.js";
import { DeepReadonly } from "../../type-utils/index.js";

export function create_declare_transaction_intent_v2(args: {
  sender_address: string;
  max_fee: BigNumberish;
  nonce: BigNumberish;
  contract: Contract;
  chain_id: string;
}) {
  const deploymentData: DeepReadonly<
    Omit<BROADCASTED_DECLARE_TXN_V2, "signature">
  > = {
    type: "DECLARE",
    contract_class: {
      sierra_program: args.contract.sierra_program,
      contract_class_version: args.contract.contract_class_version,
      entry_points_by_type: args.contract.entry_points_by_type,
      abi: args.contract.abi,
    },
    compiled_class_hash: args.contract.compiled_class_hash,
    version: "0x2",
    sender_address: args.sender_address,
    max_fee: toHex(args.max_fee),
    nonce: toHex(args.nonce),
  } as const;

  const msgHash = calculateDeclareTransactionHashV2(
    args.contract.class_hash,
    deploymentData.sender_address,
    deploymentData.version,
    deploymentData.max_fee,
    args.chain_id as StarknetChainId,
    deploymentData.nonce,
    deploymentData.compiled_class_hash
  );

  return { data: deploymentData, hash: msgHash };
}

export function create_declare_transaction_v2(
  args: {
    sender_address: string;
    max_fee: BigNumberish;
    nonce: BigNumberish;
    contract: Contract;
    chain_id: string;
  } & { private_key: string }
) {
  const { data, hash } = create_declare_transaction_intent_v2(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}
