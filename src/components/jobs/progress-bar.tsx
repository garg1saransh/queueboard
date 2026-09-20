type ProgressBarProps = {
  completed: number;
  failed: number;
  total: number;
};

export function ProgressBar({ completed, failed, total }: ProgressBarProps) {
  const settled = completed + failed;
  const percent = total === 0 ? 0 : Math.round((settled / total) * 100);
  const successPercent = total === 0 ? 0 : (completed / total) * 100;
  const failedPercent = total === 0 ? 0 : (failed / total) * 100;
  const inProgress = settled < total;

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-surface via-surface to-accent/5 p-5 shadow-[var(--shadow)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground">
            Overall progress
          </p>
          <p className="mt-0.5 text-sm text-foreground/50">
            Settled items over total batch size
          </p>
        </div>
        <p className="bg-gradient-to-r from-accent to-cta bg-clip-text font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-transparent">
          {percent}
          <span className="text-lg text-foreground/35">%</span>
        </p>
      </div>

      <div
        className="relative h-4 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Batch progress"
      >
        <div className="flex h-full w-full">
          <div
            className="h-full bg-gradient-to-r from-success to-emerald-400 transition-[width] duration-500 ease-out"
            style={{ width: `${successPercent}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-danger to-rose-400 transition-[width] duration-500 ease-out"
            style={{ width: `${failedPercent}%` }}
          />
        </div>
        {inProgress ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
            style={{ animation: "progress-sheen 2.2s ease-in-out infinite" }}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-medium text-foreground/55">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" />
          Completed {completed}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" />
          Failed {failed}
        </span>
        <span className="ml-auto tabular-nums">
          {settled}/{total} settled
        </span>
      </div>
    </div>
  );
}
