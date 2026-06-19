/**
 * components/KanbanBoard.jsx
 * Main Kanban board component. Orchestrates columns, drag-and-drop,
 * task modals, WebSocket connection, and the progress chart.
 */

import React, { useCallback, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useSocket } from "../hooks/useSocket";
import { useTasks } from "../hooks/useTasks";
import { COLUMNS, filterTasksByColumn } from "../utils/taskUtils";
import KanbanColumn from "./KanbanColumn";
import TaskModal from "./TaskModal";
import TaskProgressChart from "./TaskProgressChart";
import ConnectionStatus from "./ConnectionStatus";

/**
 * KanbanBoard is the top-level component for the board UI.
 * It wires together the WebSocket hooks, DnD context, and child components.
 */
function KanbanBoard() {
  const { socketRef, isConnected, connectionError } = useSocket();
  const { tasks, isLoading, createTask, updateTask, moveTask, deleteTask } = useTasks({
    socketRef,
  });

  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: "create",
    initialData: null,
  });

  // ── Modal Handlers ──────────────────────────────────────────────────────────
  const openCreateModal = useCallback((columnId = "todo") => {
    setModalState({
      isOpen: true,
      mode: "create",
      initialData: { column: columnId },
    });
  }, []);

  const openEditModal = useCallback((task) => {
    setModalState({ isOpen: true, mode: "edit", initialData: task });
  }, []);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // ── Task CRUD ───────────────────────────────────────────────────────────────
  const handleSubmitTask = useCallback(
    async (formData) => {
      if (modalState.mode === "edit") {
        return updateTask({ ...formData, id: modalState.initialData.id });
      } else {
        return createTask(formData);
      }
    },
    [modalState, createTask, updateTask]
  );

  const handleDeleteTask = useCallback(
    (id) => {
      deleteTask(id);
    },
    [deleteTask]
  );

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (result) => {
      const { draggableId, destination } = result;
      if (!destination) return; // Dropped outside a column

      const targetColumn = destination.droppableId;
      const task = tasks.find((t) => t.id === draggableId);
      if (!task || task.column === targetColumn) return; // No change

      moveTask(draggableId, targetColumn);
    },
    [tasks, moveTask]
  );

  // ── Loading State ───────────────────────────────────────────────────────────
  if (isLoading && !connectionError) {
    return (
      <div className="board-loading" data-testid="board-loading">
        <div className="loading-spinner" />
        <p>Connecting to Kanban server…</p>
      </div>
    );
  }

  return (
    <div className="kanban-board" data-testid="kanban-board">
      {/* Board Header */}
      <div className="board-header">
        <div className="board-header-left">
          <h1 className="board-title" data-testid="board-title">
            🗂️ Kanban Board
          </h1>
          <ConnectionStatus isConnected={isConnected} error={connectionError} />
        </div>
        <button
          type="button"
          className="btn btn-primary add-task-btn"
          onClick={() => openCreateModal()}
          data-testid="add-task-btn"
          aria-label="Add new task"
        >
          + New Task
        </button>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="connection-error-banner" role="alert" data-testid="connection-error">
          ⚠ {connectionError} — Changes may not be synced in real-time.
        </div>
      )}

      {/* Progress Chart */}
      <TaskProgressChart tasks={tasks} />

      {/* Kanban Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container" data-testid="columns-container">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={filterTasksByColumn(tasks, col.id)}
              onEditTask={openEditModal}
              onDeleteTask={handleDeleteTask}
              onAddTask={openCreateModal}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Task Modal */}
      <TaskModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.initialData}
        onClose={closeModal}
        onSubmit={handleSubmitTask}
      />
    </div>
  );
}

export default KanbanBoard;
