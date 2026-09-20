import type { JobStatus } from "@prisma/client";

/**
 * Parent job terminal status once all items are settled.
 * Returns null while work is still outstanding.
 */
export function resolveTerminalJobStatus(
  totalCount: number,
  completedCount: number,
  failedCount: number,
): JobStatus | null {
  if (completedCount + failedCount < totalCount) {
    return null;
  }

  return failedCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED";
}
