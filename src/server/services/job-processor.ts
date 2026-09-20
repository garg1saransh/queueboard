import type { Job } from "bullmq";
import { getEnv } from "@/lib/env";
import { publishJobItemUpdated, publishJobUpdated } from "@/lib/events";
import { mapJobItem, mapJobSummary } from "@/lib/mappers";
import type { QueueJobPayload } from "@/lib/types";
import {
  completeItemFailure,
  completeItemSuccess,
  countItemsByStatus,
  markItemProcessing,
} from "@/server/repositories/job-repository";
import { prisma } from "@/lib/db";

function randomDelayMs(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function processJobItem(
  bullJob: Job<QueueJobPayload>,
): Promise<void> {
  const { jobItemId } = bullJob.data;
  const env = getEnv();

  const existing = await prisma.jobItem.findUnique({
    where: { id: jobItemId },
  });

  if (!existing) {
    console.warn("[worker] job item not found, acknowledging", { jobItemId });
    return;
  }

  if (existing.status === "COMPLETED") {
    console.info("[worker] skipping already completed item", { jobItemId });
    return;
  }

  if (existing.status === "FAILED") {
    // Failed items are only re-run via explicit user retry (reset to PENDING).
    console.info("[worker] skipping failed item without user retry", {
      jobItemId,
    });
    return;
  }

  const processing = await markItemProcessing(jobItemId);
  if (!processing) {
    console.info("[worker] item already claimed or not pending", { jobItemId });
    return;
  }

  const countsAfterStart = await countItemsByStatus(processing.jobId);
  const jobAfterStart = await prisma.job.findUniqueOrThrow({
    where: { id: processing.jobId },
  });

  if (jobAfterStart.status === "PENDING") {
    await prisma.job.update({
      where: { id: jobAfterStart.id },
      data: { status: "PROCESSING" },
    });
  }

  const latestJob = await prisma.job.findUniqueOrThrow({
    where: { id: processing.jobId },
  });

  await publishJobItemUpdated({
    jobId: processing.jobId,
    item: mapJobItem(processing),
  });
  await publishJobUpdated({
    job: mapJobSummary(latestJob, {
      pendingCount: countsAfterStart.PENDING,
      processingCount: countsAfterStart.PROCESSING,
    }),
  });

  const delay = randomDelayMs(env.JOB_MIN_DELAY_MS, env.JOB_MAX_DELAY_MS);
  await sleep(delay);

  const succeeded = Math.random() < env.JOB_SUCCESS_RATE;

  if (succeeded) {
    const result = await completeItemSuccess(jobItemId);
    await publishJobItemUpdated({
      jobId: result.item.jobId,
      item: mapJobItem(result.item),
    });
    await publishJobUpdated({
      job: mapJobSummary(result.job, {
        pendingCount: result.counts.PENDING,
        processingCount: result.counts.PROCESSING,
      }),
    });
    return;
  }

  const result = await completeItemFailure(
    jobItemId,
    "Item processing failed",
  );
  await publishJobItemUpdated({
    jobId: result.item.jobId,
    item: mapJobItem(result.item),
  });
  await publishJobUpdated({
    job: mapJobSummary(result.job, {
      pendingCount: result.counts.PENDING,
      processingCount: result.counts.PROCESSING,
    }),
  });
}
