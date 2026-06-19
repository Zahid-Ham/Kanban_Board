/**
 * components/FileUpload.jsx
 * File upload component with drag-and-drop support, image preview,
 * and validation for allowed file types.
 */

import React, { useRef, useState } from "react";
import { ALLOWED_FILE_TYPES, formatFileSize, isImageType } from "../utils/taskUtils";

const UPLOAD_URL = "http://localhost:5000/upload";

/**
 * @param {{
 *   attachments: Array<{ url: string, name: string, mimeType: string, size: number }>,
 *   onAttachmentsChange: (attachments: Array) => void
 * }} props
 */
function FileUpload({ attachments = [], onAttachmentsChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileError(null);

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFileError(
        `Unsupported file type: "${file.type}". Allowed: images, PDF, TXT, DOC/DOCX.`
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed.");
      }

      const uploaded = await response.json();
      onAttachmentsChange([...attachments, uploaded]);
    } catch (err) {
      setFileError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e) => handleFileSelect(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeAttachment = (index) => {
    const updated = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(updated);
  };

  return (
    <div className="file-upload-container">
      {/* Drop Zone */}
      <div
        className={`file-drop-zone ${isDragging ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload file"
        data-testid="file-drop-zone"
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(",")}
          onChange={handleInputChange}
          className="file-input-hidden"
          data-testid="file-input"
          aria-label="File input"
        />
        {uploading ? (
          <div className="upload-spinner">
            <div className="spinner" />
            <span>Uploading…</span>
          </div>
        ) : (
          <div className="drop-zone-content">
            <span className="drop-icon">📎</span>
            <span>Drop file here or <strong>click to browse</strong></span>
            <span className="drop-hint">Images, PDF, TXT, DOC (max 10 MB)</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {fileError && (
        <div className="file-error" role="alert" data-testid="file-error">
          ⚠ {fileError}
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="attachments-list" data-testid="attachments-list">
          {attachments.map((att, index) => (
            <div key={index} className="attachment-item" data-testid="attachment-item">
              {isImageType(att.mimeType) ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="attachment-preview-img"
                  data-testid="attachment-image-preview"
                />
              ) : (
                <div className="attachment-file-icon">
                  {att.mimeType === "application/pdf" ? "📄" : "📝"}
                </div>
              )}
              <div className="attachment-info">
                <span className="attachment-name" title={att.name}>
                  {att.name}
                </span>
                {att.size && (
                  <span className="attachment-size">{formatFileSize(att.size)}</span>
                )}
              </div>
              <button
                type="button"
                className="attachment-remove"
                onClick={() => removeAttachment(index)}
                aria-label={`Remove ${att.name}`}
                data-testid="remove-attachment"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
