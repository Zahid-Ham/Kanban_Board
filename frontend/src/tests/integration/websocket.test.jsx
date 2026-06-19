/**
 * tests/integration/websocket.test.jsx
 * Integration tests verifying that user actions emit correct WebSocket events.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KanbanBoard from "../../components/KanbanBoard";

// ─── Mock Socket.IO ───────────────────────────────────────────────────────────
let mockSocketListeners = {};
let mockEmit;

const createMockSocket = () => {
  mockSocketListeners = {};
  mockEmit = vi.fn((event, data, ack) => {
    if (typeof ack === "function") ack({ success: true, task: { ...data, id: "new-id" } });
  });

  return {
    connected: true,
    id: "ws-test-id",
    on: vi.fn((event, handler) => {
      mockSocketListeners[event] = handler;
    }),
    off: vi.fn(),
    emit: mockEmit,
    disconnect: vi.fn(),
  };
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => createMockSocket()),
}));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => <div>{children}</div>,
  Droppable: ({ children }) =>
    children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
  Draggable: ({ children }) =>
    children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}));

const setupBoard = async () => {
  render(<KanbanBoard />);
  act(() => {
    if (mockSocketListeners["connect"]) mockSocketListeners["connect"]();
    if (mockSocketListeners["sync:tasks"]) mockSocketListeners["sync:tasks"]([]);
  });
  await waitFor(() => screen.getByTestId("kanban-board"));
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("WebSocket Event Emission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits task:create when user submits the create form", async () => {
    const user = userEvent.setup();
    await setupBoard();

    await user.click(screen.getByTestId("add-task-btn"));
    await user.type(screen.getByTestId("task-title-input"), "New WS Task");
    await user.click(screen.getByTestId("modal-submit"));

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith(
        "task:create",
        expect.objectContaining({ title: "New WS Task" }),
        expect.any(Function)
      );
    });
  });

  it("emits task:delete when user deletes a task", async () => {
    const user = userEvent.setup();
    const sampleTask = {
      id: "del-001",
      title: "Delete Me",
      column: "todo",
      priority: "low",
      category: "bug",
      attachments: [],
    };

    render(<KanbanBoard />);
    act(() => {
      if (mockSocketListeners["connect"]) mockSocketListeners["connect"]();
      if (mockSocketListeners["sync:tasks"]) mockSocketListeners["sync:tasks"]([sampleTask]);
    });

    await waitFor(() => screen.getByText("Delete Me"));

    // First click: shows confirmation
    const deleteBtn = screen.getByTestId("delete-task-btn");
    await user.click(deleteBtn);
    // Second click: confirms delete
    await user.click(screen.getByTestId("delete-task-btn"));

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith(
        "task:delete",
        expect.objectContaining({ id: "del-001" }),
        expect.any(Function)
      );
    });
  });

  it("sync:tasks listener populates task list from server", async () => {
    const tasks = [
      { id: "t1", title: "Synced Task", column: "todo", priority: "medium", category: "feature", attachments: [] },
    ];
    render(<KanbanBoard />);
    act(() => {
      if (mockSocketListeners["connect"]) mockSocketListeners["connect"]();
      if (mockSocketListeners["sync:tasks"]) mockSocketListeners["sync:tasks"](tasks);
    });

    await waitFor(() => {
      expect(screen.getByText("Synced Task")).toBeInTheDocument();
    });
  });

  it("task:created listener adds new task without page refresh", async () => {
    await setupBoard();

    act(() => {
      if (mockSocketListeners["task:created"]) {
        mockSocketListeners["task:created"]({
          id: "live-001",
          title: "Live Task From Another Tab",
          column: "inprogress",
          priority: "medium",
          category: "feature",
          attachments: [],
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText("Live Task From Another Tab")).toBeInTheDocument();
    });
  });

  it("task:updated listener updates existing task title", async () => {
    const original = {
      id: "upd-001",
      title: "Original Title",
      column: "todo",
      priority: "low",
      category: "feature",
      attachments: [],
    };
    render(<KanbanBoard />);
    act(() => {
      if (mockSocketListeners["connect"]) mockSocketListeners["connect"]();
      if (mockSocketListeners["sync:tasks"]) mockSocketListeners["sync:tasks"]([original]);
    });

    await waitFor(() => screen.getByText("Original Title"));

    act(() => {
      if (mockSocketListeners["task:updated"]) {
        mockSocketListeners["task:updated"]({ ...original, title: "Updated Title" });
      }
    });

    await waitFor(() => {
      expect(screen.queryByText("Original Title")).not.toBeInTheDocument();
      expect(screen.getByText("Updated Title")).toBeInTheDocument();
    });
  });
});
