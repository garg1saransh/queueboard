import "dotenv/config";

import { startJobWorker } from "@/server/worker/start-worker";

async function main(): Promise<void> {
  const worker = startJobWorker();

  const shutdown = async (signal: string) => {
    console.info(`[worker] received ${signal}, shutting down`);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error: unknown) => {
  console.error("[worker] failed to start", error);
  process.exit(1);
});
