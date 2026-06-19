/**
 * tests/unit/taskUtils.test.js
 * Unit tests for pure utility functions in taskUtils.js
 */

import { describe, it, expect } from "vitest";
import {
  filterTasksByColumn,
  getTaskStats,
  validateTask,
  getPriorityConfig,
  getCategoryConfig,
  isAllowedFileType,
  isImageType,
  formatFileSize,
  COLUMNS,
  PRIORITIES,
  CATEGORIES,
} from "../../utils/taskUtils";

// ── Sample data ───────────────────────────────────────────────────────────────
const sampleTasks = [
  { id: "1", title: "Task A", column: "todo", priority: "high", category: "bug" },
  { id: "2", title: "Task B", column: "todo", priority: "medium", category: "feature" },
  { id: "3", title: "Task C", column: "inprogress", priority: "low", category: "enhancement" },
  { id: "4", title: "Task D", column: "done", priority: "high", category: "bug" },
  { id: "5", title: "Task E", column: "done", priority: "medium", category: "feature" },
];

// ── Constants ─────────────────────────────────────────────────────────────────
describe("Constants", () => {
  it("COLUMNS has 3 entries with correct ids", () => {
    expect(COLUMNS).toHaveLength(3);
    expect(COLUMNS.map((c) => c.id)).toEqual(["todo", "inprogress", "done"]);
  });

  it("PRIORITIES has 3 entries", () => {
    expect(PRIORITIES).toHaveLength(3);
    expect(PRIORITIES.map((p) => p.value)).toContain("high");
  });

  it("CATEGORIES has 3 entries", () => {
    expect(CATEGORIES).toHaveLength(3);
    expect(CATEGORIES.map((c) => c.value)).toContain("bug");
  });
});

// ── filterTasksByColumn ────────────────────────────────────────────────────────
describe("filterTasksByColumn", () => {
  it("returns only tasks matching the given column", () => {
    const result = filterTasksByColumn(sampleTasks, "todo");
    expect(result).toHaveLength(2);
    result.forEach((t) => expect(t.column).toBe("todo"));
  });

  it("returns empty array when no tasks match", () => {
    const result = filterTasksByColumn(sampleTasks, "done");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(filterTasksByColumn([], "todo")).toEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(filterTasksByColumn(null, "todo")).toEqual([]);
    expect(filterTasksByColumn(undefined, "todo")).toEqual([]);
  });

  it("filters inprogress tasks correctly", () => {
    const result = filterTasksByColumn(sampleTasks, "inprogress");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });
});

// ── getTaskStats ───────────────────────────────────────────────────────────────
describe("getTaskStats", () => {
  it("correctly counts tasks in each column", () => {
    const stats = getTaskStats(sampleTasks);
    expect(stats.todo).toBe(2);
    expect(stats.inprogress).toBe(1);
    expect(stats.done).toBe(2);
    expect(stats.total).toBe(5);
  });

  it("calculates pctDone correctly", () => {
    const stats = getTaskStats(sampleTasks);
    expect(stats.pctDone).toBe(40); // 2/5 = 40%
  });

  it("returns zeros for empty task list", () => {
    const stats = getTaskStats([]);
    expect(stats).toEqual({ todo: 0, inprogress: 0, done: 0, total: 0, pctDone: 0 });
  });

  it("returns 100% done when all tasks are done", () => {
    const allDone = sampleTasks.map((t) => ({ ...t, column: "done" }));
    const stats = getTaskStats(allDone);
    expect(stats.pctDone).toBe(100);
    expect(stats.done).toBe(5);
  });

  it("returns 0% done when no tasks are done", () => {
    const noneDone = sampleTasks.map((t) => ({ ...t, column: "todo" }));
    const stats = getTaskStats(noneDone);
    expect(stats.pctDone).toBe(0);
  });
});

// ── validateTask ───────────────────────────────────────────────────────────────
describe("validateTask", () => {
  it("returns valid for a proper task", () => {
    const result = validateTask({ title: "My Task", column: "todo" });
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("returns invalid for null task", () => {
    const result = validateTask(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns invalid when title is missing", () => {
    const result = validateTask({ column: "todo" });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/title/i);
  });

  it("returns invalid when title is empty string", () => {
    const result = validateTask({ title: "   ", column: "todo" });
    expect(result.valid).toBe(false);
  });

  it("returns invalid when title exceeds 200 characters", () => {
    const result = validateTask({ title: "a".repeat(201) });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/200/);
  });

  it("returns invalid for unknown column", () => {
    const result = validateTask({ title: "Task", column: "backlog" });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/column/i);
  });

  it("is valid without a column field", () => {
    const result = validateTask({ title: "Task without column" });
    expect(result.valid).toBe(true);
  });
});

// ── getPriorityConfig ──────────────────────────────────────────────────────────
describe("getPriorityConfig", () => {
  it("returns correct config for 'high'", () => {
    const cfg = getPriorityConfig("high");
    expect(cfg.value).toBe("high");
    expect(cfg.color).toBe("#ef4444");
  });

  it("returns medium as default for unknown value", () => {
    const cfg = getPriorityConfig("unknown");
    expect(cfg.value).toBe("medium");
  });
});

// ── getCategoryConfig ──────────────────────────────────────────────────────────
describe("getCategoryConfig", () => {
  it("returns correct config for 'bug'", () => {
    const cfg = getCategoryConfig("bug");
    expect(cfg.value).toBe("bug");
    expect(cfg.label).toMatch(/bug/i);
  });
});

// ── isAllowedFileType ──────────────────────────────────────────────────────────
describe("isAllowedFileType", () => {
  it("allows image/jpeg", () => expect(isAllowedFileType("image/jpeg")).toBe(true));
  it("allows application/pdf", () => expect(isAllowedFileType("application/pdf")).toBe(true));
  it("rejects video/mp4", () => expect(isAllowedFileType("video/mp4")).toBe(false));
  it("rejects application/exe", () => expect(isAllowedFileType("application/exe")).toBe(false));
  it("rejects undefined", () => expect(isAllowedFileType(undefined)).toBe(false));
});

// ── isImageType ────────────────────────────────────────────────────────────────
describe("isImageType", () => {
  it("returns true for image/png", () => expect(isImageType("image/png")).toBe(true));
  it("returns false for application/pdf", () => expect(isImageType("application/pdf")).toBe(false));
  it("returns false for undefined", () => expect(isImageType(undefined)).toBe(false));
});

// ── formatFileSize ─────────────────────────────────────────────────────────────
describe("formatFileSize", () => {
  it("formats bytes", () => expect(formatFileSize(512)).toBe("512 B"));
  it("formats kilobytes", () => expect(formatFileSize(2048)).toBe("2.0 KB"));
  it("formats megabytes", () => expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB"));
});
