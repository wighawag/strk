export type KatanaMethods = {
  dev_generateBlock: {};
  dev_nextBlockTimestamp: { result: number };
  dev_increaseNextBlockTimestamp: { params: { amount: number } };
  dev_setNextBlockTimestamp: { params: { timestamp: number } };

  ///
  katana_predeployedAccounts: { result: unknown }; // TODO

  ///
  torii_getTransactions: { params: [unknown] }; // TODO
};
