// @scure
import { sign } from "@scure/starknet";

// starknet.js
import { StarknetChainId } from "starknet-core/constants";
import type { BigNumberish } from "starknet-core/types/lib";
import { formatSignature } from "starknet-core/utils/stark";
import { toHex } from "starknet-core/utils/num";
import { calculateDeployAccountTransactionHash as calculateDeployAccountTransactionHashV1 } from "starknet-core/utils/hash/transactionHash/v2";

// @starknet-io/types-js
import { DEPLOY_ACCOUNT_TXN_V1 } from "../../starknet-types/api/components.js";

// here
import { CallData } from "starknet-core/utils/calldata";
import { calculateContractAddressFromHash } from "starknet-core/utils/hash";
import { DeepReadonly } from "../../type-utils/index.js";

export function create_deploy_account_transaction_intent_v1(args: {
  chain_id: string;
  class_hash: string;
  constructor_calldata: readonly BigNumberish[];
  contract_address_salt: BigNumberish;
  max_fee: BigNumberish;
  nonce: BigNumberish;
}) {
  const deploymentData: DeepReadonly<Omit<DEPLOY_ACCOUNT_TXN_V1, "signature">> =
    {
      type: "DEPLOY_ACCOUNT",
      version: "0x1",
      class_hash: args.class_hash,
      constructor_calldata: args.constructor_calldata.map(toHex),
      max_fee: toHex(args.max_fee),
      nonce: toHex(args.nonce),
      contract_address_salt: toHex(args.contract_address_salt),
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

  const msgHash = calculateDeployAccountTransactionHashV1(
    contract_address,
    deploymentData.class_hash,
    deploymentData.constructor_calldata as any, // readonly
    deploymentData.contract_address_salt,
    deploymentData.version,
    deploymentData.max_fee,
    args.chain_id as StarknetChainId,
    deploymentData.nonce
  );

  return { data: deploymentData, hash: msgHash, contract_address };
}

export function create_deploy_account_transaction_v1(
  args: {
    chain_id: string;
    class_hash: string;
    constructor_calldata: readonly BigNumberish[];
    contract_address_salt: BigNumberish;
    max_fee: BigNumberish;
    nonce: BigNumberish;
  } & { private_key: string }
) {
  const { data, hash } = create_deploy_account_transaction_intent_v1(args);

  const signature = formatSignature(sign(hash, args.private_key));

  return {
    ...data,
    signature,
  };
}
