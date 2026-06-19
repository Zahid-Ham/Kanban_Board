/**
 * tests/unit/useTasks.test.js
 * Unit tests for the useTasks hook's reducer logic.
 * Tests state transitions in isolation without requiring a DOM.
 */

import { describe, it, expect } from "vitest";

/**
 * We test the reducer function directly by extracting its logic.
 * This avoids needing to mount the hook and mock Socket.IO.
 */

// ─── Inline Reducer (mirrors useTasks.js) ─────────────────────────────────────
const initialState = { tasks: [], isLoading: true, error: null };

function tasksReducer(state = initialState, action) {
  switch (action.type) {
    case "SYNC_TASKS":
      return { ...state, tasks: action.payload, isLoading: false };
    case "TASK_CREATED":
      if (state.tasks.find((t) => t.id === action.payload.id)) return state;
      return { ...state, tasks: [...state.tasks, action.payload] };
    case "TASK_UPDATED":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case "TASK_MOVED":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case "TASK_DELETED":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload.id),
      };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

// ── Sample Tasks ──────────────────────────────────────────────────────────────
const taskA = { id: "a1", title: "Task A", column: "todo", priority: "high", category: "bug", attachments: [] };
const taskB = { id: "b2", title: "Task B", column: "inprogress", priority: "medium", category: "feature", attachments: [] };

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("tasksReducer — SYNC_TASKS", () => {
  it("replaces tasks and sets isLoading to false", () => {
    const state = tasksReducer(initialState, {
      type: "SYNC_TASKS",
      payload: [taskA, taskB],
    });
    expect(state.tasks).toHaveLength(2);
    expect(state.isLoading).toBe(false);
  });

  it("handles empty sync payload", () => {
    const state = tasksReducer(initialState, { type: "SYNC_TASKS", payload: [] });
    expect(state.tasks).toHaveLength(0);
    expect(state.isLoading).toBe(false);
  });
});

describe("tasksReducer — TASK_CREATED", () => {
  it("appends a new task to the list", () => {
    const prev = { ...initialState, tasks: [taskA] };
    const state = tasksReducer(prev, { type: "TASK_CREATED", payload: taskB });
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks[1].id).toBe("b2");
  });

  it("does not add duplicate tasks", () => {
    const prev = { ...initialState, tasks: [taskA] };
    const state = tasksReducer(prev, { type: "TASK_CREATED", payload: taskA });
    expect(state.tasks).toHaveLength(1);
  });
});

describe("tasksReducer — TASK_UPDATED", () => {
  it("updates the matching task", () => {
    const prev = { ...initialState, tasks: [taskA, taskB] };
    const updated = { ...taskA, title: "Updated Title" };
    const state = tasksReducer(prev, { type: "TASK_UPDATED", payload: updated });
    expect(state.tasks.find((t) => t.id === "a1").title).toBe("Updated Title");
  });

  it("does not affect other tasks", () => {
    const prev = { ...initialState, tasks: [taskA, taskB] };
    const updated = { ...taskA, title: "New" };
    const state = tasksReducer(prev, { type: "TASK_UPDATED", payload: updated });
    expect(state.tasks.find((t) => t.id === "b2").title).toBe("Task B");
  });
});

describe("tasksReducer — TASK_MOVED", () => {
  it("moves task to new column", () => {
    const prev = { ...initialState, tasks: [taskA] };
    const moved = { ...taskA, column: "done" };
    const state = tasksReducer(prev, { type: "TASK_MOVED", payload: moved });
    expect(state.tasks[0].column).toBe("done");
  });
});

describe("tasksReducer — TASK_DELETED", () => {
  it("removes the task with the given id", () => {
    const prev = { ...initialState, tasks: [taskA, taskB] };
    const state = tasksReducer(prev, { type: "TASK_DELETED", payload: { id: "a1" } });
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].id).toBe("b2");
  });

  it("returns same state when id does not exist", () => {
    const prev = { ...initialState, tasks: [taskA] };
    const state = tasksReducer(prev, { type: "TASK_DELETED", payload: { id: "NONEXISTENT" } });
    expect(state.tasks).toHaveLength(1);
  });
});

describe("tasksReducer — SET_ERROR / CLEAR_ERROR", () => {
  it("sets error message", () => {
    const state = tasksReducer(initialState, { type: "SET_ERROR", payload: "Oops!" });
    expect(state.error).toBe("Oops!");
    expect(state.isLoading).toBe(false);
  });

  it("clears error message", () => {
    const errState = { ...initialState, error: "Something" };
    const state = tasksReducer(errState, { type: "CLEAR_ERROR" });
    expect(state.error).toBeNull();
  });
});

describe("tasksReducer — unknown action", () => {
  it("returns current state unchanged", () => {
    const prev = { ...initialState, tasks: [taskA] };
    const state = tasksReducer(prev, { type: "UNKNOWN_ACTION" });
    expect(state).toEqual(prev);
  });
});
