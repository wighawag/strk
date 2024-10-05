import { createServer } from "prool";
import { katana } from "prool-katana";
import { poolId } from ".";

export const main = defineKatana();

function defineKatana() {
  const rpcUrl = {
    http: `http://127.0.0.1:5051/${poolId}`,
  } as const;

  return {
    async restart() {
      await fetch(`${rpcUrl.http}/restart`);
    },
    async start() {
      return await createServer({
        instance: katana({ dev: true }),
        port: 5051,
      }).start();
    },
  } as const;
}