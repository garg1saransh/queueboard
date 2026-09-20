import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";
import { JOB_QUEUE_NAME, type QueueJobPayload } from "@/lib/types";

const globalForQueue = globalThis as typeof globalThis & {
  jobQueue?: Queue<QueueJobPayload>;
};

export function getJobQueue(): Queue<QueueJobPayload> {
  if (!globalForQueue.jobQueue) {
    globalForQueue.jobQueue = new Queue<QueueJobPayload>(JOB_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        // Infrastructure retries only. Business failures are recorded in Postgres
        // and complete the BullMQ job successfully (see worker processor).
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }

  return globalForQueue.jobQueue;
}

export async function enqueueJobItems(jobItemIds: string[]): Promise<void> {
  if (jobItemIds.length === 0) {
    return;
  }

  const queue = getJobQueue();
  await queue.addBulk(
    jobItemIds.map((jobItemId) => ({
      name: "process-job-item",
      data: { jobItemId },
      opts: {
        // BullMQ custom ids cannot contain ':'
        jobId: `job-item-${jobItemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    })),
  );
}

export async function enqueueJobItem(jobItemId: string): Promise<void> {
  await enqueueJobItems([jobItemId]);
}
