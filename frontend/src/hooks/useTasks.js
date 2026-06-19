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

    case "TASK_MOVED": {
      const existing = state.tasks.find((t) => t.id === action.payload.id);
      if (existing && existing.column === action.payload.column) {
        return state;
      }
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    }

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
 * @param {{ socketRef: React.MutableRefObject }} param0
 * @returns {{ tasks, isLoading, error, createTask, updateTask, moveTask, deleteTask, clearError }}
 */
export function useTasks({ socketRef }) {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  // ── Register Socket Event Listeners ────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef?.current;
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
  }, [socketRef]);

  // ── Action Creators ────────────────────────────────────────────────────────
  /**
   * Creates a new task on the server.
   * @param {Object} taskData
   * @returns {Promise<{ success: boolean, task?: Object, error?: string }>}
   */
  const createTask = useCallback(
    (taskData) => {
      return new Promise((resolve) => {
        const socket = socketRef?.current;
        if (!socket?.connected) {
          resolve({ success: false, error: "Not connected to server." });
          return;
        }
        socket.emit("task:create", taskData, resolve);
      });
    },
    [socketRef]
  );

  /**
   * Updates an existing task on the server.
   * @param {Object} taskData - Must include `id`
   * @returns {Promise<{ success: boolean, task?: Object, error?: string }>}
   */
  const updateTask = useCallback(
    (taskData) => {
      return new Promise((resolve) => {
        const socket = socketRef?.current;
        if (!socket?.connected) {
          resolve({ success: false, error: "Not connected to server." });
          return;
        }
        socket.emit("task:update", taskData, resolve);
      });
    },
    [socketRef]
  );

  /**
   * Moves a task to a different column.
   * @param {string} id - Task ID
   * @param {string} column - Target column ID
   * @returns {Promise<{ success: boolean, task?: Object, error?: string }>}
   */
  const moveTask = useCallback(
    (id, column) => {
      const task = state.tasks.find((t) => t.id === id);
      if (task) {
        dispatch({
          type: "TASK_MOVED",
          payload: { ...task, column },
        });
      }

      return new Promise((resolve) => {
        const socket = socketRef?.current;
        if (!socket?.connected) {
          if (task) {
            dispatch({
              type: "TASK_MOVED",
              payload: task,
            });
          }
          resolve({ success: false, error: "Not connected to server." });
          return;
        }
        socket.emit("task:move", { id, column }, (response) => {
          if (!response || !response.success) {
            if (task) {
              dispatch({
                type: "TASK_MOVED",
                payload: task,
              });
            }
          }
          resolve(response);
        });
      });
    },
    [socketRef, state.tasks]
  );

  /**
   * Deletes a task by ID.
   * @param {string} id - Task ID
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  const deleteTask = useCallback(
    (id) => {
      return new Promise((resolve) => {
        const socket = socketRef?.current;
        if (!socket?.connected) {
          resolve({ success: false, error: "Not connected to server." });
          return;
        }
        socket.emit("task:delete", { id }, resolve);
      });
    },
    [socketRef]
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
