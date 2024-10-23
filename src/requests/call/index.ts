import { Abi, Call, Calldata, CallData, RawArgs } from "starknet-core";
import {
  BLOCK_ID,
  FUNCTION_CALL,
} from "../../starknet-types/api/components.js";
import { getSelectorFromName } from "starknet-core/utils/hash";

export function create_call(call: {
  contract_address: string;
  entry_point: string;
  calldata?: string[];
  block_id?: BLOCK_ID;
}): {
  request: FUNCTION_CALL;
  block_id: BLOCK_ID;
} {
  return {
    block_id: call.block_id || "latest",
    request: {
      contract_address: call.contract_address,
      calldata: call.calldata || [],
      entry_point_selector: getSelectorFromName(call.entry_point),
    },
  };
}

export function create_call_with_abi(call: {
  abi: Abi;
  contract_address: string;
  entry_point: string;
  args?: any[];
  block_id?: BLOCK_ID;
}): {
  request: FUNCTION_CALL;
  block_id: BLOCK_ID;
} {
  const calldataParser = new CallData(call.abi);
  const calldata = calldataParser.compile(call.entry_point, call.args || []);
  return {
    block_id: call.block_id || "latest",
    request: {
      contract_address: call.contract_address,
      calldata,
      entry_point_selector: getSelectorFromName(call.entry_point),
    },
  };
}
