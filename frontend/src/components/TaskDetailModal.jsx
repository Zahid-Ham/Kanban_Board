/**
 * components/TaskDetailModal.jsx
 * Modal dialog for viewing full details of a task and previewing attachments.
 */

import React, { useState } from "react";
import { getPriorityConfig, getCategoryConfig, isImageType, formatFileSize } from "../utils/taskUtils";

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   task: Object,
 *   onEdit: (task: Object) => void,
 *   onDelete: (id: string) => void
 * }} props
 */
function TaskDetailModal({ isOpen, onClose, task, onEdit, onDelete }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen || !task) return null;

  const priority = getPriorityConfig(task.priority);
  const category = getCategoryConfig(task.category);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleEditClick = () => {
    onClose();
    onEdit(task);
  };

  const handleDeleteClick = () => {
    if (showConfirm) {
      onDelete(task.id);
      onClose();
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  const getColumnName = (colId) => {
    switch (colId) {
      case "todo":
        return "To Do";
      case "inprogress":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return colId;
    }
  };

  return (
    <>
      <div
        className="modal-backdrop detail-modal-backdrop"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        data-testid="task-detail-modal"
      >
        <div className="modal-content detail-modal-content">
          {/* Header */}
          <div className="modal-header">
            <span className="detail-modal-tagline">Task Details</span>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close modal"
              data-testid="detail-modal-close"
            >
              ✕
            </button>
          </div>

          <div className="detail-modal-body">
            {/* Title */}
            <h2 id="detail-modal-title" className="detail-title">
              {task.title}
            </h2>

            {/* Badges and Info */}
            <div className="detail-info-row">
              <div className="detail-info-item">
                <span className="detail-info-label">Status</span>
                <span className={`detail-status-pill col-${task.column}`}>
                  {getColumnName(task.column)}
                </span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Priority</span>
                <span
                  className="detail-priority-pill"
                  style={{
                    color: priority.color,
                    borderColor: priority.color + "50",
                    background: priority.color + "15",
                  }}
                >
                  {priority.label}
                </span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Category</span>
                <span className="detail-category-pill">
                  {category.label}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="detail-section">
              <h4 className="detail-section-title">Description</h4>
              <div className="detail-description-box">
                {task.description ? (
                  <p className="detail-desc-text">{task.description}</p>
                ) : (
                  <p className="detail-desc-text empty">No description provided.</p>
                )}
              </div>
            </div>

            {/* Attachments */}
            {task.attachments?.length > 0 && (
              <div className="detail-section">
                <h4 className="detail-section-title">Attachments ({task.attachments.length})</h4>
                <div className="detail-attachments-grid">
                  {task.attachments.map((att, index) => {
                    const isImg = isImageType(att.mimeType);
                    return (
                      <div key={index} className="detail-attachment-card">
                        {isImg ? (
                          <div
                            className="detail-img-preview"
                            onClick={() => setLightboxUrl(att.url)}
                            title="Click to zoom"
                          >
                            <img src={att.url} alt={att.name} />
                            <div className="detail-img-overlay">🔍 View Fullscreen</div>
                          </div>
                        ) : (
                          <div className="detail-file-preview">
                            <span className="detail-file-icon">
                              {att.mimeType === "application/pdf" ? "📄" : "📝"}
                            </span>
                          </div>
                        )}
                        <div className="detail-att-meta">
                          <span className="detail-att-name" title={att.name}>
                            {att.name}
                          </span>
                          <div className="detail-att-actions">
                            {att.size && (
                              <span className="detail-att-size">{formatFileSize(att.size)}</span>
                            )}
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="detail-download-btn"
                            >
                              Download ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions detail-modal-actions">
            <div className="left-actions">
              <button
                type="button"
                className={`btn btn-secondary delete-btn ${showConfirm ? "confirm" : ""}`}
                onClick={handleDeleteClick}
                data-testid="detail-delete-btn"
              >
                {showConfirm ? "⚠ Click again to delete" : "🗑️ Delete Task"}
              </button>
            </div>
            <div className="right-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEditClick}
                data-testid="detail-edit-btn"
              >
                ✏️ Edit Task
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox Viewer */}
      {lightboxUrl && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Preview" className="lightbox-image" />
          </div>
        </div>
      )}
    </>
  );
}

export default TaskDetailModal;
