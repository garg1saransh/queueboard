import Link from "next/link";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#06101c]/92 text-white backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span
              aria-hidden
              className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent-bright via-accent to-cta shadow-lg shadow-sky-500/25 transition group-hover:scale-[1.03]"
            >
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-[#06101c]">
                Q
              </span>
            </span>
            <div className="leading-tight">
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                Queueboard
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">
                Batch console
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/65 sm:inline">
              Live progress · durable state
            </span>
            <Link
              href="/"
              className="rounded-full bg-gradient-to-r from-cta to-cta-dark px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition hover:brightness-110"
            >
              New batch
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="mt-auto border-t border-border/50 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-foreground/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold text-foreground/60">Queueboard</span>
          <span className="hidden sm:inline">
            Durable batches · live progress · item-level retry
          </span>
        </div>
      </footer>
    </div>
  );
}
