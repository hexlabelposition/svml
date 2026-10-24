import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const include = ["src/**/*.test.ts", "test/**/*.test.ts"];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include,
          environment: "node",
        },
      },
      {
        test: {
          name: "browser",
          include,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [
              { browser: "chromium" },
              { browser: "firefox" },
              { browser: "webkit" },
            ],
          },
        },
      },
    ],
  },
});
