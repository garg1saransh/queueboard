import { CreateJobForm } from "@/components/jobs/create-job-form";

function PipelineVisual() {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        How a batch moves
      </p>
      <div className="flex items-center justify-between gap-2 text-center text-[11px] font-semibold text-white/85 sm:text-xs">
        {["Enqueue", "Process", "Update", "Retry"].map((step, index) => (
          <div key={step} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded-xl border border-white/15 bg-black/20 px-2 py-2.5">
              <span className="mb-1 block text-[10px] font-medium text-accent-bright">
                0{index + 1}
              </span>
              {step}
            </div>
            {index < 3 ? (
              <span aria-hidden className="hidden text-accent-bright sm:inline">
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-drift absolute -left-24 top-6 h-80 w-80 rounded-full bg-accent-bright/35 blur-3xl" />
        <div className="animate-drift absolute -right-20 bottom-4 h-96 w-96 rounded-full bg-cta/20 blur-3xl [animation-delay:1.4s]" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-14">
        <div className="animate-fade-up relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#06101c] via-[#0a2744] to-[#0284c7] p-8 text-white shadow-[var(--shadow)] sm:p-10">
          <div className="pointer-events-none absolute -right-10 top-10 h-40 w-40 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 top-20 h-24 w-24 rounded-full border border-white/10" />

          <div>
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-bright">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-bright" />
              Queueboard
            </p>
            <h1 className="max-w-lg font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Batch work,
              <span className="mt-1 block bg-gradient-to-r from-accent-bright via-white to-orange-200 bg-clip-text text-transparent">
                tracked in real time.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
              Submit a batch, process every item in the background, and follow
              live totals, failures, and retries from one console.
            </p>
          </div>

          <PipelineVisual />
        </div>

        <div className="animate-fade-up-delay-1 flex">
          <div className="flex w-full flex-col justify-center rounded-[2rem] border border-white/80 bg-surface/95 p-7 shadow-[var(--shadow)] backdrop-blur-md sm:p-9">
            <div className="mb-7 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
                  Start a batch
                </h2>
                <span className="rounded-full bg-gradient-to-r from-accent/10 to-cta/10 px-3 py-1 text-xs font-semibold text-accent-dark">
                  1–100
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/55">
                Choose how many items to enqueue. You’ll open a live progress
                console for that batch.
              </p>
            </div>
            <CreateJobForm />
          </div>
        </div>
      </div>
    </section>
  );
}
