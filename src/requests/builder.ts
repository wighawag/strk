import { Contract } from "./common/index.js";
import { create_declare_transaction_intent_v2 } from "./v2/declare_transaction.js";

type BuildFunctions = {
  build_declare_transaction_intent_v2: typeof create_declare_transaction_intent_v2;
};

type BuilderWithChainIdAndAccountsAndContracts = {
  [P in keyof BuildFunctions]: Omit<
    P,
    "contract" | "chain_id" | "sender_address" | "private_key"
  > & { contract: string };
};

type BuilderWithChainIdAndAccount = {
  [P in keyof BuildFunctions]: Omit<
    P,
    "chain_id" | "sender_address" | "private_key"
  >;
} & {
  withContracts(
    contracts: Record<string, Contract>
  ): BuilderWithChainIdAndAccountsAndContracts;
};

type BuilderWithChainId = {
  [P in keyof BuildFunctions]: Omit<P, "chain_id">;
} & {
  withAccount(
    sender_address: string,
    private_key: string
  ): BuilderWithChainIdAndAccount;
};

type GenericBuilder = {
  withChainId(chainId: string): BuilderWithChainId;

  build_declare_transaction_intent_v2: typeof create_declare_transaction_intent_v2;
};

class Builder {
  constructor(
    private chain_id?: string,
    private sender_address?: string,
    private private_key?: string,
    private contracts: Record<string, Contract> = {}
  ) {}
  withChainId(chainId: string) {
    this.chain_id = chainId;
    return this; // as BuildWithAccount | BuilderWithChainIdAndAccount | BuildWithChainIdAndContracts | BuildWithAccountAndContracts | BuildWithChainIdAndAccountAndContracts
  }
  withAccount(sender_address: string, private_key: string) {
    this.sender_address = sender_address;
    this.private_key = private_key;
    return this; // as BuildWithAccount | BuilderWithChainIdAndAccount | BuildWithChainIdAndContracts | BuildWithAccountAndContracts | BuildWithChainIdAndAccountAndContracts
  }
  withContracts(contracts: Record<string, Contract>) {
    this.contracts = contracts;
    return this; // as BuildWithAccount | BuilderWithChainIdAndAccount | BuildWithChainIdAndContracts | BuildWithAccountAndContracts | BuildWithChainIdAndAccountAndContracts
  }

  build_declare_transaction_intent_v2(args: {
    max_fee: string;
    nonce: string;
    chain_id?: string;
    sender_address?: string;
    contract: Contract | string;
  }) {
    let chain_id = args.chain_id;
    if (!chain_id) {
      chain_id = this.chain_id;
    }
    if (!chain_id) {
      throw new Error(`no chain_id provided`);
    }

    let sender_address = args.sender_address;
    if (!sender_address) {
      sender_address = this.sender_address;
    }
    if (!sender_address) {
      throw new Error(`no sender_address provided`);
    }

    let contract =
      typeof args.contract === "string"
        ? this.contracts[args.contract]
        : args.contract;

    if (!contract) {
      throw new Error(`contract "${args.contract}" not registered`);
    }

    return create_declare_transaction_intent_v2({
      ...args,
      chain_id,
      sender_address,
      contract,
    });
  }
}

export function createBuilder(): GenericBuilder {
  return new Builder() as unknown as GenericBuilder;
}
