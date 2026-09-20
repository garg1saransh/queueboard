import { NextResponse } from "next/server";
import { isAppError } from "@/lib/errors";
import type { ApiErrorBody } from "@/lib/types";

export function jsonOk<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function jsonError(
  error: unknown,
  fallbackMessage = "Internal server error",
): NextResponse<ApiErrorBody> {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  if (
    error instanceof Error &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    const status = (error as { status: number }).status;
    const code =
      "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "VALIDATION_ERROR";
    return NextResponse.json(
      {
        error: {
          code,
          message: error.message,
          details:
            "details" in error ? (error as { details?: unknown }).details : undefined,
        },
      },
      { status },
    );
  }

  console.error("[api]", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: fallbackMessage,
      },
    },
    { status: 500 },
  );
}
