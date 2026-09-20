import type { Job, JobItem, JobItemStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveTerminalJobStatus } from "@/lib/job-status";

export type JobWithItems = Job & { items: JobItem[] };

export async function createJobWithItems(
  totalCount: number,
): Promise<JobWithItems> {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        totalCount,
        status: "PENDING",
      },
    });

    await tx.jobItem.createMany({
      data: Array.from({ length: totalCount }, (_, index) => ({
        jobId: job.id,
        itemNumber: index + 1,
        status: "PENDING" as const,
      })),
    });

    const created = await tx.job.findUniqueOrThrow({
      where: { id: job.id },
      include: {
        items: {
          orderBy: { itemNumber: "asc" },
        },
      },
    });

    return created;
  });
}

export async function findJobWithItems(
  jobId: string,
): Promise<JobWithItems | null> {
  return prisma.job.findUnique({
    where: { id: jobId },
    include: {
      items: {
        orderBy: { itemNumber: "asc" },
      },
    },
  });
}

export async function findJobItem(
  jobId: string,
  itemId: string,
): Promise<JobItem | null> {
  return prisma.jobItem.findFirst({
    where: {
      id: itemId,
      jobId,
    },
  });
}

export async function countItemsByStatus(
  jobId: string,
): Promise<Record<JobItemStatus, number>> {
  const groups = await prisma.jobItem.groupBy({
    by: ["status"],
    where: { jobId },
    _count: { _all: true },
  });

  const counts: Record<JobItemStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };

  for (const group of groups) {
    counts[group.status] = group._count._all;
  }

  return counts;
}

export async function markItemProcessing(
  jobItemId: string,
): Promise<JobItem | null> {
  const result = await prisma.jobItem.updateMany({
    where: {
      id: jobItemId,
      status: "PENDING",
    },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      attempts: { increment: 1 },
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.jobItem.findUnique({ where: { id: jobItemId } });
}

export async function completeItemSuccess(jobItemId: string): Promise<{
  item: JobItem;
  job: Job;
  counts: Record<JobItemStatus, number>;
}> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.jobItem.update({
      where: { id: jobItemId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        errorMessage: null,
      },
    });

    const job = await tx.job.update({
      where: { id: item.jobId },
      data: {
        completedCount: { increment: 1 },
        status: "PROCESSING",
      },
    });

    const finalized = await finalizeJobIfDone(tx, job.id);
    const counts = await groupCounts(tx, item.jobId);

    return {
      item,
      job: finalized,
      counts,
    };
  });
}

export async function completeItemFailure(
  jobItemId: string,
  errorMessage: string,
): Promise<{
  item: JobItem;
  job: Job;
  counts: Record<JobItemStatus, number>;
}> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.jobItem.update({
      where: { id: jobItemId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage,
      },
    });

    const job = await tx.job.update({
      where: { id: item.jobId },
      data: {
        failedCount: { increment: 1 },
        status: "PROCESSING",
      },
    });

    const finalized = await finalizeJobIfDone(tx, job.id);
    const counts = await groupCounts(tx, item.jobId);

    return {
      item,
      job: finalized,
      counts,
    };
  });
}

export async function resetFailedItemForRetry(
  jobId: string,
  itemId: string,
): Promise<{
  item: JobItem;
  job: Job;
  counts: Record<JobItemStatus, number>;
} | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.jobItem.findFirst({
      where: { id: itemId, jobId },
    });

    if (!existing) {
      return null;
    }

    if (existing.status !== "FAILED") {
      throw Object.assign(new Error("Item is not in FAILED status"), {
        code: "INVALID_RETRY_STATE",
        status: 409,
      });
    }

    const updated = await tx.jobItem.updateMany({
      where: {
        id: itemId,
        jobId,
        status: "FAILED",
      },
      data: {
        status: "PENDING",
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    if (updated.count === 0) {
      throw Object.assign(new Error("Item was already retried"), {
        code: "DUPLICATE_RETRY",
        status: 409,
      });
    }

    const job = await tx.job.update({
      where: { id: jobId },
      data: {
        failedCount: { decrement: 1 },
        status: "PROCESSING",
      },
    });

    const item = await tx.jobItem.findUniqueOrThrow({ where: { id: itemId } });
    const counts = await groupCounts(tx, jobId);

    return { item, job, counts };
  });
}

async function finalizeJobIfDone(
  tx: Prisma.TransactionClient,
  jobId: string,
): Promise<Job> {
  const job = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
  const nextStatus = resolveTerminalJobStatus(
    job.totalCount,
    job.completedCount,
    job.failedCount,
  );

  if (!nextStatus) {
    return job;
  }

  return tx.job.update({
    where: { id: jobId },
    data: { status: nextStatus },
  });
}

async function groupCounts(
  tx: Prisma.TransactionClient,
  jobId: string,
): Promise<Record<JobItemStatus, number>> {
  const groups = await tx.jobItem.groupBy({
    by: ["status"],
    where: { jobId },
    _count: { _all: true },
  });

  const counts: Record<JobItemStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };

  for (const group of groups) {
    counts[group.status] = group._count._all;
  }

  return counts;
}
