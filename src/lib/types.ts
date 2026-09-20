import { z } from "zod";
import type { JobItemStatus, JobStatus } from "@prisma/client";

export const createJobSchema = z.object({
  count: z.coerce
    .number()
    .int("Count must be an integer")
    .min(1, "Count must be at least 1")
    .max(100, "Count must be at most 100"),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export const jobIdSchema = z.string().cuid("Invalid job ID");
export const jobItemIdSchema = z.string().cuid("Invalid job item ID");

export type JobSummary = {
  id: string;
  status: JobStatus;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  processingCount: number;
  createdAt: string;
  updatedAt: string;
};

export type JobItemView = {
  id: string;
  jobId: string;
  itemNumber: number;
  status: JobItemStatus;
  attempts: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobDetail = JobSummary & {
  items: JobItemView[];
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type JobItemUpdatedPayload = {
  jobId: string;
  item: JobItemView;
};

export type JobUpdatedPayload = {
  job: JobSummary;
};

export type ServerToClientEvents = {
  "job:item-updated": (payload: JobItemUpdatedPayload) => void;
  "job:updated": (payload: JobUpdatedPayload) => void;
};

export type ClientToServerEvents = {
  "job:subscribe": (jobId: string) => void;
  "job:unsubscribe": (jobId: string) => void;
};

export type InternalJobEvent =
  | { type: "job:item-updated"; payload: JobItemUpdatedPayload }
  | { type: "job:updated"; payload: JobUpdatedPayload };

export const JOB_EVENTS_CHANNEL = "job-events";
export const JOB_QUEUE_NAME = "job-processing";

export type QueueJobPayload = {
  jobItemId: string;
};
