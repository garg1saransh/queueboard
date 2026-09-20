import { z } from "zod";
import {
  createJobSchema,
  jobIdSchema,
  jobItemIdSchema,
} from "@/lib/types";

export { createJobSchema, jobIdSchema, jobItemIdSchema };

export function parseOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  code = "VALIDATION_ERROR",
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => issue.message)
      .join("; ");
    const error = new Error(message) as Error & {
      code: string;
      status: number;
      details: unknown;
    };
    error.code = code;
    error.status = 400;
    error.details = result.error.flatten();
    throw error;
  }
  return result.data;
}
