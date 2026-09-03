import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", ".next/**", ".claude/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["app/api/**/*.ts", "lib/**/*.ts"],
      exclude: [
        "**/node_modules/**",
        "**/__tests__/**",
        ".next/**",
        ".claude/**",
      ],
    },
  },
});
