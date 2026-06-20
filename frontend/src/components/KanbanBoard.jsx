/**
 * components/KanbanBoard.jsx
 * Main Kanban board component. Orchestrates columns, drag-and-drop,
 * task modals, WebSocket connection, and the progress chart.
 *
 * Drag-and-drop design note:
 * React 18+ uses automatic batching, which means state updates inside
 * onDragEnd are not committed to the DOM until after the current task
 * completes. @hello-pangea/dnd needs the DOM to reflect the drop result
 * BEFORE it starts its drop animation, otherwise the animation clone gets
 * stuck and isDraggingOver never resets.
 *
 * Fix: wrap the displayTasks update in flushSync() so React commits the DOM
 * synchronously inside the onDragEnd callback. This is the documented fix
 * for @hello-pangea/dnd + React 18/19.
 */

import React, { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { DragDropContext } from "@hello-pangea/dnd";
import { useSocket } from "../hooks/useSocket";
import { useTasks } from "../hooks/useTasks";
import { COLUMNS, filterTasksByColumn } from "../utils/taskUtils";
import KanbanColumn from "./KanbanColumn";
import TaskModal from "./TaskModal";
import TaskDetailModal from "./TaskDetailModal";
import TaskProgressChart from "./TaskProgressChart";
import ConnectionStatus from "./ConnectionStatus";

/**
 * KanbanBoard is the top-level component for the board UI.
 * It wires together the WebSocket hooks, DnD context, and child components.
 */
function KanbanBoard() {
  const { socket, isConnected, connectionError } = useSocket();
  const { tasks, isLoading, createTask, updateTask, moveTask, deleteTask } = useTasks({
    socket,
  });

  /**
   * displayTasks — the single source of truth for rendering.
   *
   * Why a separate state?
   * @hello-pangea/dnd's internal cleanup (removing isDraggingOver highlight,
   * collapsing the placeholder space) happens synchronously inside the same
   * React batch as the onDragEnd call. If we update `tasks` through a socket
   * roundtrip (async), the library finishes its cleanup BEFORE our data changes,
   * leaving the old column layout in the DOM → the "stuck" blue border / ghost
   * space bug.
   *
   * By updating displayTasks synchronously in onDragEnd, React batches our
   * state change WITH the library's cleanup into one paint — no stuck state.
   */
  const [displayTasks, setDisplayTasks] = useState([]);

  // Keep displayTasks in sync with authoritative server state.
  // This handles: initial load, task creates/deletes from any client,
  // and the server's confirmation of our own move (idempotent, no flash).
  useEffect(() => {
    setDisplayTasks(tasks);
  }, [tasks]);

  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: "create",
    initialData: null,
  });

  const [detailModalState, setDetailModalState] = useState({
    isOpen: false,
    task: null,
  });

  // Get dynamic updated reference of the currently viewed task for real-time WebSocket sync
  const activeDetailTask = displayTasks.find((t) => t.id === detailModalState.task?.id) || detailModalState.task;

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

  const openDetailModal = useCallback((task) => {
    setDetailModalState({ isOpen: true, task });
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailModalState({ isOpen: false, task: null });
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
      const { draggableId, destination, source } = result;

      // Dropped outside any droppable
      if (!destination) return;

      const targetColumn = destination.droppableId;
      const sourceColumn = source.droppableId;

      // Dropped back in the same column — nothing to do
      if (targetColumn === sourceColumn) return;

      // ── THE FIX: flushSync ────────────────────────────────────────────────
      // React 18+ automatically batches state updates, meaning setDisplayTasks
      // would NOT be committed to the DOM until AFTER the current JS task
      // completes. But @hello-pangea/dnd starts its drop animation immediately
      // after onDragEnd returns, reading DOM positions to calculate the
      // animation path. If the DOM hasn't been updated yet (card still in old
      // column), the animation target is wrong and the drag clone gets "stuck".
      //
      // flushSync forces React to synchronously flush the update to the real
      // DOM BEFORE onDragEnd returns, so the library reads the correct DOM
      // layout and the animation plays correctly every time.
      flushSync(() => {
        setDisplayTasks((prev) =>
          prev.map((t) =>
            t.id === draggableId ? { ...t, column: targetColumn } : t
          )
        );
      });

      // Fire-and-forget: persist the move on the server.
      // The server echoes task:moved back; useEffect re-syncs displayTasks
      // from tasks — idempotent, no visible flash.
      moveTask(draggableId, targetColumn);
    },
    [moveTask]
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

      {/* Progress Chart — uses displayTasks for live count accuracy */}
      <TaskProgressChart tasks={displayTasks} />

      {/* Kanban Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container" data-testid="columns-container">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={filterTasksByColumn(displayTasks, col.id)}
              onEditTask={openEditModal}
              onDeleteTask={handleDeleteTask}
              onAddTask={openCreateModal}
              onViewTask={openDetailModal}
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

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={detailModalState.isOpen}
        task={activeDetailTask}
        onClose={closeDetailModal}
        onEdit={openEditModal}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}

export default KanbanBoard;
