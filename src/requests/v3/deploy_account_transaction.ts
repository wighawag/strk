// @scure
import { poseidonHashMany, sign } from "@scure/starknet";

// starknet.js
import {
  StarknetChainId,
  TransactionHashPrefix,
} from "starknet-core/constants";
import type { BigNumberish } from "starknet-core/types/lib";
import { formatSignature } from "starknet-core/utils/stark";
import { toHex } from "starknet-core/utils/num";
import { calculateTransactionHashCommon } from "starknet-core/utils/hash/transactionHash/v3";

// @starknet-io/types-js
import { DEPLOY_ACCOUNT_TXN_V3 } from "../../starknet-types/api/components.js";

// here
import { CallData } from "starknet-core/utils/calldata";
import { calculateContractAddressFromHash } from "starknet-core/utils/hash";
import { DeepReadonly } from "../../type-utils/index.js";
import { AToBI, toLowLevelResourceBound } from "./utils.js";
import { ResourceBounds, EDAMode } from "./types.js";

export function create_deploy_account_transaction_intent_v3(args: {
  chain_id: string;
  class_hash: string;
  constructor_calldata: BigNumberish[];
  contract_address_salt: BigNumberish;
  nonce: BigNumberish;
  nonce_data_availability_mode?: EDAMode;
  fee_data_availability_mode?: EDAMode;
  resource_bounds: ResourceBounds;
  tip?: BigNumberish;
  paymaster_data?: BigNumberish[];
}) {
  const deploymentData: DeepReadonly<Omit<DEPLOY_ACCOUNT_TXN_V3, "signature">> =
    {
      type: "DEPLOY_ACCOUNT",
      version: "0x3",
      class_hash: args.class_hash,
      constructor_calldata: args.constructor_calldata.map(toHex),
      nonce: toHex(args.nonce),
      contract_address_salt: toHex(args.contract_address_salt),
      fee_data_availability_mode:
        args.fee_data_availability_mode || ("L1" as any), // readonly
      nonce_data_availability_mode:
        args.nonce_data_availability_mode || ("L1" as any), // readonly
      paymaster_data: args.paymaster_data ? args.paymaster_data.map(toHex) : [],
      resource_bounds: toLowLevelResourceBound(args.resource_bounds),
      tip: args.tip ? toHex(args.tip) : "0x0",
    } as const;

  const compiledCalldata = CallData.compile(
    deploymentData.constructor_calldata as any
  ); // readonly
  const contract_address = calculateContractAddressFromHash(
    deploymentData.contract_address_salt,
    deploymentData.class_hash,
    compiledCalldata,
    0
  );

  const msgHash = calculateTransactionHashCommon(
    TransactionHashPrefix.DEPLOY_ACCOUNT,
    deploymentData.version,
    contract_address,
    args.chain_id as StarknetChainId,
    deploymentData.nonce,
    deploymentData.nonce,
    deploymentData.paymaster_data as any, // TODO readonly
    deploymentData.nonce_data_availability_mode === "L1" ? 0 : 1, // TODO use our own calculateTransactionHashCommon
    deploymentData.fee_data_availability_mode === "L1" ? 0 : 1, // TODO use our own calculateTransactionHashCommon
    deploymentData.resource_bounds,
    [
      poseidonHashMany(AToBI(compiledCalldata)),
      args.class_hash,
      args.contract_address_salt,
    ]
  );

  return { data: deploymentData, hash: msgHash, contract_address };
}

export function create_deploy_account_transaction_v3(
  args: {
    chain_id: string;
    class_hash: string;
    constructor_calldata: BigNumberish[];
    contract_address_salt: BigNumberish;
    nonce: BigNumberish;
    nonce_data_availability_mode?: EDAMode;
    fee_data_availability_mode?: EDAMode;
    resource_bounds: ResourceBounds;
    tip?: BigNumberish;
    paymaster_data?: BigNumberish[];
  } & { private_key: string }
) {
  const { data, hash } = create_deploy_account_transaction_intent_v3(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}
