import { BigNumberish } from "starknet-core";
import { ResourceBounds } from "./types.js";
import { toHex } from "starknet-core/utils/num";

export const AToBI = (array: BigNumberish[]) =>
  array.map((it: BigNumberish) => BigInt(it));

export function toLowLevelResourceBound(resource_bounds: ResourceBounds) {
  return {
    l1_gas: {
      max_amount: toHex(resource_bounds.l1_gas.max_amount),
      max_price_per_unit: toHex(resource_bounds.l1_gas.max_price_per_unit),
    },
    l2_gas: {
      max_amount: toHex(resource_bounds.l2_gas.max_amount),
      max_price_per_unit: toHex(resource_bounds.l2_gas.max_price_per_unit),
    },
  };
}
