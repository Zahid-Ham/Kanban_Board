/**
 * components/TaskCard.jsx
 * An individual draggable Kanban task card.
 * Shows title, description preview, priority badge, category tag,
 * attachment count, and edit/delete actions.
 */

import React, { useState, useEffect, useRef } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { getPriorityConfig, getCategoryConfig } from "../utils/taskUtils";

/**
 * @param {{
 *   task: Object,
 *   index: number,
 *   onEdit: (task: Object) => void,
 *   onDelete: (id: string) => void,
 *   onView: (task: Object) => void
 * }} props
 */
function TaskCard({ task, index, onEdit, onDelete, onView }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLanded, setIsLanded] = useState(false);
  const prevColumnRef = useRef(task.column);

  const priority = getPriorityConfig(task.priority);
  const category = getCategoryConfig(task.category);

  // Trigger a landing animation if the task column changes
  useEffect(() => {
    if (prevColumnRef.current !== task.column) {
      setIsLanded(true);
      prevColumnRef.current = task.column;
      const timer = setTimeout(() => setIsLanded(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [task.column]);

  const handleDelete = () => {
    if (showConfirm) {
      onDelete(task.id);
    } else {
      setShowConfirm(true);
      // Auto-reset confirm after 3 seconds
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          onClick={() => onView && onView(task)}
          className={`task-card ${snapshot.isDragging ? "dragging" : ""} ${isLanded ? "landed-pulse" : ""}`}
          data-testid="task-card"
          data-task-id={task.id}
          aria-label={`Task: ${task.title}`}
        >
          {/* Priority accent bar */}
          <div
            className="task-priority-bar"
            style={{ background: priority.color }}
            aria-hidden="true"
          />

          {/* Card Body */}
          <div className="task-body">
            <h3 className="task-title" data-testid="task-title">
              {task.title}
            </h3>

            {task.description && (
              <p className="task-description" data-testid="task-description">
                {task.description.length > 100
                  ? task.description.slice(0, 100) + "…"
                  : task.description}
              </p>
            )}

            {/* Tags Row */}
            <div className="task-tags">
              <span
                className="task-priority-badge"
                style={{ color: priority.color, borderColor: priority.color }}
                data-testid="task-priority-badge"
              >
                {priority.label}
              </span>
              <span
                className="task-category-badge"
                data-testid="task-category-badge"
              >
                {category.label}
              </span>
              {task.attachments?.length > 0 && (
                <span className="task-attachment-badge" title={`${task.attachments.length} attachment(s)`}>
                  📎 {task.attachments.length}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="task-actions">
            <button
              type="button"
              className="task-action-btn edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              aria-label={`Edit task: ${task.title}`}
              data-testid="edit-task-btn"
            >
              ✏️
            </button>
            <button
              type="button"
              className={`task-action-btn delete-btn ${showConfirm ? "confirm" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              aria-label={showConfirm ? "Confirm delete" : `Delete task: ${task.title}`}
              data-testid="delete-task-btn"
              title={showConfirm ? "Click again to confirm" : "Delete task"}
            >
              {showConfirm ? "⚠" : "🗑️"}
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default TaskCard;
