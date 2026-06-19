/**
 * utils/taskUtils.js
 * Pure utility functions for task management.
 * Keeping these pure (no side effects) makes them easily testable.
 */

/** Available Kanban columns */
export const COLUMNS = [
  { id: "todo", label: "To Do", color: "#6366f1" },
  { id: "inprogress", label: "In Progress", color: "#f59e0b" },
  { id: "done", label: "Done", color: "#10b981" },
];

/** Task priority options */
export const PRIORITIES = [
  { value: "low", label: "Low", color: "#10b981" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high", label: "High", color: "#ef4444" },
];

/** Task category options */
export const CATEGORIES = [
  { value: "bug", label: "🐛 Bug", color: "#ef4444" },
  { value: "feature", label: "✨ Feature", color: "#6366f1" },
  { value: "enhancement", label: "⚡ Enhancement", color: "#f59e0b" },
];

/** Allowed file MIME types for uploads */
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Filters tasks array to only those belonging to the given column.
 * @param {Object[]} tasks - Array of task objects
 * @param {string} columnId - Column identifier (e.g., "todo")
 * @returns {Object[]} Filtered tasks
 */
export function filterTasksByColumn(tasks, columnId) {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter((task) => task.column === columnId);
}

/**
 * Computes aggregate statistics for a task list.
 * @param {Object[]} tasks - Array of task objects
 * @returns {{ todo: number, inprogress: number, done: number, total: number, pctDone: number }}
 */
export function getTaskStats(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { todo: 0, inprogress: 0, done: 0, total: 0, pctDone: 0 };
  }
  const todo = tasks.filter((t) => t.column === "todo").length;
  const inprogress = tasks.filter((t) => t.column === "inprogress").length;
  const done = tasks.filter((t) => t.column === "done").length;
  const total = tasks.length;
  const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;
  return { todo, inprogress, done, total, pctDone };
}

/**
 * Validates task input fields.
 * @param {Object} task
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateTask(task) {
  if (!task) return { valid: false, error: "Task is required." };
  if (!task.title || typeof task.title !== "string" || !task.title.trim()) {
    return { valid: false, error: "Task title is required." };
  }
  if (task.title.trim().length > 200) {
    return { valid: false, error: "Title must be 200 characters or fewer." };
  }
  const validColumns = COLUMNS.map((c) => c.id);
  if (task.column && !validColumns.includes(task.column)) {
    return { valid: false, error: `Invalid column: "${task.column}".` };
  }
  return { valid: true, error: null };
}

/**
 * Returns the priority config object for a given value.
 * @param {string} value - Priority value (e.g., "high")
 * @returns {Object}
 */
export function getPriorityConfig(value) {
  return PRIORITIES.find((p) => p.value === value) || PRIORITIES[1];
}

/**
 * Returns the category config object for a given value.
 * @param {string} value - Category value (e.g., "bug")
 * @returns {Object}
 */
export function getCategoryConfig(value) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[1];
}

/**
 * Checks if a file MIME type is allowed for upload.
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isAllowedFileType(mimeType) {
  return ALLOWED_FILE_TYPES.includes(mimeType);
}

/**
 * Checks if a MIME type represents an image.
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isImageType(mimeType) {
  return !!mimeType && mimeType.startsWith("image/");
}

/**
 * Formats a file size in bytes to a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
