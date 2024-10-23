import { test, expect } from "vitest";
import { createProxiedJSONRPC } from "remote-procedure-call";
import { Methods as StarknetMethods } from "@starknet-io/types-js";
import assert from "assert";
import { RPC_URL } from "./prool/index.js";
import {
  create_declare_transaction_v2,
  create_invoke_transaction_v1_from_calls,
  create_call,
  create_deploy_account_transaction_v1,
  create_invoke_transaction_v1_from_calls_with_abi,
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
  ETHTokenContract,
} from "katana-rpc";
import ERC20 from "./abis/ERC20.js";
import { getPublicKey, getStarkKey } from "@scure/starknet";
import { hash } from "starknet-core";

import AccountContract from "./ts-artifacts/Account.js";
import { computeCompiledClassHash } from "starknet-core/utils/hash";
import { Calldata } from "starknet-core";
import { waitForTransaction } from "./utils.js";

const rpc = createProxiedJSONRPC<StarknetMethods>(RPC_URL);

const privateKey =
  "0x2dccce1da22003777062ee0870e9881b460a8b7eca276870f57c601f182136c";
const publicKey = getStarkKey(privateKey);

const contractCallData: CallData = new CallData(
  JSON.parse(AccountContract.abi)
);
const contractConstructor: Calldata = contractCallData.compile("constructor", {
  public_key: publicKey,
});
const accountContractAddress = hash.calculateContractAddressFromHash(
  publicKey,
  AccountContract.class_hash,
  contractConstructor,
  0
);
const test_account_new = {
  public_key: publicKey,
  private_key: privateKey,
  contract_address: accountContractAddress,
};

test("starknet_chainId", async function () {
  const chainIdResponse = await rpc.starknet_chainId();
  expect(chainIdResponse.success).to.be.true;
  assert(chainIdResponse.success);
  expect(chainIdResponse.value).to.equal(KATANA_CHAIN_ID);
});

test("declare_Account", async function () {
  const declare_transaction = create_declare_transaction_v2({
    chain_id: KATANA_CHAIN_ID,
    contract: AccountContract,
    max_fee: "0xFFFFFFFFFFFFFFFFFF",
    nonce: 0,
    sender_address: test_accounts[0].contract_address,
    private_key: test_accounts[0].private_key,
  });
  const declareResponse = await rpc.starknet_addDeclareTransaction({
    declare_transaction,
  });
  expect(declareResponse.success).to.be.true;
  assert(declareResponse.success);

  expect(declareResponse.value.class_hash).to.equals(
    AccountContract.class_hash
  );

  let receipt = await waitForTransaction(
    rpc,
    declareResponse.value.transaction_hash
  );
  expect(receipt.execution_status).to.equals("SUCCEEDED");
});

test("send_eth", async function () {
  const balanceCallResponse = await rpc.starknet_call(
    create_call({
      contract_address: ETHTokenContract.contract_address,
      calldata: [test_accounts[0].contract_address],
      entry_point: "balanceOf",
    })
  );

  expect(balanceCallResponse.success).to.be.true;
  assert(balanceCallResponse.success);

  const balance = balanceCallResponse.value[0];

  console.log({ balance: BigInt(balance) });

  const send_transaction = create_invoke_transaction_v1_from_calls_with_abi({
    chain_id: KATANA_CHAIN_ID,
    calls: [
      {
        abi: ERC20,
        contractAddress: ETHTokenContract.contract_address,
        entrypoint: "transfer",
        args: [test_account_new.contract_address, 1000000000000000000n],
      },
    ],
    max_fee: 10000000000000000n,
    nonce: 1,
    sender_address: test_accounts[0].contract_address,
    private_key: test_accounts[0].private_key,
  });
  const sendResponse = await rpc.starknet_addInvokeTransaction({
    invoke_transaction: send_transaction,
  });
  if (!sendResponse.success) {
    console.error("send_eth failed", sendResponse.error);
  }
  expect(sendResponse.success).to.be.true;
  assert(sendResponse.success);
  let receipt = await waitForTransaction(
    rpc,
    sendResponse.value.transaction_hash
  );
  if (receipt.execution_status !== "SUCCEEDED") {
    console.error("send_eth receipt", receipt);
  }
  expect(receipt.execution_status).to.equals("SUCCEEDED");
});

