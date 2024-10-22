import { BigNumberish } from "starknet-core";

export type EDAMode = "L1" | "L2";

export type ResourceBounds = {
  l1_gas: { max_amount: BigNumberish; max_price_per_unit: BigNumberish };
  l2_gas: { max_amount: BigNumberish; max_price_per_unit: BigNumberish };
};
