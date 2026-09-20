import { createJobSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation";
import { jsonError, jsonOk } from "@/lib/http";
import { createJob } from "@/server/services/job-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = parseOrThrow(createJobSchema, body);
    const job = await createJob(input);
    return jsonOk(job, 201);
  } catch (error) {
    return jsonError(error, "Failed to create job");
  }
}
