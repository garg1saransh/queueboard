import "dotenv/config";

import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { getEnv } from "./src/lib/env";
import { initSocketServer } from "./src/lib/socket";

const env = getEnv();
const dev = env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = env.PORT;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main(): Promise<void> {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    void handle(req, res, parsedUrl);
  });

  initSocketServer(httpServer);

  httpServer.listen(port, hostname, () => {
    console.info(
      `[web] ready on http://${hostname}:${port} (${env.NODE_ENV})`,
    );
  });
}

main().catch((error: unknown) => {
  console.error("[web] failed to start", error);
  process.exit(1);
});
