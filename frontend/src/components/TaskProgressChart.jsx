/**
 * components/TaskProgressChart.jsx
 * Real-time task progress visualization using Recharts.
 * Shows a bar chart (tasks per column) and a pie chart (% done).
 */

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getTaskStats } from "../utils/taskUtils";

const BAR_COLORS = {
  todo: "#6366f1",
  inprogress: "#f59e0b",
  done: "#10b981",
};

const PIE_COLORS = ["#10b981", "#334155"];

/**
 * Custom tooltip for bar chart
 */
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        <p className="chart-tooltip-value">{payload[0].value} tasks</p>
      </div>
    );
  }
  return null;
};

/**
 * Custom label renderer for pie chart center
 */
const renderCustomLabel = ({ cx, cy, pctDone }) => (
  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="pie-center-label">
    <tspan x={cx} dy="-8" fontSize="22" fontWeight="700" fill="#f1f5f9">
      {pctDone}%
    </tspan>
    <tspan x={cx} dy="20" fontSize="12" fill="#94a3b8">
      Done
    </tspan>
  </text>
);

/**
 * @param {{ tasks: Object[] }} props
 */
function TaskProgressChart({ tasks }) {
  const stats = useMemo(() => getTaskStats(tasks), [tasks]);

  const barData = useMemo(
    () => [
      { name: "To Do", value: stats.todo, fill: BAR_COLORS.todo },
      { name: "In Progress", value: stats.inprogress, fill: BAR_COLORS.inprogress },
      { name: "Done", value: stats.done, fill: BAR_COLORS.done },
    ],
    [stats]
  );

  const pieData = useMemo(
    () => [
      { name: "Done", value: stats.done },
      { name: "Remaining", value: stats.total - stats.done },
    ],
    [stats]
  );

  return (
    <div className="chart-container" data-testid="task-progress-chart">
      <h3 className="chart-title">📊 Task Progress</h3>
      <div className="chart-summary">
        <div className="chart-stat">
          <span className="chart-stat-value" data-testid="stat-total">{stats.total}</span>
          <span className="chart-stat-label">Total</span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-value stat-done" data-testid="stat-done">{stats.done}</span>
          <span className="chart-stat-label">Done</span>
        </div>
        <div className="chart-stat">
          <span className="chart-stat-value stat-pct" data-testid="stat-pct">{stats.pctDone}%</span>
          <span className="chart-stat-label">Complete</span>
        </div>
      </div>

      <div className="charts-row">
        {/* Bar Chart */}
        <div className="chart-section" data-testid="bar-chart">
          <h4 className="chart-subtitle">Tasks by Column</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="chart-section" data-testid="pie-chart">
          <h4 className="chart-subtitle">Completion</h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                label={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index]} strokeWidth={0} />
                ))}
              </Pie>
              {/* Center label */}
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                <tspan
                  x="50%"
                  dy="-8"
                  fontSize="20"
                  fontWeight="700"
                  fill="#f1f5f9"
                  data-testid="pie-pct-label"
                >
                  {stats.pctDone}%
                </tspan>
                <tspan x="50%" dy="18" fontSize="11" fill="#94a3b8">
                  Done
                </tspan>
              </text>
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default TaskProgressChart;
