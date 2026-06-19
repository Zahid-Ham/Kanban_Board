/**
 * tests/e2e/kanban.spec.js
 * Playwright E2E tests for the core Kanban board functionality:
 *  - Creating tasks
 *  - Deleting tasks
 *  - Drag-and-drop between columns
 *  - Real-time updates across tabs
 */

import { test, expect } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Waits for the Kanban board to be fully loaded and connected.
 */
async function waitForBoard(page) {
  await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="kanban-column"]', { timeout: 10000 });
}

/**
 * Creates a task via the modal UI and returns the title used.
 */
async function createTask(page, { title, description = "", column = "todo" } = {}) {
  await page.click('[data-testid="add-task-btn"]');
  await page.waitForSelector('[data-testid="task-modal"]');
  await page.fill('[data-testid="task-title-input"]', title);
  if (description) {
    await page.fill('[data-testid="task-description-input"]', description);
  }
  // Select column radio
  await page.click(`input[name="column"][value="${column}"]`);
  await page.click('[data-testid="modal-submit"]');
  // Wait for modal to close
  await page.waitForSelector('[data-testid="task-modal"]', { state: "hidden", timeout: 5000 });
}

/**
 * Performs a drag-and-drop using keyboard navigation — reliable with @hello-pangea/dnd.
 * @hello-pangea/dnd supports keyboard drag:
 *   Space       → pick up the card
 *   Right Arrow → move to next droppable column
 *   Space       → drop the card
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} dragLocator - The card to drag
 * @param {'right'|'left'} direction - Direction to move (right = next column)
 */
async function dragCardKeyboard(page, dragLocator, direction = "right") {
  // Focus the draggable element
  await dragLocator.focus();
  await page.waitForTimeout(100);

  // Press Space to initiate the drag
  await dragLocator.press("Space");
  await page.waitForTimeout(300);

  // Move to the target column using arrow key
  await dragLocator.press(direction === "right" ? "ArrowRight" : "ArrowLeft");
  await page.waitForTimeout(300);

  // Drop the card with Space
  await dragLocator.press("Space");
  await page.waitForTimeout(500);
}

/**
 * Alternative: mouse-based drag with proper DnD event sequence.
 * Used as a fallback if keyboard approach doesn't work.
 */
