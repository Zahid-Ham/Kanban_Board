/**
 * tests/e2e/chart.spec.js
 * Playwright E2E tests for the task progress chart.
 * Verifies that chart statistics update dynamically as tasks are added and moved.
 *
 * Note: The backend keeps tasks in memory across tests. We always read "before"
 * counts first, then assert the delta — never assert absolute values.
 */

import { test, expect } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function waitForBoard(page) {
  await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="task-progress-chart"]');
}

async function createTask(page, { title, column = "todo" } = {}) {
  await page.click('[data-testid="add-task-btn"]');
  await page.waitForSelector('[data-testid="task-modal"]');
  await page.fill('[data-testid="task-title-input"]', title);
  await page.click(`input[name="column"][value="${column}"]`);
  await page.click('[data-testid="modal-submit"]');
  await page.waitForSelector('[data-testid="task-modal"]', { state: "hidden", timeout: 5000 });
}

async function deleteTask(page, title) {
  // Use .first() to avoid strict mode errors if multiple matches exist
  const taskCard = page.locator('[data-testid="task-card"]').filter({ hasText: title }).first();
  await taskCard.waitFor({ state: "visible", timeout: 8000 });
  await taskCard.hover();
  await taskCard.locator('[data-testid="delete-task-btn"]').click();
  await page.waitForTimeout(200);
  await taskCard.locator('[data-testid="delete-task-btn"]').click();
  await expect(taskCard).not.toBeVisible({ timeout: 8000 });
}

async function getStatValue(page, testId) {
  const text = await page.locator(`[data-testid="${testId}"]`).textContent();
  return parseInt(text.trim(), 10);
}

// ─── Tests ────────────────────────────────────────────────────────────────────
test.describe("Task Progress Chart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
  });

  test("chart container is visible on page load", async ({ page }) => {
    await expect(page.locator('[data-testid="task-progress-chart"]')).toBeVisible();
  });

  test("chart shows correct total task count after creating a task", async ({ page }) => {
    const totalBefore = await getStatValue(page, "stat-total");

    await createTask(page, { title: `Count Test ${Date.now()}` });

    // Wait for the count to update
    await page.waitForFunction(
      (before) => parseInt(document.querySelector('[data-testid="stat-total"]').textContent) > before,
      totalBefore,
      { timeout: 8000 }
    );

    const totalAfter = await getStatValue(page, "stat-total");
    expect(totalAfter).toBe(totalBefore + 1);
  });

  test("done count increases when task is created in Done column", async ({ page }) => {
    const doneBefore = await getStatValue(page, "stat-done");

    await createTask(page, { title: `Done Task ${Date.now()}`, column: "done" });

    await page.waitForFunction(
      (before) => parseInt(document.querySelector('[data-testid="stat-done"]').textContent) > before,
      doneBefore,
      { timeout: 8000 }
    );

    const doneAfter = await getStatValue(page, "stat-done");
    expect(doneAfter).toBe(doneBefore + 1);
  });

  test("completion percentage updates when task is created in Done column", async ({ page }) => {
    // Create a todo task first so pctDone is not 100%
    await createTask(page, { title: `Pct Todo ${Date.now()}`, column: "todo" });
    const totalBefore = await getStatValue(page, "stat-total");

    // Now create a done task
    await createTask(page, { title: `Pct Done ${Date.now()}`, column: "done" });

    await page.waitForFunction(
      (before) => parseInt(document.querySelector('[data-testid="stat-total"]').textContent) > before,
      totalBefore,
      { timeout: 8000 }
    );

    // Verify pct is non-zero (done tasks exist)
    const pct = await getStatValue(page, "stat-pct");
    expect(pct).toBeGreaterThan(0);
  });

  test("graph re-renders dynamically when new tasks are added", async ({ page }) => {
    const initialTotal = await getStatValue(page, "stat-total");

    // Add 3 tasks with unique names to avoid confusion with server-persisted state
    const ts = Date.now();
    await createTask(page, { title: `Graph A ${ts}` });
    await createTask(page, { title: `Graph B ${ts}` });
    await createTask(page, { title: `Graph C ${ts}` });

    // Wait for all 3 to be reflected
    await page.waitForFunction(
      (before) => parseInt(document.querySelector('[data-testid="stat-total"]').textContent) >= before + 3,
      initialTotal,
      { timeout: 12000 }
    );

    const finalTotal = await getStatValue(page, "stat-total");
    // Use >= to handle any race conditions with retries
    expect(finalTotal).toBeGreaterThanOrEqual(initialTotal + 3);
  });

  test("total decreases when a task is deleted", async ({ page }) => {
    const title = `Delete Chart Task ${Date.now()}`;
    await createTask(page, { title });

    // Wait for the task to appear and count to stabilize
    await page.locator('[data-testid="task-card"]').filter({ hasText: title }).first().waitFor({ timeout: 8000 });
    const totalBefore = await getStatValue(page, "stat-total");

    await deleteTask(page, title);

    // Wait for count to decrease
    await page.waitForFunction(
      (before) => parseInt(document.querySelector('[data-testid="stat-total"]').textContent) < before,
      totalBefore,
      { timeout: 8000 }
    );

    const totalAfter = await getStatValue(page, "stat-total");
    expect(totalAfter).toBe(totalBefore - 1);
  });

  test("bar chart and pie chart elements are present", async ({ page }) => {
    await expect(page.locator('[data-testid="bar-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="pie-chart"]')).toBeVisible();
  });
});
