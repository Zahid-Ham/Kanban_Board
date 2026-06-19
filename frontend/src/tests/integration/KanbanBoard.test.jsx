/**
 * tests/integration/KanbanBoard.test.jsx
 * Integration tests for the KanbanBoard component.
 * Mocks Socket.IO so no real network connection is needed.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KanbanBoard from "../../components/KanbanBoard";

// ─── Mock Socket.IO client ────────────────────────────────────────────────────
let mockSocketListeners = {};
let mockSocket;

const createMockSocket = () => {
  mockSocketListeners = {};
  mockSocket = {
    connected: true,
    id: "test-socket-id",
    on: vi.fn((event, handler) => {
      mockSocketListeners[event] = handler;
    }),
    off: vi.fn(),
    emit: vi.fn((event, data, ack) => {
      if (typeof ack === "function") ack({ success: true });
    }),
    disconnect: vi.fn(),
  };
  return mockSocket;
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => createMockSocket()),
}));

// ─── Mock @hello-pangea/dnd to avoid DOM issues in jsdom ─────────────────────
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => <div data-testid="dnd-context">{children}</div>,
  Droppable: ({ children, droppableId }) =>
    children(
      {
        innerRef: vi.fn(),
        droppableProps: { "data-droppable": droppableId },
        placeholder: null,
      },
      { isDraggingOver: false }
    ),
  Draggable: ({ children, draggableId, index }) =>
    children(
      {
        innerRef: vi.fn(),
        draggableProps: { "data-draggable": draggableId },
        dragHandleProps: {},
      },
      { isDragging: false }
    ),
}));

// ─── Mock Recharts to avoid SVG rendering issues ──────────────────────────────
vi.mock("recharts", () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart-mock">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart-mock">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}));

// ─── Helper: simulate sync:tasks from server ─────────────────────────────────
const simulateSyncTasks = (tasks = []) => {
  act(() => {
    if (mockSocketListeners["sync:tasks"]) {
      mockSocketListeners["sync:tasks"](tasks);
    }
  });
};

const simulateTaskCreated = (task) => {
  act(() => {
    if (mockSocketListeners["task:created"]) {
      mockSocketListeners["task:created"](task);
    }
  });
};

const simulateTaskDeleted = (id) => {
  act(() => {
    if (mockSocketListeners["task:deleted"]) {
      mockSocketListeners["task:deleted"]({ id });
    }
  });
};

const simulateConnect = () => {
  act(() => {
    if (mockSocketListeners["connect"]) {
      mockSocketListeners["connect"]();
    }
  });
};

// ─── Sample tasks ─────────────────────────────────────────────────────────────
const sampleTask = {
  id: "task-001",
  title: "Fix Login Bug",
  description: "Users are being logged out.",
  column: "todo",
  priority: "high",
  category: "bug",
  attachments: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("KanbanBoard Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the board after syncing tasks", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });
  });

  it("renders 3 kanban columns", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => {
      const columns = screen.getAllByTestId("kanban-column");
      expect(columns).toHaveLength(3);
    });
  });

  it("displays column titles: To Do, In Progress, Done", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => {
      const titles = screen.getAllByTestId("column-title").map((el) => el.textContent.trim());
      expect(titles).toContain("To Do");
      expect(titles).toContain("In Progress");
      expect(titles).toContain("Done");
    });
  });

  it("shows task card after receiving task:created event", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => screen.getByTestId("kanban-board"));

    simulateTaskCreated(sampleTask);

    await waitFor(() => {
      expect(screen.getByText("Fix Login Bug")).toBeInTheDocument();
    });
  });

  it("removes task card after receiving task:deleted event", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([sampleTask]);

    await waitFor(() => {
      expect(screen.getByText("Fix Login Bug")).toBeInTheDocument();
    });

    simulateTaskDeleted(sampleTask.id);

    await waitFor(() => {
      expect(screen.queryByText("Fix Login Bug")).not.toBeInTheDocument();
    });
  });

  it("shows connection status indicator", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => {
      expect(screen.getByTestId("connection-status")).toBeInTheDocument();
    });
  });

  it("shows Add Task button", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => {
      expect(screen.getByTestId("add-task-btn")).toBeInTheDocument();
    });
  });

  it("opens modal when Add Task button is clicked", async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => screen.getByTestId("add-task-btn"));

    await user.click(screen.getByTestId("add-task-btn"));

    expect(screen.getByTestId("task-modal")).toBeInTheDocument();
    expect(screen.getByTestId("task-title-input")).toBeInTheDocument();
  });

  it("closes modal when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => screen.getByTestId("add-task-btn"));
    await user.click(screen.getByTestId("add-task-btn"));
    await user.click(screen.getByTestId("modal-cancel"));

    expect(screen.queryByTestId("task-modal")).not.toBeInTheDocument();
  });

  it("shows form validation error when submitting empty title", async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([]);

    await waitFor(() => screen.getByTestId("add-task-btn"));
    await user.click(screen.getByTestId("add-task-btn"));
    await user.click(screen.getByTestId("modal-submit"));

    expect(screen.getByTestId("form-error")).toBeInTheDocument();
  });

  it("displays task progress chart", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([sampleTask]);

    await waitFor(() => {
      expect(screen.getByTestId("task-progress-chart")).toBeInTheDocument();
    });
  });

  it("shows correct task count in chart stats", async () => {
    render(<KanbanBoard />);
    simulateConnect();
    simulateSyncTasks([sampleTask]);

    await waitFor(() => {
      expect(screen.getByTestId("stat-total")).toHaveTextContent("1");
    });
  });
});