async function dragCard(page, dragLocator, dropLocator) {
  const dragBounds = await dragLocator.boundingBox();
  const dropBounds = await dropLocator.boundingBox();

  if (!dragBounds || !dropBounds) {
    throw new Error("Could not get bounding boxes for drag/drop elements");
  }

  const startX = dragBounds.x + dragBounds.width / 2;
  const startY = dragBounds.y + dragBounds.height / 2;
  const endX = dropBounds.x + dropBounds.width / 2;
  const endY = dropBounds.y + dropBounds.height / 2;

  // Simulate the full drag sequence that DnD libraries require
  await page.mouse.move(startX, startY);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(600); // Long hold to trigger drag start
  await page.mouse.move(startX + 1, startY, { steps: 2 }); // Tiny move to start drag
  await page.waitForTimeout(200);
  await page.mouse.move(endX, endY, { steps: 30 }); // Slow move to target
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(600);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Kanban Board — Core Features", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
  });

  // ── Create Task ─────────────────────────────────────────────────────────────
  test("user can create a task and see it in To Do column", async ({ page }) => {
    const title = `E2E Test Task ${Date.now()}`;
    await createTask(page, { title, column: "todo" });

    // Task should appear in the board
    const taskCard = page.locator('[data-testid="task-card"]').filter({ hasText: title }).first();
    await expect(taskCard).toBeVisible({ timeout: 8000 });
    await expect(taskCard).toContainText(title);
  });

  test("task title is required — shows error on empty submit", async ({ page }) => {
    await page.click('[data-testid="add-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.click('[data-testid="modal-submit"]');

    const error = page.locator('[data-testid="form-error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText("required");
  });

  test("modal closes when cancel button is clicked", async ({ page }) => {
    await page.click('[data-testid="add-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.click('[data-testid="modal-cancel"]');
    await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible();
  });

  // ── Delete Task ─────────────────────────────────────────────────────────────
  test("user can delete a task and see it removed", async ({ page }) => {
    const title = `Task To Delete ${Date.now()}`;
    await createTask(page, { title });

    // Use .first() since there could be multiple matches after retries
    const taskCard = page.locator('[data-testid="task-card"]').filter({ hasText: title }).first();
    await taskCard.hover();

    // Two-click delete confirmation
    await taskCard.locator('[data-testid="delete-task-btn"]').click();
    // Wait for the confirmation state (button text changes to ⚠)
    await page.waitForTimeout(200);
    await taskCard.locator('[data-testid="delete-task-btn"]').click();

    await expect(taskCard).not.toBeVisible({ timeout: 8000 });
  });

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  test("user can drag a task from To Do to In Progress", async ({ page }) => {
    // Use unique title to avoid conflicts with previous test runs on persistent server
    const title = `Drag Me ${Date.now()}`;
    await createTask(page, { title, column: "todo" });

    // Wait for the task to appear in To Do
    const todoColumn = page.locator('[data-testid="kanban-column"][data-column-id="todo"]');
    const taskCard = todoColumn.locator('[data-testid="task-card"]').filter({ hasText: title }).first();
    await expect(taskCard).toBeVisible({ timeout: 8000 });

    const inProgressColumn = page.locator('[data-testid="kanban-column"][data-column-id="inprogress"]');

    // Use keyboard-based drag (reliable with @hello-pangea/dnd)
    // Space = pick up, ArrowRight = move to next column, Space = drop
    await dragCardKeyboard(page, taskCard, "right");

    // Task should now be in In Progress column
    await expect(inProgressColumn.locator('[data-testid="task-list"]')).toContainText(title, { timeout: 8000 });
  });

  // ── Board Structure ─────────────────────────────────────────────────────────
  test("board has 3 columns: To Do, In Progress, Done", async ({ page }) => {
    const columns = page.locator('[data-testid="kanban-column"]');
    await expect(columns).toHaveCount(3);

    await expect(page.locator('[data-testid="column-title"]').nth(0)).toContainText("To Do");
    await expect(page.locator('[data-testid="column-title"]').nth(1)).toContainText("In Progress");
    await expect(page.locator('[data-testid="column-title"]').nth(2)).toContainText("Done");
  });

  // ── Real-time sync across tabs ──────────────────────────────────────────────
  test("task created in tab 1 appears in tab 2 (real-time sync)", async ({ page, context }) => {
    const page2 = await context.newPage();
    await page2.goto("/");
    await waitForBoard(page2);

    const title = `Real-Time Sync ${Date.now()}`;
    await createTask(page, { title });

    // Should appear in tab 2 via WebSocket broadcast
    const taskInTab2 = page2.locator('[data-testid="task-card"]').filter({ hasText: title }).first();
    await expect(taskInTab2).toBeVisible({ timeout: 10000 });

    await page2.close();
  });

  // ── Edit Task ───────────────────────────────────────────────────────────────
  test("user can edit a task title", async ({ page }) => {
    const originalTitle = `Original ${Date.now()}`;
    const updatedTitle = `Updated ${Date.now()}`;
    await createTask(page, { title: originalTitle });

    const taskCard = page.locator('[data-testid="task-card"]').filter({ hasText: originalTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 8000 });
    await taskCard.hover();
    await taskCard.locator('[data-testid="edit-task-btn"]').click();

    await page.waitForSelector('[data-testid="task-modal"]');
    await page.locator('[data-testid="task-title-input"]').clear();
    await page.fill('[data-testid="task-title-input"]', updatedTitle);
    await page.click('[data-testid="modal-submit"]');
    await page.waitForSelector('[data-testid="task-modal"]', { state: "hidden" });

    await expect(page.locator('[data-testid="task-card"]').filter({ hasText: updatedTitle }).first()).toBeVisible({ timeout: 8000 });
  });
});
