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
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Create socket connection
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      console.log("[Socket] Connected:", s.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    s.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
    });

    s.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
      setConnectionError(err.message);
      setIsConnected(false);
    });

    s.on("reconnect", (attempt) => {
      console.log("[Socket] Reconnected after", attempt, "attempts");
      setConnectionError(null);
    });

    s.on("reconnect_failed", () => {
      setConnectionError("Failed to reconnect to server. Please refresh the page.");
    });

    // Cleanup on unmount
    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  return {
    socket,
    socketRef,
    isConnected,
    connectionError,
  };
}
