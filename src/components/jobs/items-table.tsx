"use client";

import { ItemStatusBadge } from "@/components/jobs/item-status-badge";
import type { JobItemView } from "@/lib/types";

type ItemsTableProps = {
  items: JobItemView[];
  retryingItemId: string | null;
  onRetry: (itemId: string) => void;
  emptyMessage?: string;
};

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString();
}

export function ItemsTable({
  items,
  retryingItemId,
  onRetry,
  emptyMessage = "No items in this batch yet.",
}: ItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-border bg-gradient-to-br from-surface to-surface-muted/60 px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground/70">
          Nothing to show
        </p>
        <p className="mt-1 text-sm text-foreground/45">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface/95 shadow-[var(--shadow)] backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/70 text-left text-sm">
          <thead className="bg-gradient-to-r from-surface-muted via-white to-accent/5 text-[11px] uppercase tracking-[0.12em] text-foreground/45">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Item</th>
              <th className="px-4 py-3.5 font-semibold">Status</th>
              <th className="px-4 py-3.5 font-semibold">Attempts</th>
              <th className="px-4 py-3.5 font-semibold">Started</th>
              <th className="px-4 py-3.5 font-semibold">Finished</th>
              <th className="px-4 py-3.5 font-semibold">Error</th>
              <th className="px-4 py-3.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/55">
            {items.map((item) => {
              const isRetrying = retryingItemId === item.id;
              return (
                <tr
                  key={item.id}
                  className="bg-surface transition-colors hover:bg-sky-50/80"
                >
                  <td className="px-4 py-3.5">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-surface-muted px-2 font-semibold tabular-nums text-foreground">
                      #{item.itemNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ItemStatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-foreground/70">
                    {item.attempts}
                  </td>
                  <td className="px-4 py-3.5 text-foreground/55">
                    {formatTime(item.startedAt)}
                  </td>
                  <td className="px-4 py-3.5 text-foreground/55">
                    {formatTime(item.completedAt)}
                  </td>
                  <td className="max-w-[14rem] truncate px-4 py-3.5 text-foreground/50">
                    {item.errorMessage ?? "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    {item.status === "FAILED" ? (
                      <button
                        type="button"
                        onClick={() => onRetry(item.id)}
                        disabled={isRetrying}
                        className="rounded-full bg-gradient-to-r from-cta to-cta-dark px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:brightness-110 disabled:opacity-55"
                      >
                        {isRetrying ? "Retrying…" : "Retry"}
                      </button>
                    ) : (
                      <span className="text-foreground/20">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
