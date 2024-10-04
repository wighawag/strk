import { CONTRACT_CLASS } from "../../starknet-types/api/components.js";

import { DeepReadonly } from "../../type-utils/index.js";

export type Contract = DeepReadonly<
  CONTRACT_CLASS & {
    class_hash: string;
    compiled_class_hash: string;
  }
>;
