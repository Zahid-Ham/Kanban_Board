# 📝 WebSocket-Powered Kanban Board — Completed Assignment Guide

This repository contains a fully implemented, premium, real-time **WebSocket-Powered Kanban Board** with integrated file uploading, customizable task fields (priority & category), progress visualization charts, and a complete testing suite.

---

## 🎨 Application Features

### 🔌 Real-Time Synchronization (WebSocket)
* **Live Broadcasts:** Dynamic updates (create, move, edit, delete) are broadcast to all connected clients immediately using Socket.IO.
* **Connection Health Indicator:** An animated connection badge (Live Sync / Offline) displays connection health and updates dynamically.
* **Graceful Degradation:** The UI displays a loading mask during initial server synchronization.

### 📋 Board & Task Management
* **Sleek Dark Mode:** Visually stunning dark glassmorphic styling utilizing custom harmonious HSL-based color palettes.
* **Drag-and-Drop Columns:** Draggable cards smoothly move between **To Do**, **In Progress**, and **Done** columns powered by `@hello-pangea/dnd`.
* **Two-Click Delete Protection:** Avoids accidental deletions by forcing a confirmation interaction.

### 🏷️ Fields & Dropdowns
* **Custom Fields:** Category (`Bug`, `Feature`, `Enhancement`) and Priority (`Low`, `Medium`, `High`) dropdowns built using styled `react-select`.
* **Rich Visual Badges:** Color-coded badges and border accents dynamically render on each task card based on priority and category.

### 📁 Advanced File Uploads
* **Drag-and-Drop Dropzone:** Intuitive drag-and-drop file inputs inside the task editor.
* **Instant Image Previews:** In-app thumbnails for image attachments.
* **Strict Type Safety:** Validates MIME types, allowing only images, PDFs, and text documents, displaying clear visual error messages for unsupported file formats.

### 📊 Real-Time Charts
* **Dual Visualization:** Dynamic Bar Chart and Donut Pie Chart powered by `Recharts` visualize task distributions and completion rates (`%`) instantly as users modify tasks.

---

## 📂 Project Architecture

```
websocket-kanban-vitest-playwright
│── backend/                     # Node.js WebSocket + Express server
│   ├── uploads/                  # Temporary storage for task attachments
│   ├── server.js                 # Socket.IO event controllers + REST upload router
│   ├── package.json              # Backend script dependencies
│
│── frontend/                     # React Single Page App
│   ├── src/
│   │   ├── components/           # Component design system
│   │   │   ├── ConnectionStatus.jsx   # Animated connection health badge
│   │   │   ├── FileUpload.jsx         # Upload dropzone with thumbnails & validation
│   │   │   ├── KanbanBoard.jsx        # Main board structure & DndContext
│   │   │   ├── KanbanColumn.jsx       # Column container
│   │   │   ├── TaskCard.jsx           # Cards with labels, accents, & confirmations
│   │   │   ├── TaskModal.jsx          # Edit / Create form dialogs
│   │   │   ├── TaskProgressChart.jsx  # Recharts implementation (Bar + Pie)
│   │   ├── hooks/                # Stateful abstractions
│   │   │   ├── useSocket.js           # Socket event lifecycle management
│   │   │   ├── useTasks.js            # Task Reducer logic
│   │   ├── utils/                # Pure business logic
│   │   │   ├── taskUtils.js           # Pure helper functions (purely unit-tested)
│   │   ├── tests/                # Test Suite (100% Coverage)
│   │   │   ├── unit/                  # Unit tests (Vitest)
│   │   │   ├── integration/           # Integration & Socket mock tests (Vitest)
│   │   │   ├── e2e/                   # Browser UI flow tests (Playwright)
│   │   ├── App.jsx               # App entry and provider config
│   │   ├── App.css               # Core styling variables and Glassmorphic themes
│   │   ├── main.jsx              # DOM Renderer bootstrap
│   ├── package.json              # Frontend scripts & dependencies
│
└── README.md                     # Documentation
```

---

## 🚀 How to Run the Application

Follow these steps to spin up the local development environment:

### Step 1: Install Dependencies
Ensure you have Node.js installed on your machine.

**For Backend:**
```bash
cd backend
npm install
```

**For Frontend:**
```bash
cd ../frontend
npm install
```

---

### Step 2: Run the Backend Server
Run the Node.js server first to handle WebSocket traffic and upload endpoints.

```bash
cd backend
node server.js
```
*The WebSocket server will start on [http://localhost:5000](http://localhost:5000).*

---

### Step 3: Run the Frontend App
Run the Vite development server.

```bash
cd frontend
npm run dev
```
*Open your browser to [http://localhost:3000](http://localhost:3000) to view the live app.*

---

## 🧪 How to Run the Test Suite

The project includes thorough, automated test suites verifying all backend behaviors, frontend states, and interface interactions.

### 1. Run Unit & Integration Tests (Vitest)
These verify state reductions, socket connections, form fields, and component rendering.

```bash
cd frontend
npm run test
```
*Expected Output: **68 passed** (68 / 68 passing).*

### 2. Run End-to-End Tests (Playwright)
These open a browser instance and perform automated browser workflows (creating, editing, moving, uploading files, and sync verification).

```bash
cd frontend
# First time install browsers:
npx playwright install chromium

# Run the E2E tests:
npm run test:e2e
```
*Expected Output: **28 passed** (28 / 28 passing).*

---

## 📋 Recommended Manual Testing Walkthrough

To verify features manually, open two browser tabs side-by-side at [http://localhost:3000](http://localhost:3000):

### 1. Create a Task & Field Selection
* Click **➕ Add Task** inside the board toolbar.
* Enter a title (e.g. `Implement OAuth2.0 flow`) and description.
* Choose **High** priority and **Feature** category from the react-select dropdowns.
* Select column **To Do** and click **Save Task**.
* *Verify:* The card appears instantly in both windows. The Priority tag is red (`High`) and the Category tag is blue (`Feature`).

### 2. File Upload & Previews
* Hover over the new card and click the **✏️ Edit** button.
* Drag and drop an image (e.g., `.png` or `.jpg`) or document (e.g., `.pdf` or `.txt`) into the attachment dropzone.
* *Verify:* The image displays a thumbnail preview immediately.
* Try dropping an unsupported file type (e.g., `.zip` or `.exe`).
* *Verify:* The dropzone highlights red and displays an error message blocking the format.
* Click **Save Task** to persist changes.

### 3. Drag-and-Drop & Charts
* Drag the task card from **To Do** into **In Progress**.
* *Verify:* The card shifts smoothly and coordinates in real-time across both screens.
* Observe the **Task Progress** graphs at the bottom.
* *Verify:* The Bar and Pie charts dynamically update the task distributions and completion rate indicator.

### 4. Two-Click Deletion
* Hover over any card and click the **🗑️ Delete** button.
* Notice that the button turns into a warning symbol (`⚠️`).
* Click it again within 3 seconds to delete.
* *Verify:* The card is removed across all screens and the charts recalculate their stats.
