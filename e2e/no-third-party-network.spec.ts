import { test, expect } from "@playwright/test";
import { sampleCv } from "@/lib/render/__tests__/fixtures";
import { mockModelsAndHealth, fillFormAndSelectModel } from "./helpers";

// This app's entire premise is "nothing leaves your machine" — the only
// network call in production is to localhost:11434 (Ollama), enforced by
// the CSP's `connect-src 'self'`. These tests back that claim with an
// executable check: they record every request the page makes and fail loudly
// if any of it targets an origin other than this app's own server or one of
// the routes we've explicitly mocked here (standing in for the real Ollama
// calls). A regression — an analytics script, a Google Fonts stylesheet, an
// error-reporting SDK, etc. — would show up as a failing assertion here
// instead of silently shipping.

/** Records every request the page issues and returns a function that fails
 * the test if any of them targets an origin other than `allowedOrigin`.
 * Filters out non-network schemes (about:, blob:, data:) that Playwright can
 * report but that never touch the network. */
function trackRequests(
  page: import("@playwright/test").Page,
  allowedOrigin: string,
) {
  const seen: string[] = [];
  page.on("request", (request) => {
    seen.push(request.url());
  });
  return function assertAllSameOrigin() {
    const offenders = seen.filter((url) => {
      if (!/^https?:\/\//.test(url)) return false;
      return new URL(url).origin !== allowedOrigin;
    });
    expect(
      offenders,
      `Request(s) went to a non-local origin (expected only ${allowedOrigin}):\n${offenders.join("\n")}`,
    ).toEqual([]);
  };
}

test.beforeEach(async ({ page }) => {
  await mockModelsAndHealth(page);
});

test("a full generate/cover-letter/export flow never leaves localhost", async ({
  page,
  baseURL,
}) => {
  const allowedOrigin = new URL(baseURL!).origin;
  const assertAllSameOrigin = trackRequests(page, allowedOrigin);

  await page.route("**/api/generate", async (route) => {
    await route.fulfill({ json: { cv: sampleCv } });
  });
  const letter =
    "Dear Hiring Manager,\n\nI'm excited to apply for this role given my background in building reliable web platforms.\n\nJane Doe";
  await page.route("**/api/cover-letter", async (route) => {
    await route.fulfill({ json: { letter } });
  });
  await page.route("**/api/export", async (route) => {
    await route.fulfill({
      status: 200,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body: Buffer.from("fake docx bytes"),
    });
  });

  await fillFormAndSelectModel(page);
  await page.getByRole("button", { name: "Generate tailored CV" }).click();

  const previewSection = page.locator('section[aria-live="polite"]');
  await expect(
    previewSection.getByRole("heading", { name: sampleCv.name, level: 2 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Generate cover letter" }).click();
  await expect(
    page.getByRole("heading", { name: "Cover letter", level: 3 }),
  ).toBeVisible();
  const letterTextarea = page.locator("textarea").last();
  await expect(letterTextarea).toHaveValue(letter);

  await page.getByRole("tab", { name: "Word", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Word" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("jane_doe.docx");

  // Give any stray timers/beacons a moment to fire before the final check.
  await page.waitForTimeout(2000);

  assertAllSameOrigin();
});

test("sitting idle after load (including the Ollama health poll) never leaves localhost", async ({
  page,
  baseURL,
}) => {
  const allowedOrigin = new URL(baseURL!).origin;
  const assertAllSameOrigin = trackRequests(page, allowedOrigin);

  const healthRequestUrls: string[] = [];
  await page.route("**/api/health", async (route) => {
    healthRequestUrls.push(route.request().url());
    await route.fulfill({ json: { status: "ok", ollama: "reachable" } });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // No interaction at all — just let it sit. The sidebar's Ollama status
  // badge polls every 20s and re-checks on window focus; this window is
  // short enough to not span a poll tick but long enough to catch anything
  // that fires shortly after mount (analytics beacons, etc.).
  await page.waitForTimeout(5000);

  // The health poll itself must only ever hit our own mocked endpoint.
  expect(healthRequestUrls.length).toBeGreaterThan(0);
  for (const url of healthRequestUrls) {
    expect(new URL(url).origin).toBe(allowedOrigin);
  }

  assertAllSameOrigin();
});
