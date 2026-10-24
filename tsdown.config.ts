import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  fixedExtension: false,
  tsconfig: "tsconfig.lib.json",
  dts: true,
  publint: { level: "suggestion", strict: true },
  attw: { profile: "esm-only", level: "error" },
});
