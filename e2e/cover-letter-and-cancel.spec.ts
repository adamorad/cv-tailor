import { test, expect } from "@playwright/test";
import { sampleCv } from "@/lib/render/__tests__/fixtures";
import { mockModelsAndHealth, fillFormAndSelectModel } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockModelsAndHealth(page);
});

test("generates a cover letter for the tailored CV", async ({ page }) => {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({ json: { cv: sampleCv } });
  });
  const letter =
    "Dear Hiring Manager,\n\nI'm excited to apply for this role given my background in building reliable web platforms.\n\nJane Doe";
  await page.route("**/api/cover-letter", async (route) => {
    await route.fulfill({ json: { letter } });
  });

  await fillFormAndSelectModel(page);
  await page.getByRole("button", { name: "Generate tailored CV" }).click();
  await expect(
    page.getByRole("heading", { name: sampleCv.name, level: 2 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Generate cover letter" }).click();

  // The generated letter replaces the "Generate" button with an editable
  // textarea (no placeholder/label of its own) plus Copy/Download controls;
  // it's the last textarea on the page once the CV/JD ones are already shown.
  await expect(
    page.getByRole("heading", { name: "Cover letter", level: 3 }),
  ).toBeVisible();
  const letterTextarea = page.locator("textarea").last();
  await expect(letterTextarea).toHaveValue(letter);
});

test("cancels an in-flight CV generation and returns to idle", async ({
  page,
}) => {
  await page.route("**/api/generate", async () => {
    // Never resolves: the point is to abort it client-side via Cancel before
    // any response arrives, matching a real slow/stuck Ollama call. Uses no
    // timer, so it doesn't keep the test process alive after the page closes.
    await new Promise(() => {});
  });

  await fillFormAndSelectModel(page);

  const generateButton = page.getByRole("button", {
    name: /^Generate tailored CV$|^Generating…$/,
  });
  await generateButton.click();

  await expect(generateButton).toHaveText("Generating…");
  await expect(generateButton).toBeDisabled();
  await expect(page.getByRole("progressbar")).toBeVisible();

  const cancelButton = page.getByRole("button", { name: "Cancel" });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();

  await expect(generateButton).toHaveText("Generate tailored CV");
  await expect(generateButton).toBeEnabled();
  await expect(cancelButton).toBeHidden();
  await expect(page.getByRole("heading", { name: "Preview" })).toHaveCount(0);
});
