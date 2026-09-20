import { describe, expect, it } from "vitest";
import { createJobSchema, jobIdSchema, jobItemIdSchema } from "@/lib/validation";
import { resolveTerminalJobStatus } from "@/lib/job-status";

describe("createJobSchema", () => {
  it("accepts integers within range", () => {
    expect(createJobSchema.parse({ count: 1 })).toEqual({ count: 1 });
    expect(createJobSchema.parse({ count: "25" })).toEqual({ count: 25 });
    expect(createJobSchema.parse({ count: 100 })).toEqual({ count: 100 });
  });

  it("rejects invalid counts", () => {
    expect(() => createJobSchema.parse({ count: 0 })).toThrow();
    expect(() => createJobSchema.parse({ count: 101 })).toThrow();
    expect(() => createJobSchema.parse({ count: 1.5 })).toThrow();
    expect(() => createJobSchema.parse({ count: "abc" })).toThrow();
  });
});

describe("id schemas", () => {
  it("accepts cuid values", () => {
    const realistic = "cm1abc2de0000xyz123456789";
    expect(jobIdSchema.safeParse(realistic).success).toBe(true);
    expect(jobItemIdSchema.safeParse(realistic).success).toBe(true);
  });

  it("rejects empty and non-cuid ids", () => {
    expect(jobIdSchema.safeParse("").success).toBe(false);
    expect(jobIdSchema.safeParse("not-a-cuid").success).toBe(false);
    expect(jobIdSchema.safeParse("123").success).toBe(false);
  });
});

describe("resolveTerminalJobStatus", () => {
  it("returns null while items remain unsettled", () => {
    expect(resolveTerminalJobStatus(10, 3, 2)).toBeNull();
  });

  it("returns COMPLETED when all items succeed", () => {
    expect(resolveTerminalJobStatus(5, 5, 0)).toBe("COMPLETED");
  });

  it("returns COMPLETED_WITH_ERRORS when any item failed", () => {
    expect(resolveTerminalJobStatus(5, 4, 1)).toBe("COMPLETED_WITH_ERRORS");
    expect(resolveTerminalJobStatus(5, 0, 5)).toBe("COMPLETED_WITH_ERRORS");
  });
});
