import { Abi } from "starknet-core";

export type CallWithABI = {
  abi: Abi;
  contractAddress: string;
  entrypoint: string;
  args?: any[];
};
