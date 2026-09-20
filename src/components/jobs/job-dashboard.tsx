"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ItemsTable } from "@/components/jobs/items-table";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { ProgressBar } from "@/components/jobs/progress-bar";
import { SummaryCards } from "@/components/jobs/summary-cards";
import { useJobRealtime } from "@/components/jobs/use-job-realtime";
import type { JobDetail, JobItemView, JobSummary } from "@/lib/types";

type JobDashboardProps = {
  initialJob: JobDetail;
};

type RetryResponse = {
  item: JobItemView;
  job: JobSummary;
};

type ApiError = {
  error: {
    message: string;
  };
};

type ItemFilter = "all" | "failed" | "completed" | "active";

export function JobDashboard({ initialJob }: JobDashboardProps) {
  const { job, items, connectionState, setJob, setItems } =
    useJobRealtime(initialJob);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<ItemFilter>("all");

  async function handleRetry(itemId: string) {
    setError(null);
    setRetryingItemId(itemId);
    try {
      const response = await fetch(
        `/api/jobs/${job.id}/items/${itemId}/retry`,
        { method: "POST" },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        const apiError = body as ApiError;
        throw new Error(apiError.error?.message ?? "Retry failed");
      }

      const result = body as RetryResponse;
      setItems((current) =>
        current.map((item) => (item.id === result.item.id ? result.item : item)),
      );
      setJob(result.job);
    } catch (retryError) {
      setError(
        retryError instanceof Error ? retryError.message : "Retry failed",
      );
    } finally {
      setRetryingItemId(null);
    }
  }

  async function copyJobId() {
    try {
      await navigator.clipboard.writeText(job.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy batch ID");
    }
  }

  const liveLabel =
    connectionState === "connected"
      ? "Live"
      : connectionState === "connecting"
        ? "Connecting…"
        : "Offline";

  const successRate =
    job.totalCount === 0
      ? 0
      : Math.round((job.completedCount / job.totalCount) * 100);

  const filteredItems = useMemo(() => {
    switch (filter) {
      case "failed":
        return items.filter((item) => item.status === "FAILED");
      case "completed":
        return items.filter((item) => item.status === "COMPLETED");
      case "active":
        return items.filter(
          (item) => item.status === "PENDING" || item.status === "PROCESSING",
        );
      default:
        return items;
    }
  }, [filter, items]);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-x-10 top-2 -z-10 h-44 rounded-full bg-accent-bright/25 blur-3xl" />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="animate-fade-up space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#06101c] via-[#0b2f52] to-accent p-5 text-white shadow-[var(--shadow)]">
            <Link
              href="/"
              className="text-sm font-semibold text-accent-bright transition hover:text-white"
            >
              ← New batch
            </Link>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
              Batch console
            </h1>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-black/25 p-3">
              <p className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-white/75">
                {job.id}
              </p>
              <button
                type="button"
                onClick={() => void copyJobId()}
                className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/85 transition hover:bg-white/20"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <JobStatusBadge status={job.status} />
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  connectionState === "connected"
                    ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
                    : "border-white/20 bg-white/10 text-white/70"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    connectionState === "connected"
                      ? "animate-pulse-dot bg-emerald-300"
                      : "bg-white/50"
                  }`}
                />
                {liveLabel}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div
                className="relative grid h-16 w-16 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#34d399 ${successRate}%, rgba(255,255,255,0.15) 0)`,
                }}
                aria-label={`Success rate ${successRate}%`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#0a2744] text-xs font-semibold">
                  {successRate}%
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Success rate
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {job.completedCount} completed of {job.totalCount}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-white/55">
              Created {new Date(job.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-surface/90 p-4 shadow-sm backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
              Snapshot
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-foreground/55">Settled</dt>
                <dd className="font-semibold tabular-nums">
                  {job.completedCount + job.failedCount}/{job.totalCount}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground/55">Processing</dt>
                <dd className="font-semibold tabular-nums text-info">
                  {job.processingCount}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground/55">Failed</dt>
                <dd className="font-semibold tabular-nums text-danger">
                  {job.failedCount}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {error ? (
            <p
              className="rounded-2xl border border-danger/20 bg-danger/5 px-3.5 py-2.5 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="animate-fade-up-delay-1 space-y-5">
            <SummaryCards
              total={job.totalCount}
              pending={job.pendingCount}
              processing={job.processingCount}
              completed={job.completedCount}
              failed={job.failedCount}
            />
            <ProgressBar
              completed={job.completedCount}
              failed={job.failedCount}
              total={job.totalCount}
            />
          </div>

          <section className="animate-fade-up-delay-2 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
                  Items
                </h2>
                <p className="mt-1 text-sm text-foreground/50">
                  Showing {filteredItems.length} of {items.length}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/70 bg-surface/90 p-1">
                {(
                  [
                    ["all", "All"],
                    ["active", "Active"],
                    ["completed", "Done"],
                    ["failed", "Failed"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      filter === value
                        ? "bg-foreground text-white"
                        : "text-foreground/60 hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ItemsTable
              items={filteredItems}
              retryingItemId={retryingItemId}
              onRetry={handleRetry}
              emptyMessage={
                filter === "all"
                  ? "No items in this batch yet."
                  : "No items match this filter."
              }
            />
          </section>
        </div>
      </div>
    </div>
  );
}
