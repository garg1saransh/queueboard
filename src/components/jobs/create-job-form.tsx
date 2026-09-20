"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type CreateJobResponse = {
  id: string;
};

type ApiError = {
  error: {
    message: string;
  };
};

const PRESETS = [10, 25, 50, 100] as const;

export function CreateJobForm() {
  const router = useRouter();
  const [count, setCount] = useState("25");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedCount = useMemo(() => Number(count), [count]);
  const isValid =
    Number.isInteger(parsedCount) && parsedCount >= 1 && parsedCount <= 100;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isValid) {
      setError("Enter a whole number between 1 and 100.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parsedCount }),
      });

      const body: unknown = await response.json();
      if (!response.ok) {
        const apiError = body as ApiError;
        throw new Error(apiError.error?.message ?? "Could not start batch");
      }

      const job = body as CreateJobResponse;
      router.push(`/jobs/${job.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not start batch",
      );
      setIsSubmitting(false);
    }
  }

  function nudge(delta: number) {
    const next = Math.min(100, Math.max(1, (Number.isFinite(parsedCount) ? parsedCount : 1) + delta));
    setCount(String(next));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-3">
        <label
          htmlFor="count"
          className="block text-sm font-semibold text-foreground"
        >
          Items in batch
        </label>

        <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-surface-muted to-white p-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => nudge(-5)}
              disabled={isSubmitting}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-white text-lg font-semibold text-foreground/70 transition hover:border-accent/40 hover:text-accent-dark disabled:opacity-50"
              aria-label="Decrease by 5"
            >
              −
            </button>
            <div className="text-center">
              <p className="font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {Number.isFinite(parsedCount) ? parsedCount : "—"}
              </p>
              <p className="text-xs text-foreground/45">items queued</p>
            </div>
            <button
              type="button"
              onClick={() => nudge(5)}
              disabled={isSubmitting}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-white text-lg font-semibold text-foreground/70 transition hover:border-accent/40 hover:text-accent-dark disabled:opacity-50"
              aria-label="Increase by 5"
            >
              +
            </button>
          </div>

          <input
            id="count"
            name="count"
            type="range"
            min={1}
            max={100}
            value={Number.isFinite(parsedCount) ? parsedCount : 25}
            onChange={(event) => setCount(event.target.value)}
            className="mt-4 w-full accent-[var(--accent)]"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset) => {
            const selected = parsedCount === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setCount(String(preset))}
                disabled={isSubmitting}
                className={`rounded-2xl border px-2 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-transparent bg-gradient-to-r from-accent to-accent-dark text-white shadow-md shadow-sky-600/20"
                    : "border-border bg-white text-foreground/75 hover:border-accent/40 hover:text-accent-dark"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        <input
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(event) => setCount(event.target.value)}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
          disabled={isSubmitting}
          aria-label="Exact item count"
        />
      </div>

      {error ? (
        <p
          className="rounded-2xl border border-danger/20 bg-danger/5 px-3.5 py-2.5 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cta to-cta-dark px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition hover:brightness-110 disabled:opacity-55"
      >
        {isSubmitting ? "Starting batch…" : "Start batch"}
        <span
          aria-hidden
          className="transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </button>
    </form>
  );
}
