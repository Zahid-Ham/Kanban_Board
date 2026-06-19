/**
 * tests/integration/WebSocketIntegration.test.jsx
 * Integration test: WebSocket task sync with KanbanBoard.
 * This file replaces the original stub that tested for a non-existent text node.
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard";

// ─── Mock socket.io-client ────────────────────────────────────────────────────
let mockListeners = {};

const createMockSocket = () => {
  mockListeners = {};
  return {
    connected: true,
    id: "ws-int-id",
    on: vi.fn((event, handler) => { mockListeners[event] = handler; }),
    off: vi.fn(),
    emit: vi.fn((event, data, ack) => { if (typeof ack === "function") ack({ success: true }); }),
    disconnect: vi.fn(),
  };
};

vi.mock("socket.io-client", () => ({ io: vi.fn(() => createMockSocket()) }));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => <div>{children}</div>,
  Droppable: ({ children }) => children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
  Draggable: ({ children }) => children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null, XAxis: () => null, YAxis: () => null,
  CartesianGrid: () => null, Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null, Cell: () => null, Legend: () => null,
}));

describe("WebSocket Integration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders Kanban board after WebSocket connection", async () => {
    render(<KanbanBoard />);
    act(() => {
      if (mockListeners["connect"]) mockListeners["connect"]();
      if (mockListeners["sync:tasks"]) mockListeners["sync:tasks"]([]);
    });
    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });
  });

  it("WebSocket receives task update and renders it in the board", async () => {
    render(<KanbanBoard />);
    act(() => {
      if (mockListeners["connect"]) mockListeners["connect"]();
      if (mockListeners["sync:tasks"]) mockListeners["sync:tasks"]([]);
    });

    await waitFor(() => screen.getByTestId("kanban-board"));

    // Simulate a task arriving from the server
    act(() => {
      if (mockListeners["task:created"]) {
        mockListeners["task:created"]({
          id: "ws-int-001",
          title: "WebSocket Task Update",
          column: "todo",
          priority: "medium",
          category: "feature",
          attachments: [],
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText("WebSocket Task Update")).toBeInTheDocument();
    });
  });
});
