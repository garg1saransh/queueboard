import type { JobStatus } from "@prisma/client";

const STATUS_STYLES: Record<JobStatus, string> = {
  PENDING: "border-white/20 bg-white/10 text-white/80",
  PROCESSING: "border-sky-300/30 bg-sky-400/15 text-sky-100",
  COMPLETED: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
  COMPLETED_WITH_ERRORS: "border-amber-300/30 bg-amber-400/15 text-amber-100",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  COMPLETED_WITH_ERRORS: "Completed with errors",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
