import { test, expect } from "vitest";
import { createProxiedJSONRPC } from "remote-procedure-call";
import { Methods as StarknetMethods } from "@starknet-io/types-js";
import assert from "assert";
import { RPC_URL } from "./prool/index.js";
import {
  create_declare_transaction_v2,
  create_invoke_transaction_v1_from_calls,
  create_call,
} from "strk";
import {
  encodeShortString,
  decodeShortString,
} from "starknet-core/utils/shortString";
import { CallData } from "starknet-core/utils/calldata";
import {
  calculateContractAddressFromHash,
  computePedersenHash,
} from "starknet-core/utils/hash";
import GreetingsRegistry from "./ts-artifacts/GreetingsRegistry.js";
import {
  KATANA_CHAIN_ID,
  test_accounts,
  UniversalDeployerContract,
} from "./katana.js";
import { waitForTransaction } from "./utils.js";

const rpc = createProxiedJSONRPC<StarknetMethods>(RPC_URL);

test("starknet_chainId", async function () {
  const chainIdResponse = await rpc.starknet_chainId();
  expect(chainIdResponse.success).to.be.true;
  assert(chainIdResponse.success);
  expect(chainIdResponse.value).to.equal(KATANA_CHAIN_ID);
});

test("declare_GreetingsRegistry", async function () {
  const declare_transaction = create_declare_transaction_v2({
    chain_id: KATANA_CHAIN_ID,
    contract: GreetingsRegistry,
    max_fee: "0xFFFFFFFFFFFFFFFFFF",
    nonce: "0x0",
    sender_address: test_accounts[0].contract_address,
    private_key: test_accounts[0].private_key,
  });
  const declareResponse = await rpc.starknet_addDeclareTransaction({
    declare_transaction,
  });
  expect(declareResponse.success).to.be.true;
  assert(declareResponse.success);
  let receipt = await waitForTransaction(
    rpc,
    declareResponse.value.transaction_hash
  );
  expect(receipt.execution_status).to.equals("SUCCEEDED");
});

test("declare_GreetingsRegistry_again", async function () {
  const declare_transaction = create_declare_transaction_v2({
    chain_id: KATANA_CHAIN_ID,
    contract: GreetingsRegistry,
    max_fee: "0xFFFFFFFFFFFFFFFFFF",
    nonce: "0x1",
    sender_address: test_accounts[0].contract_address,
    private_key: test_accounts[0].private_key,
  });
  const declareResponse = await rpc.starknet_addDeclareTransaction({
    declare_transaction,
  });
  expect(declareResponse.success).to.be.true;
  assert(declareResponse.success);
  let receipt = await waitForTransaction(
    rpc,
    declareResponse.value.transaction_hash,
    { retries: 4 }
  );
  expect(receipt.execution_status).to.equals("SUCCEEDED");
});

let contractAddress: string;
test("deploy_GreetingsRegistry", async function () {
  let prefix: string | [] = encodeShortString("");
  if (prefix == "0x") {
    // this should be handled by encodeShortString
    prefix = [];
  }
  const unique = true;
  const salt = 0;
  const invoke_transaction = create_invoke_transaction_v1_from_calls({
    chain_id: KATANA_CHAIN_ID,
    calls: [
      {
        //https://github.com/dojoengine/dojo/blob/main/crates/katana/contracts/universal_deployer.cairo
        contractAddress: UniversalDeployerContract.contract_address,
        entrypoint: "deployContract",
        calldata: [GreetingsRegistry.class_hash, salt, unique, [prefix]],
      },
    ],
    max_fee: "0xFFFFFFFFFFFFFFFFFF",
    nonce: "0x1",
    sender_address: test_accounts[0].contract_address,
    private_key: test_accounts[0].private_key,
  });
  const invokeResponse = await rpc.starknet_addInvokeTransaction({
    invoke_transaction,
  });
  expect(invokeResponse.success).to.be.true;

  assert(invokeResponse.success);
  let receipt = await waitForTransaction(
    rpc,
    invokeResponse.value.transaction_hash
  );
  expect(receipt.execution_status).to.equals("SUCCEEDED");

  // const lastBlockResponse = await rpc.starknet_blockNumber();
  // assert(lastBlockResponse.success);
  // const keyFilter = [[toHex(starknetKeccak('ContractDeployed'))]];
  // const logsResponse = await rpc.starknet_getEvents({
  // 	filter: {
  // 		address: UniversalDeployerContract.contract_address,
  // 		chunk_size: 10,
  // 		from_block: {block_number: Math.max(lastBlockResponse.value - 9, 0)},
  // 		to_block: {block_number: lastBlockResponse.value},
  // 		keys: keyFilter,
  // 	},
  // });
  const logsResponse = await rpc.starknet_getEvents({
    filter: {
      address: UniversalDeployerContract.contract_address,
      chunk_size: 10,
    },
  });
  expect(logsResponse.success).to.be.true;
  assert(logsResponse.success);
  contractAddress = logsResponse.value.events[0].data[0];

  const expectedContractAddress = unique
    ? calculateContractAddressFromHash(
        computePedersenHash(test_accounts[0].contract_address, salt),
        GreetingsRegistry.class_hash,
        [prefix],
        UniversalDeployerContract.contract_address
      )
    : calculateContractAddressFromHash(
        salt,
        GreetingsRegistry.class_hash,
        [prefix],
        0
      );
  expect(contractAddress).to.equals(expectedContractAddress);
});

