type SummaryCardsProps = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "danger" | "muted";
}) {
  const shell =
    tone === "info"
      ? "from-info/10 to-transparent"
      : tone === "success"
        ? "from-success/10 to-transparent"
        : tone === "danger"
          ? "from-danger/10 to-transparent"
          : tone === "muted"
            ? "from-foreground/5 to-transparent"
            : "from-accent/10 to-transparent";

  const valueClass =
    tone === "info"
      ? "text-info"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";

  return (
    <div
      className={`min-w-0 bg-gradient-to-br ${shell} px-4 py-4 sm:px-5`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
        {label}
      </p>
      <p
        className={`mt-1.5 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

export function SummaryCards({
  total,
  pending,
  processing,
  completed,
  failed,
}: SummaryCardsProps) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface/95 shadow-[var(--shadow)] backdrop-blur">
      <div className="grid grid-cols-2 divide-x divide-y divide-border/60 md:grid-cols-5 md:divide-y-0">
        <Metric label="Total" value={total} />
        <Metric label="Pending" value={pending} tone="muted" />
        <Metric label="Processing" value={processing} tone="info" />
        <Metric label="Completed" value={completed} tone="success" />
        <Metric label="Failed" value={failed} tone="danger" />
      </div>
    </div>
  );
}
