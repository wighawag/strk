import {
  create_declare_transaction_intent_v2,
  create_declare_transaction_v2,
  create_invoke_transaction_v1_from_calls,
} from "strk";
import { Methods as StarknetMethods } from "@starknet-io/types-js";
import {
  KATANA_CHAIN_ID,
  test_accounts,
  UniversalDeployerContract,
} from "../katana.js";
import GreetingsRegistry from "../ts-artifacts/GreetingsRegistry.js";
import { createProxiedJSONRPC } from "remote-procedure-call";
import assert from "assert";
import { waitForTransaction } from "../utils.js";
import { formatSignature } from "starknet-core/utils/stark";
import { sign } from "@scure/starknet";

const rpc = createProxiedJSONRPC<StarknetMethods>("http://localhost:5050");

const nonceResponse = await rpc.starknet_getNonce({
  block_id: "pending",
  contract_address: test_accounts[0].contract_address,
});
assert(nonceResponse.success);
const nonce = nonceResponse.value;
console.log({ nonce });

const declaration_data = {
  chain_id: KATANA_CHAIN_ID,
  contract: GreetingsRegistry,
  max_fee: "0xFFFFFFFFFFFFFFFFFF",
  nonce,
  sender_address: test_accounts[0].contract_address,
};

const declare_transaction_for_estimate = create_declare_transaction_v2({
  ...declaration_data,
  private_key: test_accounts[0].private_key,
});

const estimateFeeResponse = await rpc.starknet_estimateFee({
  block_id: "latest",
  request: [declare_transaction_for_estimate],
  simulation_flags: [],
  //   simulation_flags: ["SKIP_VALIDATE"],
  // TODO fix starknet-io/type-js or katana ? seems to be mandatory field
  // TODO wehn using "SKIP_VALIDATE" as simulation_flags element, the estimated fee is off
  // but katana do not reject the tx with that fee, and instead drop the tx at a later stage
  // this result in `waitForTransaction` to hang forever
});

if (!estimateFeeResponse.success) {
  console.error(estimateFeeResponse.error);
}
assert(estimateFeeResponse.success || estimateFeeResponse.error.code == 41);

if (estimateFeeResponse.success) {
  console.log({ estimate: estimateFeeResponse.value });

  const declare_transaction = create_declare_transaction_v2({
    ...declaration_data,
    max_fee: estimateFeeResponse.value[0].overall_fee,
    private_key: test_accounts[0].private_key,
  });

  const declareResponse = await rpc.starknet_addDeclareTransaction({
    declare_transaction,
  });

  console.log(JSON.stringify(declareResponse));

  if (!declareResponse.success) {
    console.log(declareResponse.error);
  } else {
    console.log(declareResponse.value);
  }
  assert(declareResponse.success);
  let receipt = await waitForTransaction(
    rpc,
    declareResponse.value.transaction_hash,
    { checkIntervalInSeconds: 1 }
  );
  assert(receipt.execution_status == "SUCCEEDED");
} else {
  console.log(estimateFeeResponse.error);
}

// --------------

const nonce2Response = await rpc.starknet_getNonce({
  block_id: "pending",
  contract_address: test_accounts[0].contract_address,
});
assert(nonceResponse.success);
const nonce2 = nonceResponse.value;
console.log({ nonce });

const invoke_data = {
  chain_id: KATANA_CHAIN_ID,
  calls: [
    {
      //https://github.com/dojoengine/dojo/blob/main/crates/katana/contracts/universal_deployer.cairo
      contractAddress: UniversalDeployerContract.contract_address,
      entrypoint: "deployContract",
      calldata: [GreetingsRegistry.class_hash, 0, true, ["0x0"]],
    },
  ],
  max_fee: "0xFFFFFFFFFFFFFFFFFF",
  nonce: nonce2,
  sender_address: test_accounts[0].contract_address,
};

const invoke_transaction_for_estimate = create_invoke_transaction_v1_from_calls(
  {
    ...invoke_data,
    private_key: test_accounts[0].private_key,
  }
);

const inokeEstimateFeeResponse = await rpc.starknet_estimateFee({
  block_id: "latest",
  request: [invoke_transaction_for_estimate],
  simulation_flags: [],
  //   simulation_flags: ["SKIP_VALIDATE"],
  // TODO fix starknet-io/type-js or katana ? seems to be mandatory field
  // TODO wehn using "SKIP_VALIDATE" as simulation_flags element, the estimated fee is off
  // but katana do not reject the tx with that fee, and instead drop the tx at a later stage
  // this result in `waitForTransaction` to hang forever
});

if (!inokeEstimateFeeResponse.success) {
  console.error(inokeEstimateFeeResponse.error);
}
assert(inokeEstimateFeeResponse.success);

console.log({ estimate: inokeEstimateFeeResponse.value });

const invoke_transaction = create_invoke_transaction_v1_from_calls({
  ...invoke_data,
  max_fee: inokeEstimateFeeResponse.value[0].overall_fee,
  private_key: test_accounts[0].private_key,
});

const invokeResponse = await rpc.starknet_addInvokeTransaction({
  invoke_transaction,
});

console.log(JSON.stringify(invokeResponse));

if (!invokeResponse.success) {
  console.log(invokeResponse.error);
} else {
  console.log(invokeResponse.value);
}
assert(invokeResponse.success);
let receipt = await waitForTransaction(
  rpc,
  invokeResponse.value.transaction_hash,
  { checkIntervalInSeconds: 1 }
);
assert(receipt.execution_status == "SUCCEEDED");
console.log(receipt);