test("invoke_GreetingsRegistry", async function () {
  const message = "hello";
  const precallResponse = await rpc.starknet_call(
    create_call({
      contract_address: contractAddress,
      calldata: [test_accounts[0].contract_address],
      entry_point: "lastGreetingOf",
    })
  );
  expect(precallResponse.success).to.be.true;
  assert(precallResponse.success);

  // fix decodeShortString and encodeShortString for ""
  expect(precallResponse.value[0]).to.equals("0x0");

  const abi = JSON.parse(GreetingsRegistry.abi);
  const calldataParser = new CallData(abi);

  const messageAsFelt = encodeShortString(message);
  const invoke_transaction = create_invoke_transaction_v1_from_calls({
    chain_id: KATANA_CHAIN_ID,
    calls: [
      {
        contractAddress: contractAddress,
        entrypoint: "setMessage",
        calldata: calldataParser.compile("setMessage", ["hello", 12]),
      },
    ],
    max_fee: "0xFFFFFFFFFFFFFFFFFF",
    nonce: "0x2",
    sender_address: test_accounts[0].contract_address,
    private_key: test_accounts[0].private_key,
  });
  const invokeResponse = await rpc.starknet_addInvokeTransaction({
    invoke_transaction,
  });
  expect(invokeResponse.success).to.be.true;
  assert(invokeResponse.success);
  let receipt = await waitForTransaction(
    rpc,
    invokeResponse.value.transaction_hash
  );
  expect(receipt.execution_status).to.equals("SUCCEEDED");

  const callResponse = await rpc.starknet_call(
    create_call({
      block_id: {
        block_hash: receipt.block_hash,
      },
      contract_address: contractAddress,
      calldata: [test_accounts[0].contract_address],
      entry_point: "lastGreetingOf",
    })
  );
  expect(callResponse.success).to.be.true;
  assert(callResponse.success);

  expect(callResponse.value[0]).to.equals(messageAsFelt);
  expect(decodeShortString(callResponse.value[0])).to.equals(message);
});

// ------------------------------------------------------------------------------------------------
// EXPERIMENTS
// ------------------------------------------------------------------------------------------------

// export type Invocation = {
//   method: string;
//   args?: any[];
// };

// type Abi = any[];

// export type AbiStateMutability = "pure" | "view" | "nonpayable" | "payable";

// export type ContractFunctionName<
//   abi extends Abi | readonly unknown[] = Abi,
//   mutability extends AbiStateMutability = AbiStateMutability,
// > =
//   ExtractAbiFunctionNames<
//     abi extends Abi ? abi : Abi,
//     mutability
//   > extends infer functionName extends string
//     ? [functionName] extends [never]
//       ? string
//       : functionName
//     : string;

// export type ContractInvocations<
//   abi extends Abi | readonly unknown[] = Abi,
//   mutability extends AbiStateMutability = AbiStateMutability,
//   functionName extends ContractFunctionName<
//     abi,
//     mutability
//   > = ContractFunctionName<abi, mutability>,
//   args extends ContractFunctionArgs<
//     abi,
//     mutability,
//     functionName
//   > = ContractFunctionArgs<abi, mutability, functionName>,
//   deployless extends boolean = false,
//   ///
//   allFunctionNames = ContractFunctionName<abi, mutability>,
//   allArgs = ContractFunctionArgs<abi, mutability, functionName>,
//   // when `args` is inferred to `readonly []` ("inputs": []) or `never` (`abi` declared as `Abi` or not inferrable), allow `args` to be optional.
//   // important that both branches return same structural type
// > = {
//   abi: abi;
//   functionName:
//     | allFunctionNames // show all options
//     | (functionName extends allFunctionNames ? functionName : never); // infer value
//   args?: (abi extends Abi ? UnionWiden<args> : never) | allArgs | undefined;
// } & (readonly [] extends allArgs ? {} : { args: Widen<args> }) &
//   (deployless extends true
//     ? { address?: undefined; code: Hex }
//     : { address: Address });
