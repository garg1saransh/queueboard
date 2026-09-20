import { jobIdSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation";
import { jsonError, jsonOk } from "@/lib/http";
import { getJob } from "@/server/services/job-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const jobId = parseOrThrow(jobIdSchema, id);
    const job = await getJob(jobId);
    return jsonOk(job);
  } catch (error) {
    return jsonError(error, "Failed to fetch job");
  }
}
