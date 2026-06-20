/**
 * backend/server.js
 * Express + Socket.IO WebSocket server for the Real-time Kanban Board.
 *
 * WebSocket Events:
 *  - sync:tasks     → Sends all tasks to a newly connected client
 *  - task:create    → Creates a new task and broadcasts to all clients
 *  - task:update    → Updates task fields and broadcasts to all clients
 *  - task:move      → Moves a task to a different column
 *  - task:delete    → Removes a task and broadcasts to all clients
 *
 * REST Endpoints:
 *  - POST /upload   → Accepts file uploads (multer), returns file URL
 */

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const multer = require("multer");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:4173"],
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:4173"] }));
app.use(express.json());

// ─── File Upload Setup ────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** Allowed MIME types for file uploads */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
});

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// ─── In-Memory Task Store ─────────────────────────────────────────────────────
/**
 * In-memory store: Map<taskId, task>
 * Task shape: { id, title, description, column, priority, category, attachments[], createdAt, updatedAt }
 */
const tasks = new Map();

/** Column identifiers */
const COLUMNS = ["todo", "inprogress", "done"];

/** Seed with a few demo tasks so board isn't empty on first load */
const seedTasks = [
  {
    id: uuidv4(),
    title: "Set up project repository",
    description: "Initialize Git repo and configure CI/CD pipeline.",
    column: "done",
    priority: "high",
    category: "feature",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    title: "Design database schema",
    description: "Plan collections/tables for task storage.",
    column: "inprogress",
    priority: "medium",
    category: "feature",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    title: "Fix login bug",
    description: "Users are being logged out after 5 minutes unexpectedly.",
    column: "todo",
    priority: "high",
    category: "bug",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    title: "Add dark mode support",
    description: "Implement CSS custom properties for theme switching.",
    column: "todo",
    priority: "low",
    category: "enhancement",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
seedTasks.forEach((t) => tasks.set(t.id, t));

// ─── Utility ──────────────────────────────────────────────────────────────────
/** Returns all tasks as an array */
const getAllTasks = () => Array.from(tasks.values());

/** Validates required task fields */
const validateTask = (data) => {
  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("Task title is required.");
  }
  if (data.column && !COLUMNS.includes(data.column)) {
    throw new Error(`Invalid column. Must be one of: ${COLUMNS.join(", ")}.`);
  }
};

// ─── REST: File Upload ────────────────────────────────────────────────────────
app.post("/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided." });
    }
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    return res.status(200).json({
      url: fileUrl,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  });
});

// ─── Health Check & Keep-Alive Endpoints ──────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "ok", message: "Server is running" }));
app.get("/ping", (_req, res) => res.send("pong"));
app.get("/health", (_req, res) => res.json({ status: "ok", taskCount: tasks.size }));

// ─── WebSocket Events ─────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send all current tasks to the newly connected client
  socket.emit("sync:tasks", getAllTasks());

  // ── task:create ──────────────────────────────────────────────────────────
  socket.on("task:create", (data, ack) => {
    try {
      validateTask(data);
      const task = {
        id: uuidv4(),
        title: data.title.trim(),
        description: data.description?.trim() || "",
        column: data.column || "todo",
        priority: data.priority || "medium",
        category: data.category || "feature",
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tasks.set(task.id, task);
      io.emit("task:created", task); // Broadcast to ALL clients
      console.log(`[task:create] Created task "${task.title}" (${task.id})`);
      if (typeof ack === "function") ack({ success: true, task });
    } catch (err) {
      console.error(`[task:create] Error: ${err.message}`);
      if (typeof ack === "function") ack({ success: false, error: err.message });
    }
  });

  // ── task:update ──────────────────────────────────────────────────────────
  socket.on("task:update", (data, ack) => {
    try {
      const existing = tasks.get(data.id);
      if (!existing) throw new Error(`Task ${data.id} not found.`);

      const updated = {
        ...existing,
        title: data.title !== undefined ? data.title.trim() : existing.title,
        description:
          data.description !== undefined ? data.description.trim() : existing.description,
        priority: data.priority !== undefined ? data.priority : existing.priority,
        category: data.category !== undefined ? data.category : existing.category,
        attachments:
          data.attachments !== undefined ? data.attachments : existing.attachments,
        updatedAt: new Date().toISOString(),
      };
      validateTask(updated);
      tasks.set(updated.id, updated);
      io.emit("task:updated", updated);
      console.log(`[task:update] Updated task "${updated.title}" (${updated.id})`);
      if (typeof ack === "function") ack({ success: true, task: updated });
    } catch (err) {
      console.error(`[task:update] Error: ${err.message}`);
      if (typeof ack === "function") ack({ success: false, error: err.message });
    }
  });

  // ── task:move ────────────────────────────────────────────────────────────
  socket.on("task:move", (data, ack) => {
    try {
      const { id, column } = data;
      const existing = tasks.get(id);
      if (!existing) throw new Error(`Task ${id} not found.`);
      if (!COLUMNS.includes(column)) throw new Error(`Invalid column: ${column}`);

      const moved = { ...existing, column, updatedAt: new Date().toISOString() };
      tasks.set(id, moved);
      io.emit("task:moved", moved);
      console.log(`[task:move] Moved task "${moved.title}" → ${column}`);
      if (typeof ack === "function") ack({ success: true, task: moved });
    } catch (err) {
      console.error(`[task:move] Error: ${err.message}`);
      if (typeof ack === "function") ack({ success: false, error: err.message });
    }
  });

  // ── task:delete ──────────────────────────────────────────────────────────
  socket.on("task:delete", (data, ack) => {
    try {
      const { id } = data;
      if (!tasks.has(id)) throw new Error(`Task ${id} not found.`);
      tasks.delete(id);
      io.emit("task:deleted", { id });
      console.log(`[task:delete] Deleted task ${id}`);
      if (typeof ack === "function") ack({ success: true });
    } catch (err) {
      console.error(`[task:delete] Error: ${err.message}`);
      if (typeof ack === "function") ack({ success: false, error: err.message });
    }
  });

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Kanban WebSocket server running at http://localhost:${PORT}\n`);
});

module.exports = { app, server, tasks, getAllTasks };
