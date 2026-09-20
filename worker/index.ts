import "dotenv/config";

import { Worker } from "bullmq";
import { getEnv } from "@/lib/env";
import { getRedis } from "@/lib/redis";
import { JOB_QUEUE_NAME, type QueueJobPayload } from "@/lib/types";
import { processJobItem } from "@/server/services/job-processor";

async function main(): Promise<void> {
  const env = getEnv();
  console.info(`[worker] starting in ${env.NODE_ENV}`);

  const worker = new Worker<QueueJobPayload>(
    JOB_QUEUE_NAME,
    async (job) => {
      await processJobItem(job);
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    console.info("[worker] completed", {
      jobId: job.id,
      itemId: job.data.jobItemId,
    });
  });

  worker.on("failed", (job, error) => {
    console.error("[worker] failed", {
      jobId: job?.id,
      itemId: job?.data.jobItemId,
      error: error.message,
    });
  });

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
