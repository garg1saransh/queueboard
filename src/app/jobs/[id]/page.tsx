import Link from "next/link";
import type { Metadata } from "next";
import { JobDashboard } from "@/components/jobs/job-dashboard";
import { isAppError } from "@/lib/errors";
import { getJob } from "@/server/services/job-service";
import type { JobDetail } from "@/lib/types";

type JobPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Batch",
};

async function loadJob(id: string): Promise<JobDetail | null> {
  try {
    return await getJob(id);
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      return null;
    }
    if (
      error instanceof Error &&
      "status" in error &&
      (error as { status?: number }).status === 400
    ) {
      return null;
    }
    throw error;
  }
}

function JobNotFound({ id }: { id: string }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-start gap-5 px-4 py-16 sm:px-6">
      <div className="w-full overflow-hidden rounded-[2rem] border border-border/70 bg-surface shadow-[var(--shadow)]">
        <div className="bg-gradient-to-r from-[#07111f] to-accent px-8 py-6 text-white">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Batch not found
          </h1>
        </div>
        <div className="p-8">
          <p className="text-foreground/65">
            Nothing matches{" "}
            <span className="rounded-lg bg-surface-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
              {id}
            </span>
            . It may have been removed, or the link is incorrect.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-gradient-to-r from-cta to-cta-dark px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-cta/25 transition hover:brightness-110"
          >
            Start a new batch
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  const job = await loadJob(id);

  if (!job) {
    return <JobNotFound id={id} />;
  }

  return <JobDashboard initialJob={job} />;
}
