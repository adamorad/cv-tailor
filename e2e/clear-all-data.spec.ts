import { test, expect } from "@playwright/test";
import { sampleCv } from "@/lib/render/__tests__/fixtures";
import { mockModelsAndHealth, fillFormAndSelectModel } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockModelsAndHealth(page);
});

test("Clear all local data confirms, then wipes the draft and history from both localStorage and the UI", async ({
  page,
}) => {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({ json: { cv: sampleCv } });
  });

  await fillFormAndSelectModel(page);
  await page.getByRole("button", { name: "Generate tailored CV" }).click();

  const sidebar = page.locator("aside");
  await expect(sidebar.getByRole("heading", { name: "History" })).toBeVisible();

  // Draft (cvText/jobDescription/model) and history both landed in localStorage.
  const before = await page.evaluate(() => ({
    draft: localStorage.getItem("cv-tailor:draft"),
    history: localStorage.getItem("cv-tailor:history"),
  }));
  expect(before.draft).toContain("Jane Doe");
  expect(JSON.parse(before.history!)).toHaveLength(1);

  // The native confirm() guard fires; accepting it proceeds with the wipe.
  // (window.confirm() blocks the page's JS thread, so the handler must be
  // registered before the click, not raced against it — see Playwright's
  // dialog-handling docs.)
  let dialogType: string | undefined;
  page.once("dialog", async (dialog) => {
    dialogType = dialog.type();
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Clear all local data" }).click();
  expect(dialogType).toBe("confirm");

  // UI resets immediately, without a reload.
  await expect(
    page.getByPlaceholder("Paste your CV text, or upload a PDF/DOCX above"),
  ).toHaveValue("");
  await expect(
    page.getByPlaceholder(
      "Paste the job description text, or upload a PDF/DOCX above",
    ),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Generate tailored CV" }),
  ).toBeDisabled();
  await expect(sidebar.getByRole("heading", { name: "History" })).toHaveCount(
    0,
  );

  // localStorage is cleared too, not just React state.
  const after = await page.evaluate(() => ({
    draft: localStorage.getItem("cv-tailor:draft"),
    history: localStorage.getItem("cv-tailor:history"),
  }));
  expect(JSON.parse(after.draft!)).toEqual({
    cvText: "",
    jobDescription: "",
    model: null,
  });
  expect(JSON.parse(after.history!)).toEqual([]);
});

test("Clear all local data does nothing if the confirm dialog is dismissed", async ({
  page,
}) => {
  await fillFormAndSelectModel(page);

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Clear all local data" }).click();

  // Draft is untouched — the CV textarea still has what we typed.
  await expect(
    page.getByPlaceholder("Paste your CV text, or upload a PDF/DOCX above"),
  ).toHaveValue("Jane Doe\nSenior Engineer with 8 years experience.");
  await expect(
    page.getByRole("button", { name: "Generate tailored CV" }),
  ).toBeEnabled();
});
