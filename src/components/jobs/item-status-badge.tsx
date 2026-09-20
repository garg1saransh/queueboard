import type { JobItemStatus } from "@prisma/client";

const STATUS_STYLES: Record<JobItemStatus, string> = {
  PENDING: "border-border bg-surface-muted text-foreground/65",
  PROCESSING: "border-info/20 bg-info/10 text-info",
  COMPLETED: "border-success/20 bg-success/10 text-success",
  FAILED: "border-danger/20 bg-danger/10 text-danger",
};

export function ItemStatusBadge({ status }: { status: JobItemStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
