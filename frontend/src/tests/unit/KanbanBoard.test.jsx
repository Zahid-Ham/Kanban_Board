/**
 * tests/unit/KanbanBoard.test.jsx
 * Unit tests for the KanbanBoard component's basic structure.
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
    id: "unit-socket-id",
    on: vi.fn((event, handler) => { mockListeners[event] = handler; }),
    off: vi.fn(),
    emit: vi.fn(),
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

const setupBoard = () => {
  act(() => {
    if (mockListeners["connect"]) mockListeners["connect"]();
    if (mockListeners["sync:tasks"]) mockListeners["sync:tasks"]([]);
  });
};

describe("KanbanBoard Unit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders Kanban board title", async () => {
    render(<KanbanBoard />);
    setupBoard();
    await waitFor(() => {
      // Board title contains "Kanban Board" (with emoji prefix)
      expect(screen.getByTestId("board-title")).toHaveTextContent("Kanban Board");
    });
  });

  it("renders 3 columns", async () => {
    render(<KanbanBoard />);
    setupBoard();
    await waitFor(() => {
      expect(screen.getAllByTestId("kanban-column")).toHaveLength(3);
    });
  });

  it("renders add task button", async () => {
    render(<KanbanBoard />);
    setupBoard();
    await waitFor(() => {
      expect(screen.getByTestId("add-task-btn")).toBeInTheDocument();
    });
  });
});
