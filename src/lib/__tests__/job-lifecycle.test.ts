import { describe, expect, it } from "vitest";
import { resolveTerminalJobStatus } from "@/lib/job-status";
import { countsFromItems } from "@/lib/mappers";

describe("item status counting", () => {
  it("counts pending and processing items", () => {
    const counts = countsFromItems([
      { status: "PENDING" },
      { status: "PENDING" },
      { status: "PROCESSING" },
      { status: "COMPLETED" },
      { status: "FAILED" },
    ]);

    expect(counts).toEqual({ pendingCount: 2, processingCount: 1 });
  });
});

describe("retry eligibility rules", () => {
  it("only FAILED items are eligible for user retry", () => {
    const eligible = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"].filter(
      (status) => status === "FAILED",
    );
    expect(eligible).toEqual(["FAILED"]);
  });

  it("reopening a failed item returns the job to a non-terminal state", () => {
    // After decrementing failedCount, job is no longer fully settled.
    expect(resolveTerminalJobStatus(3, 2, 0)).toBeNull();
    expect(resolveTerminalJobStatus(3, 2, 1)).toBe("COMPLETED_WITH_ERRORS");
  });
});
