/**
 * tests/e2e/fileupload.spec.js
 * Playwright E2E tests for file upload functionality.
 * Uses Playwright's file chooser API to simulate file uploads.
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

// ─── Helper: Create temp test files ──────────────────────────────────────────
const TMP_DIR = os.tmpdir();

function createTempFile(name, content, type = "text") {
  const filePath = path.join(TMP_DIR, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function waitForBoard(page) {
  await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15000 });
}

async function openCreateModal(page) {
  await page.click('[data-testid="add-task-btn"]');
  await page.waitForSelector('[data-testid="task-modal"]');
}

// ─── Tests ────────────────────────────────────────────────────────────────────
test.describe("File Upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
  });

  test("file drop zone is visible in the task modal", async ({ page }) => {
    await openCreateModal(page);
    const dropZone = page.locator('[data-testid="file-drop-zone"]');
    await expect(dropZone).toBeVisible();
  });

  test("file input accepts click to open file chooser", async ({ page }) => {
    await openCreateModal(page);

    // We just verify the input exists and is of type file
    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute("type", "file");
  });

  test("shows uploaded attachment in attachment list", async ({ page }) => {
    // Note: This test simulates a local upload.
    // In real E2E, the backend server must be running for the upload to succeed.
    // We intercept the upload request and return a mock response.
    await page.route("http://localhost:5000/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "http://localhost:5000/uploads/test-image.jpg",
          name: "test-image.jpg",
          mimeType: "image/jpeg",
          size: 1024,
        }),
      });
    });

    await openCreateModal(page);

    // Create a temp PNG file
    const tmpFile = createTempFile("test-image.jpg", "fake-image-content");

    // Use the file chooser
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.locator('[data-testid="file-drop-zone"]').click(),
    ]);
    await fileChooser.setFiles(tmpFile);

    // Wait for attachment to appear
    await expect(page.locator('[data-testid="attachment-item"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="attachment-item"]')).toContainText("test-image.jpg");
  });

  test("shows error message for invalid file type", async ({ page }) => {
    await openCreateModal(page);

    // Create a fake .exe file (invalid type)
    const tmpExe = createTempFile("malware.exe", "fake-exe-content");

    // Intercept to ensure no actual upload happens for invalid types
    // (client-side validation should catch it first)
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.locator('[data-testid="file-drop-zone"]').click(),
    ]);
    await fileChooser.setFiles(tmpExe);

    // The error message should appear (client-side validation)
    // Note: jsdom/browser file.type detection may vary; test checks the UI element exists
    const errorEl = page.locator('[data-testid="file-error"]');
    await expect(errorEl).toBeVisible({ timeout: 5000 });
  });

  test("removing attachment clears it from the list", async ({ page }) => {
    await page.route("http://localhost:5000/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "http://localhost:5000/uploads/doc.txt",
          name: "doc.txt",
          mimeType: "text/plain",
          size: 100,
        }),
      });
    });

    await openCreateModal(page);

    const tmpFile = createTempFile("doc.txt", "hello world");
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.locator('[data-testid="file-drop-zone"]').click(),
    ]);
    await fileChooser.setFiles(tmpFile);

    await expect(page.locator('[data-testid="attachment-item"]')).toBeVisible({ timeout: 8000 });

    // Remove the attachment
    await page.locator('[data-testid="remove-attachment"]').click();
    await expect(page.locator('[data-testid="attachment-item"]')).not.toBeVisible();
  });

  test("uploaded image attachment shows image preview", async ({ page }) => {
    await page.route("http://localhost:5000/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "http://localhost:5000/uploads/photo.png",
          name: "photo.png",
          mimeType: "image/png",
          size: 2048,
        }),
      });
    });

    await openCreateModal(page);

    const tmpFile = createTempFile("photo.png", "fake-png-content");
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.locator('[data-testid="file-drop-zone"]').click(),
    ]);
    await fileChooser.setFiles(tmpFile);

    // Image preview should be visible for image types
    await expect(page.locator('[data-testid="attachment-image-preview"]')).toBeVisible({ timeout: 8000 });
  });
});
