/**
 * tests/e2e/dropdown.spec.js
 * Playwright E2E tests for Priority & Category dropdowns.
 *
 * react-select renders a hidden <input id="task-priority"> inside its container.
 * To interact with it in Playwright we must click the visible .react-select__control div,
 * NOT the hidden input itself.
 */

import { test, expect } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function waitForBoard(page) {
  await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="kanban-column"]');
}

async function openCreateModal(page) {
  await page.click('[data-testid="add-task-btn"]');
  await page.waitForSelector('[data-testid="task-modal"]');
}

/**
 * Opens a react-select dropdown by clicking its visible control container.
 *
 * The Select components in TaskModal have explicit className props:
 *  - Priority: "priority-select-container"
 *  - Category: "category-select-container"
 *
 * react-select with classNamePrefix="react-select" generates:
 *  - Outer container: <div class="[className] react-select-container">
 *  - Control (clickable): <div class="react-select__control">
 *  - Menu: <div class="react-select__menu">
 *  - Options: <div class="react-select__option">
 *  - Value: <div class="react-select__single-value">
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} inputId - "task-priority" or "task-category"
 */
async function openReactSelect(page, inputId) {
  // Map inputId to the unique container class we added to TaskModal
  const containerClass = inputId === "task-priority"
    ? ".priority-select-container"
    : ".category-select-container";

  const control = page.locator(`${containerClass} .react-select__control`);
  await control.waitFor({ state: "visible", timeout: 5000 });
  await control.click();
  // Wait for the dropdown menu to become visible
  await page
    .locator(`${containerClass} .react-select__menu`)
    .waitFor({ state: "visible", timeout: 5000 });
}

/**
 * Selects an option from an open react-select dropdown.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} inputId - "task-priority" or "task-category"
 * @param {string} optionText - Visible text of the option to click
 */
async function selectReactOption(page, inputId, optionText) {
  const containerClass = inputId === "task-priority"
    ? ".priority-select-container"
    : ".category-select-container";

  const menu = page.locator(`${containerClass} .react-select__menu`);
  const option = menu.locator(".react-select__option").filter({ hasText: optionText }).first();
  await option.waitFor({ state: "visible", timeout: 5000 });
  await option.click();
  // Wait for menu to close after selection
  await page
    .locator(`${containerClass} .react-select__menu`)
    .waitFor({ state: "hidden", timeout: 5000 })
    .catch(() => {});
}

/**
 * Reads the currently selected value from a react-select.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} inputId - "task-priority" or "task-category"
 * @returns {Promise<string>}
 */
async function getReactSelectValue(page, inputId) {
  const containerClass = inputId === "task-priority"
    ? ".priority-select-container"
    : ".category-select-container";
  return page.locator(`${containerClass} .react-select__single-value`).textContent();
}

// ─── Tests ────────────────────────────────────────────────────────────────────
test.describe("Priority & Category Dropdowns", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
  });

  // ── Priority Selection ──────────────────────────────────────────────────────
  test("user can select priority 'High' from dropdown", async ({ page }) => {
    await openCreateModal(page);

    await openReactSelect(page, "task-priority");
    await selectReactOption(page, "task-priority", "High");

    const value = await getReactSelectValue(page, "task-priority");
    expect(value).toContain("High");
  });

  test("user can select priority 'Low' from dropdown", async ({ page }) => {
    await openCreateModal(page);

    await openReactSelect(page, "task-priority");
    await selectReactOption(page, "task-priority", "Low");

    const value = await getReactSelectValue(page, "task-priority");
    expect(value).toContain("Low");
  });

  // ── Category Selection ──────────────────────────────────────────────────────
  test("user can select category 'Bug' from dropdown", async ({ page }) => {
    await openCreateModal(page);

    await openReactSelect(page, "task-category");
    await selectReactOption(page, "task-category", "Bug");

    const value = await getReactSelectValue(page, "task-category");
    expect(value).toContain("Bug");
  });

  test("user can select category 'Enhancement'", async ({ page }) => {
    await openCreateModal(page);

    await openReactSelect(page, "task-category");
    await selectReactOption(page, "task-category", "Enhancement");

    const value = await getReactSelectValue(page, "task-category");
    expect(value).toContain("Enhancement");
  });

  // ── End-to-End: Priority badge on task card ─────────────────────────────────
  test("task card shows correct priority badge after creation", async ({ page }) => {
    const uniqueTitle = `High Priority Task ${Date.now()}`;
    await openCreateModal(page);

    await page.fill('[data-testid="task-title-input"]', uniqueTitle);

    // Select "High" priority
    await openReactSelect(page, "task-priority");
    await selectReactOption(page, "task-priority", "High");

    // Select "Bug" category
    await openReactSelect(page, "task-category");
    await selectReactOption(page, "task-category", "Bug");

    await page.click('[data-testid="modal-submit"]');
    await page.waitForSelector('[data-testid="task-modal"]', { state: "hidden" });

    // Verify badges on the task card
    const taskCard = page
      .locator('[data-testid="task-card"]')
      .filter({ hasText: uniqueTitle })
      .first();
    await expect(taskCard).toBeVisible({ timeout: 8000 });
    await expect(taskCard.locator('[data-testid="task-priority-badge"]')).toContainText("High");
    await expect(taskCard.locator('[data-testid="task-category-badge"]')).toContainText("Bug");
  });

  test("task category can be changed via edit modal", async ({ page }) => {
    const uniqueTitle = `Categorized Task ${Date.now()}`;

    // Create task with Bug category
    await openCreateModal(page);
    await page.fill('[data-testid="task-title-input"]', uniqueTitle);
    await openReactSelect(page, "task-category");
    await selectReactOption(page, "task-category", "Bug");
    await page.click('[data-testid="modal-submit"]');
    await page.waitForSelector('[data-testid="task-modal"]', { state: "hidden" });

    // Open edit modal
    const taskCard = page
      .locator('[data-testid="task-card"]')
      .filter({ hasText: uniqueTitle })
      .first();
    await expect(taskCard).toBeVisible({ timeout: 8000 });
    await taskCard.hover();
    await taskCard.locator('[data-testid="edit-task-btn"]').click();
    await page.waitForSelector('[data-testid="task-modal"]');

    // Change category to Feature
    await openReactSelect(page, "task-category");
    await selectReactOption(page, "task-category", "Feature");
    await page.click('[data-testid="modal-submit"]');
    await page.waitForSelector('[data-testid="task-modal"]', { state: "hidden" });

    // Verify updated badge on the card
    const updatedCard = page
      .locator('[data-testid="task-card"]')
      .filter({ hasText: uniqueTitle })
      .first();
    await expect(updatedCard.locator('[data-testid="task-category-badge"]')).toContainText(
      "Feature",
      { timeout: 8000 }
    );
  });
});
