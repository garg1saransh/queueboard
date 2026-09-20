import type { Job, JobItem } from "@prisma/client";
import type { JobDetail, JobItemView, JobSummary } from "@/lib/types";

type StatusCounts = {
  pendingCount: number;
  processingCount: number;
};

export function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export function mapJobItem(item: JobItem): JobItemView {
  return {
    id: item.id,
    jobId: item.jobId,
    itemNumber: item.itemNumber,
    status: item.status,
    attempts: item.attempts,
    errorMessage: item.errorMessage,
    startedAt: toIso(item.startedAt),
    completedAt: toIso(item.completedAt),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function mapJobSummary(
  job: Job,
  counts: StatusCounts,
): JobSummary {
  return {
    id: job.id,
    status: job.status,
    totalCount: job.totalCount,
    completedCount: job.completedCount,
    failedCount: job.failedCount,
    pendingCount: counts.pendingCount,
    processingCount: counts.processingCount,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export function mapJobDetail(
  job: Job & { items: JobItem[] },
  counts: StatusCounts,
): JobDetail {
  return {
    ...mapJobSummary(job, counts),
    items: job.items
      .slice()
      .sort((a, b) => a.itemNumber - b.itemNumber)
      .map(mapJobItem),
  };
}

export function countsFromItems(items: Pick<JobItem, "status">[]): StatusCounts {
  let pendingCount = 0;
  let processingCount = 0;

  for (const item of items) {
    if (item.status === "PENDING") pendingCount += 1;
    if (item.status === "PROCESSING") processingCount += 1;
  }

  return { pendingCount, processingCount };
}
