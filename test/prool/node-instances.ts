import { createKatanaServer } from "katana-rpc/prool";

export const poolId =
  Number(process.env.VITEST_POOL_ID ?? 1) *
    Number(process.env.VITEST_SHARD_ID ?? 1) +
  (process.env.VITE_NETWORK_TRANSPORT_MODE === "webSocket" ? 100 : 0);

export const KATANA_RPC_URL = `http://localhost:5051/${poolId}`;

export const wrangler = createKatanaServer({
  urlWithPoolId: KATANA_RPC_URL,
});
