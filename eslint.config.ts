import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import boundariesModule from "eslint-plugin-boundaries";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// The plugin is CommonJS but its types describe an ES module default export,
// so under `nodenext` the default import is typed as the module namespace.
const boundaries =
  boundariesModule as unknown as typeof boundariesModule.default;

// Public modules under src/ and the modules each one may import (ARCHITECTURE §3).
// `internal` is shared by every module but never re-exported by the root entry.
const modules = {
  internal: [],
  ast: ["internal"],
  serde: ["internal", "ast"],
  attributes: ["internal", "ast"],
  spec: ["internal", "ast"],
} satisfies Record<string, string[]>;

const publicModules = Object.keys(modules).filter(
  (name) => name !== "internal",
);

const toModuleEntries = (types: string[]) => ({
  to: { element: { types: { anyOf: types }, fileInternalPath: "index.ts" } },
});

export default defineConfig(
  globalIgnores(["dist/", "coverage/"]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "boundaries/elements": [
        ...Object.keys(modules).map((name) => ({
          type: name,
          pattern: `src/${name}`,
        })),
        { type: "root", pattern: "src" },
        { type: "test", pattern: "test" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          // Imports within one module are always allowed; everything else,
          // including packages and Node.js built-ins, needs a policy (D2).
          checkAllOrigins: true,
          checkUnknownLocals: true,
          policies: [
            // Other modules are imported only through their index.ts.
            ...Object.entries(modules).map(([name, deps]) => ({
              from: { element: { type: name } },
              allow: toModuleEntries(deps),
            })),
            {
              from: { element: { type: "root" } },
              allow: toModuleEntries(publicModules),
            },
            // Tests outside src/ use only the public entry, test tooling and Node.js
            // built-ins (fixtures are read from disk).
            {
              from: { element: { type: "test" } },
              allow: [
                {
                  to: {
                    element: { type: "root", fileInternalPath: "index.ts" },
                  },
                },
                { to: { module: { origin: ["external", "core"] } } },
              ],
            },
            // Unit tests next to the code may use test tooling, but not Node.js
            // built-ins: they also run in browsers.
            {
              from: { file: { path: "src/**/*.test.ts" } },
              allow: { to: { module: { origin: "external" } } },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
