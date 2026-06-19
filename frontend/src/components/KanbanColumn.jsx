/**
 * components/KanbanColumn.jsx
 * A droppable Kanban column that renders a list of TaskCards.
 * Displays column header with task count and an "Add Task" shortcut.
 */

import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";

/** Column accent colors */
const COLUMN_COLORS = {
  todo: "#6366f1",
  inprogress: "#f59e0b",
  done: "#10b981",
};

/** Column icons */
const COLUMN_ICONS = {
  todo: "📋",
  inprogress: "🔄",
  done: "✅",
};

/**
 * @param {{
 *   column: { id: string, label: string },
 *   tasks: Object[],
 *   onEditTask: (task: Object) => void,
 *   onDeleteTask: (id: string) => void,
 *   onAddTask: (columnId: string) => void
 * }} props
 */
function KanbanColumn({ column, tasks, onEditTask, onDeleteTask, onAddTask }) {
  const color = COLUMN_COLORS[column.id] || "#6366f1";
  const icon = COLUMN_ICONS[column.id] || "📋";

  return (
    <div
      className="kanban-column"
      data-testid="kanban-column"
      data-column-id={column.id}
      style={{ "--column-color": color }}
    >
      {/* Column Header */}
      <div className="column-header">
        <div className="column-header-left">
          <span className="column-icon" aria-hidden="true">{icon}</span>
          <h2 className="column-title" data-testid="column-title">
            {column.label}
          </h2>
          <span
            className="column-count"
            style={{ background: color + "33", color }}
            data-testid="column-count"
          >
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          className="column-add-btn"
          onClick={() => onAddTask(column.id)}
          aria-label={`Add task to ${column.label}`}
          data-testid="column-add-btn"
          title={`Add task to ${column.label}`}
        >
          +
        </button>
      </div>

      {/* Droppable Task List */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`task-list ${snapshot.isDraggingOver ? "drag-over" : ""}`}
            data-testid="task-list"
            style={
              snapshot.isDraggingOver
                ? { background: color + "15", borderColor: color + "40" }
                : {}
            }
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
            {provided.placeholder}
            {tasks.length === 0 && (
              <div className="empty-column" data-testid="empty-column">
                <span className="empty-icon" aria-hidden="true">📭</span>
                <span>No tasks yet</span>
                <span className="empty-hint">Drop here or click + to add</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default KanbanColumn;
