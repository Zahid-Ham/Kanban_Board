/**
 * components/ConnectionStatus.jsx
 * Displays a visual indicator for the WebSocket connection status.
 */

import React from "react";

/**
 * @param {{ isConnected: boolean, error: string|null }} props
 */
function ConnectionStatus({ isConnected, error }) {
  return (
    <div className="connection-status" data-testid="connection-status">
      <span
        className={`status-dot ${isConnected ? "connected" : "disconnected"}`}
        aria-hidden="true"
      />
      <span className="status-text">
        {error ? (
          <span className="status-error" title={error}>
            ⚠ Connection Error
          </span>
        ) : isConnected ? (
          <span className="status-online">Live</span>
        ) : (
          <span className="status-offline">Connecting…</span>
        )}
      </span>
    </div>
  );
}

export default ConnectionStatus;
