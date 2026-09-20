import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { publishJobItemUpdated, publishJobUpdated } from "@/lib/events";
import { mapJobDetail, mapJobItem, mapJobSummary } from "@/lib/mappers";
import { enqueueJobItem, enqueueJobItems } from "@/lib/queue";
import type { CreateJobInput, JobDetail, JobItemView, JobSummary } from "@/lib/types";
import {
  countItemsByStatus,
  createJobWithItems,
  findJobItem,
  findJobWithItems,
  resetFailedItemForRetry,
} from "@/server/repositories/job-repository";

function summaryFromCounts(
  job: Parameters<typeof mapJobSummary>[0],
  counts: Awaited<ReturnType<typeof countItemsByStatus>>,
): JobSummary {
  return mapJobSummary(job, {
    pendingCount: counts.PENDING,
    processingCount: counts.PROCESSING,
  });
}

export async function createJob(input: CreateJobInput): Promise<JobDetail> {
  const job = await createJobWithItems(input.count);
  const itemIds = job.items.map((item) => item.id);

  try {
    await enqueueJobItems(itemIds);
  } catch (error) {
    console.error("[jobs] failed to enqueue items after create", {
      jobId: job.id,
      error,
    });
    throw new AppError(
      "Job was created but queueing failed. Items remain PENDING and can be recovered by retrying the worker/queue.",
      { code: "QUEUE_ENQUEUE_FAILED", status: 503 },
    );
  }

  // Mark parent as processing once work is on the queue.
  const updated = await prisma.job.update({
    where: { id: job.id },
    data: { status: "PROCESSING" },
    include: { items: { orderBy: { itemNumber: "asc" } } },
  });

  return mapJobDetail(updated, {
    pendingCount: updated.totalCount,
    processingCount: 0,
  });
}

export async function getJob(jobId: string): Promise<JobDetail> {
  const job = await findJobWithItems(jobId);
  if (!job) {
    throw new AppError("Job not found", {
      code: "JOB_NOT_FOUND",
      status: 404,
    });
  }

  const counts = await countItemsByStatus(jobId);
  return mapJobDetail(job, {
    pendingCount: counts.PENDING,
    processingCount: counts.PROCESSING,
  });
}

export async function retryJobItem(
  jobId: string,
  itemId: string,
): Promise<{ item: JobItemView; job: JobSummary }> {
  const existing = await findJobItem(jobId, itemId);
  if (!existing) {
    throw new AppError("Job item not found for this job", {
      code: "JOB_ITEM_NOT_FOUND",
      status: 404,
    });
  }

  let reset;
  try {
    reset = await resetFailedItemForRetry(jobId, itemId);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    ) {
      const code = (error as { code: string }).code;
      const status =
        "status" in error && typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : 409;
      throw new AppError(error.message, { code, status });
    }
    throw error;
  }

  if (!reset) {
    throw new AppError("Job item not found for this job", {
      code: "JOB_ITEM_NOT_FOUND",
      status: 404,
    });
  }

  try {
    await enqueueJobItem(reset.item.id);
  } catch (error) {
    console.error("[jobs] failed to enqueue retry", {
      jobId,
      itemId,
      error,
    });
    throw new AppError("Failed to enqueue retry", {
      code: "QUEUE_ENQUEUE_FAILED",
      status: 503,
    });
  }

  const itemView = mapJobItem(reset.item);
  const jobSummary = summaryFromCounts(reset.job, reset.counts);

  // DB is source of truth — publish only after successful enqueue + DB reset.
  await publishJobItemUpdated({ jobId, item: itemView });
  await publishJobUpdated({ job: jobSummary });

  return { item: itemView, job: jobSummary };
}
