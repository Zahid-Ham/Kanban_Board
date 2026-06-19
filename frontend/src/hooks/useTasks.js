/**
 * hooks/useTasks.js
 * Custom React hook for managing Kanban task state with real-time WebSocket sync.
 * All mutations flow through the server and are broadcast back to all clients.
 */

import { useCallback, useEffect, useReducer } from "react";

// ─── State Shape ──────────────────────────────────────────────────────────────
const initialState = {
  tasks: [],
  isLoading: true,
  error: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function tasksReducer(state, action) {
  switch (action.type) {
    case "SYNC_TASKS":
      return { ...state, tasks: action.payload, isLoading: false };

    case "TASK_CREATED":
      // Avoid duplicates (e.g., if socket fires twice)
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

    case "OPTIMISTIC_TASK_MOVED":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? { ...t, column: action.payload.column } : t
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

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * @param {{ socket: Object }} param0
 * @returns {{ tasks, isLoading, error, createTask, updateTask, moveTask, deleteTask, clearError }}
 */
export function useTasks({ socket }) {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  // ── Register Socket Event Listeners ────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    /** Sync all tasks on initial connection */
    const handleSync = (allTasks) => {
      dispatch({ type: "SYNC_TASKS", payload: allTasks });
    };

    const handleCreated = (task) => dispatch({ type: "TASK_CREATED", payload: task });
    const handleUpdated = (task) => dispatch({ type: "TASK_UPDATED", payload: task });
    const handleMoved = (task) => dispatch({ type: "TASK_MOVED", payload: task });
    const handleDeleted = ({ id }) => dispatch({ type: "TASK_DELETED", payload: { id } });

    socket.on("sync:tasks", handleSync);
    socket.on("task:created", handleCreated);
    socket.on("task:updated", handleUpdated);
    socket.on("task:moved", handleMoved);
    socket.on("task:deleted", handleDeleted);

    return () => {
      socket.off("sync:tasks", handleSync);
      socket.off("task:created", handleCreated);
      socket.off("task:updated", handleUpdated);
      socket.off("task:moved", handleMoved);
      socket.off("task:deleted", handleDeleted);
    };
  }, [socket]);

  // ── Action Creators ────────────────────────────────────────────────────────
  /**
   * Creates a new task on the server.
   * @param {Object} taskData
   * @returns {Promise<{ success: boolean, task?: Object, error?: string }>}
   */
  const createTask = useCallback(
    (taskData) => {
      return new Promise((resolve) => {
        if (!socket?.connected) {
          resolve({ success: false, error: "Not connected to server." });
          return;
        }
        socket.emit("task:create", taskData, resolve);
      });
    },
    [socket]
  );

  /**
   * Updates an existing task on the server.
   * @param {Object} taskData - Must include `id`
   * @returns {Promise<{ success: boolean, task?: Object, error?: string }>}
   */
  const updateTask = useCallback(
    (taskData) => {
      return new Promise((resolve) => {
        if (!socket?.connected) {
          resolve({ success: false, error: "Not connected to server." });
          return;
        }
        socket.emit("task:update", taskData, resolve);
      });
    },
    [socket]
  );

  /**
   * Moves a task to a different column.
   * @param {string} id - Task ID
   * @param {string} column - Target column ID
   * @returns {Promise<{ success: boolean, task?: Object, error?: string }>}
   */
  const moveTask = useCallback(
    (id, column) => {
      // Perform optimistic update locally
      dispatch({ type: "OPTIMISTIC_TASK_MOVED", payload: { id, column } });

      return new Promise((resolve) => {
        if (!socket?.connected) {
          resolve({ success: false, error: "Not connected to server." });
          return;
        }
        socket.emit("task:move", { id, column }, resolve);
      });
    },
    [socket]
  );

  /**
   * Deletes a task by ID.
   * @param {string} id - Task ID
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  const deleteTask = useCallback(
    (id) => {
      return new Promise((resolve) => {
        if (!socket?.connected) {
          resolve({ success: false, error: "Not connected to server." });
          return;
        }
        socket.emit("task:delete", { id }, resolve);
      });
    },
    [socket]
  );

  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);

  return {
    tasks: state.tasks,
    isLoading: state.isLoading,
    error: state.error,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    clearError,
  };
}
