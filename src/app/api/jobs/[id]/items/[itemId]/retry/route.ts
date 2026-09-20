import { jobIdSchema, jobItemIdSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation";
import { jsonError, jsonOk } from "@/lib/http";
import { retryJobItem } from "@/server/services/job-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id, itemId } = await context.params;
    const jobId = parseOrThrow(jobIdSchema, id);
    const parsedItemId = parseOrThrow(jobItemIdSchema, itemId);
    const result = await retryJobItem(jobId, parsedItemId);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "Failed to retry job item");
  }
}
