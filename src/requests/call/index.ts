import { Call, Calldata, CallData, RawArgs } from "starknet-core";
import {
  BLOCK_ID,
  FUNCTION_CALL,
} from "../../starknet-types/api/components.js";
import { getSelectorFromName } from "starknet-core/utils/hash";

export function create_call(call: {
  block_id?: BLOCK_ID;
  contract_address: string;
  calldata?: string[];
  entry_point: string;
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
