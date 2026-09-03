import { test, expect } from "@playwright/test";
import { sampleCv } from "@/lib/render/__tests__/fixtures";
import { mockModelsAndHealth, fillFormAndSelectModel } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockModelsAndHealth(page);
});

test("generates a tailored CV, records it in history, and exports it", async ({
  page,
}) => {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({ json: { cv: sampleCv } });
  });

  await fillFormAndSelectModel(page);

  const sidebar = page.locator("aside");
  await expect(sidebar.getByText("History")).toHaveCount(0);

  await page.getByRole("button", { name: "Generate tailored CV" }).click();

  // Preview renders with content from the mocked response.
  const previewSection = page.locator('section[aria-live="polite"]');
  await expect(
    previewSection.getByRole("heading", { name: sampleCv.name, level: 2 }),
  ).toBeVisible();
  await expect(previewSection.getByText(sampleCv.title)).toBeVisible();
  await expect(previewSection.getByText(sampleCv.summary)).toBeVisible();
  for (const skill of sampleCv.skills) {
    await expect(
      previewSection.getByText(skill, { exact: true }),
    ).toBeVisible();
  }
  await expect(
    previewSection.getByText(sampleCv.experience[0].company, {
      exact: false,
    }),
  ).toBeVisible();

  // The sidebar History panel now shows the generated CV.
  await expect(sidebar.getByRole("heading", { name: "History" })).toBeVisible();
  await expect(
    sidebar.getByRole("button", { name: new RegExp(sampleCv.name) }),
  ).toBeVisible();

  // Export as a Word doc — this format round-trips through POST /api/export.
  await page.route("**/api/export", async (route) => {
    await route.fulfill({
      status: 200,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body: Buffer.from("fake docx bytes"),
    });
  });

  await page.getByRole("tab", { name: "Word", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Word" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("jane_doe.docx");
});
