import { expect, type Page } from "@playwright/test";

// Mirrors lib/models.ts CURATED_MODELS, plus the `downloaded` flag the
// GET /api/models route adds. One model is marked downloaded so tests can
// select it without triggering a real Ollama pull. Kept in sync with the
// list in e2e/smoke.spec.ts.
export const MOCK_MODELS = [
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

/** Mocks the two endpoints the app hits unconditionally on load: the model
 * list and the Ollama health check. Mirrors e2e/smoke.spec.ts's beforeEach
 * so every spec file sees the same "one downloaded model, Ollama reachable"
 * baseline. */
export async function mockModelsAndHealth(page: Page) {
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
}

/** Navigates to "/", reveals both textareas via "Paste text instead" (the
 * app's real interaction pattern — no textarea is visible by default), fills
 * them, and selects the one pre-downloaded model. Leaves the page with
 * Generate enabled. */
export async function fillFormAndSelectModel(page: Page) {
  await page.goto("/");

  await page
    .getByRole("button", { name: "Paste text instead" })
    .first()
    .click();
  const cvTextarea = page.getByPlaceholder(
    "Paste your CV text, or upload a PDF/DOCX above",
  );
  await cvTextarea.fill("Jane Doe\nSenior Engineer with 8 years experience.");

  await page.getByRole("button", { name: "Paste text instead" }).click();
  const jdTextarea = page.getByPlaceholder(
    "Paste the job description text, or upload a PDF/DOCX above",
  );
  await jdTextarea.fill("Looking for a senior engineer with React experience.");

  const modelGroup = page.getByRole("group", { name: "Model" });
  await modelGroup.getByRole("button", { name: /^Qwen 2\.5 3B/ }).click();

  await expect(
    page.getByRole("button", { name: "Generate tailored CV" }),
  ).toBeEnabled();
}