test("deploy_account", async function () {
  const deploy_account_transaction = create_deploy_account_transaction_v1({
    chain_id: KATANA_CHAIN_ID,
    class_hash: AccountContract.class_hash,
    constructor_calldata: [test_account_new.public_key],
    contract_address_salt: test_account_new.public_key,
    max_fee: "0xFFFFFFFFFFFFF",
    nonce: 0,
    private_key: test_account_new.private_key,
  });
  const deployAccountResponse = await rpc.starknet_addDeployAccountTransaction({
    deploy_account_transaction,
  });

  if (!deployAccountResponse.success) {
    console.error("deploy_account failed", deployAccountResponse.error);
  }
  expect(deployAccountResponse.success).to.be.true;
  assert(deployAccountResponse.success);
  let receipt = await waitForTransaction(
    rpc,
    deployAccountResponse.value.transaction_hash
  );
  if (receipt.execution_status !== "SUCCEEDED") {
    console.error("deploy_account receipt", receipt);
  }
  expect(receipt.execution_status).to.equals("SUCCEEDED");
});

test("declare_GreetingsRegistry", async function () {
  const declare_transaction = create_declare_transaction_v2({
    chain_id: KATANA_CHAIN_ID,
    contract: GreetingsRegistry,
    max_fee: "0xFFFFFFFFFFFFF",
    nonce: 2,
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
    max_fee: "0xFFFFFFFFFFFFF",
    nonce: 3,
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
  const invocation_data = {
    chain_id: KATANA_CHAIN_ID,
    calls: [
      {
        //https://github.com/dojoengine/dojo/blob/main/crates/katana/contracts/universal_deployer.cairo
        contractAddress: UniversalDeployerContract.contract_address,
        entrypoint: "deployContract",
        calldata: [GreetingsRegistry.class_hash, salt, unique, [prefix]],
      },
    ],
    max_fee: "0xFFFFFFFFFFFFF",
    nonce: 3,
    sender_address: test_accounts[0].contract_address,
    private_key: test_accounts[0].private_key,
  };
  const invoke_transaction =
    create_invoke_transaction_v1_from_calls(invocation_data);
  const estimateFeeResponse = await rpc.starknet_estimateFee({
    block_id: "pending",
    request: [invoke_transaction],
    simulation_flags: [],
    // simulation_flags: ["SKIP_VALIDATE"],
    // TODO fix starknet-io/type-js or katana ? seems to be mandatory field
    // TODO wehn using "SKIP_VALIDATE" as simulation_flags element, the estimated fee is off
    // but katana do not reject the tx with that fee, and instead drop the tx at a later stage
    // this result in `waitForTransaction` to hang forever
  });

  if (!estimateFeeResponse.success) {
    console.error(estimateFeeResponse.error);
  }
  assert(estimateFeeResponse.success);

  const invokeResponse = await rpc.starknet_addInvokeTransaction({
    invoke_transaction: create_invoke_transaction_v1_from_calls({
      ...invocation_data,
      max_fee: estimateFeeResponse.value[0].overall_fee,
    }),
  });
  if (!invokeResponse.success) {
    console.error(invokeResponse.error);
  }
  expect(invokeResponse.success).to.be.true;

  assert(invokeResponse.success);
  let receipt = await waitForTransaction(
    rpc,
    invokeResponse.value.transaction_hash
  );

  if (receipt.execution_status !== "SUCCEEDED") {
    console.error(receipt);
  }
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
    max_fee: "0xFFFFFFFFFFFFF",
    nonce: 4,
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
