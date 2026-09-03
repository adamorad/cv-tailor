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

test.beforeEach(async ({ page }) => {
  // No real Ollama server in CI: intercept GET /api/models so the model
  // picker has something to render, with one model pre-"downloaded" so it
  // can be selected without exercising the real pull/download flow.
  await page.route("**/api/models", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({ json: { models: MOCK_MODELS } });
  });

  // The sidebar's Ollama status badge polls GET /api/health on mount; mock
  // it reachable so tests aren't asserting against the real (absent) CI
  // Ollama server.
  await page.route("**/api/health", async (route) => {
    await route.fulfill({ json: { status: "ok", ollama: "reachable" } });
  });
});

test("landing page renders, inputs work, and generate gates correctly", async ({
  page,
}) => {
  await page.goto("/");

  // Hero renders.
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Tailor your CV.");
  await expect(heading).toContainText("Nothing leaves your Mac.");

  // Both cards default to the drop-zone view (no textarea visible yet).
  await expect(page.getByText("Drag & drop a file here")).toHaveCount(2);
  await expect(page.locator("textarea")).toHaveCount(0);

  const generateButton = page.getByRole("button", {
    name: "Generate tailored CV",
  });
  await expect(generateButton).toBeDisabled();

  // Reveal the CV textarea and type into it.
  await page
    .getByRole("button", { name: "Paste text instead" })
    .first()
    .click();
  const cvTextarea = page.getByPlaceholder(
    "Paste your CV text, or upload a PDF/DOCX above",
  );
  await expect(cvTextarea).toBeVisible();
  await cvTextarea.fill("Jane Doe\nSenior Engineer with 8 years experience.");
  await expect(cvTextarea).toHaveValue(/Jane Doe/);

  await expect(generateButton).toBeDisabled();

  // Reveal the job description textarea (the only remaining
  // "Paste text instead" button now that the CV card shows "Clear") and type.
  await page.getByRole("button", { name: "Paste text instead" }).click();
  const jdTextarea = page.getByPlaceholder(
    "Paste the job description text, or upload a PDF/DOCX above",
  );
  await expect(jdTextarea).toBeVisible();
  await jdTextarea.fill("Looking for a senior engineer with React experience.");
  await expect(jdTextarea).toHaveValue(/senior engineer/);

  // Still disabled: CV + JD text present, but no model selected yet.
  await expect(generateButton).toBeDisabled();

  // Model picker renders the four curated model cards.
  const modelGroup = page.getByRole("group", { name: "Model" });
  await expect(modelGroup.getByRole("button")).toHaveCount(4);
  for (const m of MOCK_MODELS) {
    await expect(modelGroup.getByText(m.label)).toBeVisible();
  }

  // Select the already-"downloaded" model.
  await modelGroup.getByRole("button", { name: /Qwen 2\.5 3B/ }).click();

  // Now that CV text + JD text + model are all provided, the button enables.
  await expect(generateButton).toBeEnabled();
});

test("has no serious or critical accessibility violations on load", async ({
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
