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

  // Free single-service hosts (e.g. Render Free) cannot run a separate worker.
  // When enabled, the BullMQ consumer runs in this same Node process.
  if (env.RUN_WORKER_IN_WEB) {
    const { startJobWorker } = await import("./src/server/worker/start-worker");
    const worker = startJobWorker();
    console.info("[web] BullMQ worker started in-process (RUN_WORKER_IN_WEB=true)");

    const shutdownWorker = async () => {
      await worker.close();
    };
    process.on("SIGINT", () => {
      void shutdownWorker();
    });
    process.on("SIGTERM", () => {
      void shutdownWorker();
    });
  }

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
