import { Worker } from "bullmq";
import { getEnv } from "@/lib/env";
import { getRedis } from "@/lib/redis";
import { JOB_QUEUE_NAME, type QueueJobPayload } from "@/lib/types";
import { processJobItem } from "@/server/services/job-processor";

export type JobWorker = Worker<QueueJobPayload>;

export function startJobWorker(): JobWorker {
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

  return worker;
}
