/**
 * tests/e2e/KanbanBoard.e2e.test.js
 * Starter E2E test — verifies the board loads and the add-task button is visible.
 */

import { test, expect } from "@playwright/test";

test("User can add a task and see it on the board", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // Wait for the board to fully load (WebSocket sync)
  await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15000 });

  // The board title contains "Kanban Board"
  await expect(page.locator('[data-testid="board-title"]')).toBeVisible();
  await expect(page.locator('[data-testid="board-title"]')).toContainText("Kanban Board");

  // Add-task button should be visible
  await expect(page.locator('[data-testid="add-task-btn"]')).toBeVisible();

  // Create a task
  await page.click('[data-testid="add-task-btn"]');
  await page.waitForSelector('[data-testid="task-modal"]');
  await page.fill('[data-testid="task-title-input"]', "Starter E2E Task");
  await page.click('[data-testid="modal-submit"]');
  await page.waitForSelector('[data-testid="task-modal"]', { state: "hidden" });

  // Task should appear on the board
  const taskCard = page.locator('[data-testid="task-card"]').filter({ hasText: "Starter E2E Task" });
  await expect(taskCard.first()).toBeVisible();
});
