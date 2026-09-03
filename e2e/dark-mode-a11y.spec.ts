import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Mirrors lib/models.ts CURATED_MODELS, plus the `downloaded` flag the
// GET /api/models route adds. One model is marked downloaded so the test
// can select it without triggering a real Ollama pull.
const MOCK_MODELS = [
  {
    id: "qwen2.5:1.5b",
    label: "Qwen 2.5 1.5B",
    sizeGb: 1.0,
    description:
      "Tiny and fast. Good for quick iteration, lower tailoring quality.",
    downloaded: false,
  },
  {
    id: "llama3.2:3b",
    label: "Llama 3.2 3B",
    sizeGb: 2.0,
    description: "Small and capable, solid instruction-following.",
    downloaded: false,
  },
  {
    id: "qwen2.5:3b",
    label: "Qwen 2.5 3B",
    sizeGb: 1.9,
    description: "Best balance of size and quality. Recommended default.",
    downloaded: true,
  },
  {
    id: "qwen2.5:7b",
    label: "Qwen 2.5 7B",
    sizeGb: 4.7,
    description:
      "Highest quality of this set, still a fraction of a 14B model.",
    downloaded: false,
  },
];

// Scans the same landing page as e2e/smoke.spec.ts's a11y test, but with the
// browser's color scheme forced to dark so the `prefers-color-scheme: dark`
// palette in app/globals.css is actually exercised. Light and dark mode use
// different color tokens (see globals.css), so a clean light-mode scan
// doesn't guarantee a clean dark-mode one — color-contrast issues in
// particular can differ completely between the two themes.
test.use({ colorScheme: "dark" });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/models", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({ json: { models: MOCK_MODELS } });
  });

  await page.route("**/api/health", async (route) => {
    await route.fulfill({ json: { status: "ok", ollama: "reachable" } });
  });
});

test("has no serious or critical accessibility violations on load in dark mode", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page }).analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const nonBlocking = results.violations.filter(
    (v) => v.impact === "minor" || v.impact === "moderate",
  );

  // Report (but don't fail CI on) minor/moderate findings — these are worth
  // triaging but shouldn't block the pipeline while the app is early-stage.
  if (nonBlocking.length > 0) {
    console.log(
      "Non-blocking accessibility findings (minor/moderate):",
      nonBlocking.map((v) => `${v.id}: ${v.description}`),
    );
  }

  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
