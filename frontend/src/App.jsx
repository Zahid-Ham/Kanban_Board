/**
 * App.jsx
 * Root application component.
 */

import React from "react";
import KanbanBoard from "./components/KanbanBoard";
import "./App.css";

function App() {
  return (
    <div className="app">
      <KanbanBoard />
    </div>
  );
}

export default App;
