/**
 * components/TaskModal.jsx
 * Modal dialog for creating and editing tasks.
 * Includes priority & category react-select dropdowns, file upload, and validation.
 */

import React, { useEffect, useState } from "react";
import Select from "react-select";
import FileUpload from "./FileUpload";
import { PRIORITIES, CATEGORIES, validateTask } from "../utils/taskUtils";

/** react-select custom styles for dark theme */
const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#0f172a",
    borderColor: state.isFocused ? "#6366f1" : "#334155",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(99,102,241,0.3)" : "none",
    borderRadius: "8px",
    minHeight: "38px",
    "&:hover": { borderColor: "#6366f1" },
  }),
  menu: (base) => ({
    ...base,
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected
      ? "#6366f1"
      : state.isFocused
      ? "#334155"
      : "transparent",
    color: "#f1f5f9",
    cursor: "pointer",
    "&:active": { background: "#4f46e5" },
  }),
  singleValue: (base) => ({ ...base, color: "#f1f5f9" }),
  placeholder: (base) => ({ ...base, color: "#64748b" }),
  input: (base) => ({ ...base, color: "#f1f5f9" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, color: "#64748b" }),
};

/** Convert priority/category value to react-select option */
const toOption = (arr, value) => arr.find((o) => o.value === value) || arr[0];

const DEFAULT_FORM = {
  title: "",
  description: "",
  priority: "medium",
  category: "feature",
  column: "todo",
  attachments: [],
};

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSubmit: (data: Object) => Promise<void>,
 *   initialData?: Object,
 *   mode: "create" | "edit"
 * }} props
 */
function TaskModal({ isOpen, onClose, onSubmit, initialData, mode = "create" }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      setForm(
        initialData
          ? { ...DEFAULT_FORM, ...initialData }
          : DEFAULT_FORM
      );
      setFormError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { valid, error } = validateTask(form);
    if (!valid) {
      setFormError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit({ ...form, title: form.title.trim() });
      if (result && !result.success) {
        setFormError(result.error || "Failed to save task.");
      } else {
        onClose();
      }
    } catch (err) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOption = toOption(PRIORITIES, form.priority);
  const categoryOption = toOption(CATEGORIES, form.category);

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="task-modal"
    >
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {mode === "edit" ? "✏️ Edit Task" : "➕ New Task"}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            data-testid="modal-close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          {/* Title */}
          <div className="form-group">
            <label htmlFor="task-title" className="form-label">
              Title <span className="required">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              className="form-input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              maxLength={200}
              required
              autoFocus
              data-testid="task-title-input"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="task-description" className="form-label">
              Description
            </label>
            <textarea
              id="task-description"
              className="form-textarea"
              placeholder="Add more details…"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              data-testid="task-description-input"
            />
          </div>

          {/* Priority & Category Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="task-priority">
                Priority
              </label>
              <Select
                inputId="task-priority"
                styles={selectStyles}
                options={PRIORITIES}
                value={priorityOption}
                onChange={(opt) => handleChange("priority", opt.value)}
                isSearchable={false}
                classNamePrefix="react-select"
                className="priority-select-container"
                data-testid="priority-select"
                aria-label="Priority selector"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="task-category">
                Category
              </label>
              <Select
                inputId="task-category"
                styles={selectStyles}
                options={CATEGORIES}
                value={categoryOption}
                onChange={(opt) => handleChange("category", opt.value)}
                isSearchable={false}
                classNamePrefix="react-select"
                className="category-select-container"
                data-testid="category-select"
                aria-label="Category selector"
              />
            </div>
          </div>

          {/* Column (only for create) */}
          {mode === "create" && (
            <div className="form-group">
              <label className="form-label">Start In Column</label>
              <div className="column-radio-group" data-testid="column-selector">
                {[
                  { id: "todo", label: "To Do" },
                  { id: "inprogress", label: "In Progress" },
                  { id: "done", label: "Done" },
                ].map((col) => (
                  <label key={col.id} className="column-radio-label">
                    <input
                      type="radio"
                      name="column"
                      value={col.id}
                      checked={form.column === col.id}
                      onChange={() => handleChange("column", col.id)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="form-group">
            <label className="form-label">Attachments</label>
            <FileUpload
              attachments={form.attachments}
              onAttachmentsChange={(atts) => handleChange("attachments", atts)}
            />
          </div>

          {/* Form Error */}
          {formError && (
            <div className="form-error" role="alert" data-testid="form-error">
              ⚠ {formError}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              data-testid="modal-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              data-testid="modal-submit"
            >
              {isSubmitting
                ? "Saving…"
                : mode === "edit"
                ? "Save Changes"
                : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
