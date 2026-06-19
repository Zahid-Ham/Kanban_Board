/**
 * hooks/useSocket.js
 * Custom React hook that manages the Socket.IO connection lifecycle.
 * Handles connection, disconnection, and reconnection automatically.
 */

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

/**
 * @returns {{ socket: Socket|null, isConnected: boolean, connectionError: string|null }}
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
      setConnectionError(err.message);
      setIsConnected(false);
    });

    socket.on("reconnect", (attempt) => {
      console.log("[Socket] Reconnected after", attempt, "attempts");
      setConnectionError(null);
    });

    socket.on("reconnect_failed", () => {
      setConnectionError("Failed to reconnect to server. Please refresh the page.");
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    socket: socketRef.current,
    socketRef,
    isConnected,
    connectionError,
  };
}
