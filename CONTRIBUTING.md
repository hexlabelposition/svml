# Contributing

svml is in the design phase and is not open for outside contributions yet. This document describes the development setup and the conventions the project follows. The decisions behind them are in [ARCHITECTURE.md](./ARCHITECTURE.md); planned work is in [BACKLOG.md](./BACKLOG.md).

## Requirements

- [Bun](https://bun.sh), the version from the `packageManager` field in `package.json`
- Node.js ≥ 22

## Setup

```sh
bun install
bunx playwright install chromium firefox webkit
```

Playwright builds its browsers for Ubuntu and Debian. On other Linux distributions WebKit usually cannot start because system libraries are missing. Run the browser tests in Chromium and Firefox locally and leave WebKit to CI, which runs the full matrix.

## Commands

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `bun run build`        | Build `dist/` with tsdown, then run publint and attw        |
| `bun run typecheck`    | Type-check the library, test and script projects            |
| `bun run test`         | Run all tests: Node.js and every browser                    |
| `bun run test:node`    | Run the tests in Node.js                                    |
| `bun run test:browser` | Run the tests in browsers; add `--browser chromium` for one |
| `bun run lint`         | Lint with ESLint, including module boundary rules           |
| `bun run format`       | Format all files with Prettier                              |
| `bun run format:check` | Check formatting of everything except Markdown              |
| `bun run docs:check`   | Check formatting of Markdown files                          |

Before pushing, run `lint`, `format:check`, `docs:check`, `typecheck` and `test:node`. CI runs the same checks and the tests on every supported Node.js, Bun and browser version.

## Code layout

Source code lives in domain folders under `src/` (ARCHITECTURE §3). Each folder is imported by other folders only through its `index.ts`, dependencies flow in one direction, and library code imports no packages or Node.js built-ins. ESLint enforces these rules; when a new folder is added, register it in the `modules` table at the top of `eslint.config.ts`.

Unit tests sit next to the code as `*.test.ts` and run in Node.js and in browsers, so they must not use Node.js APIs. Tests that read fixtures from disk go in `test/`.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org) with a short one-line subject:

- `feat` - a new feature
- `fix` - a bug fix
- `perf` - a performance improvement
- `docs` - documentation only
- `test` - tests only
- `build` - build setup, tooling and dependencies
- `ci` - GitHub Actions and Dependabot
- `chore` - anything else, including releases (`chore: release X.Y.Z`)

## Dependencies

The library has no runtime dependencies. Tooling uses caret ranges with a committed `bun.lock`; Dependabot updates GitHub Actions and npm packages weekly with a 7-day cooldown. See ARCHITECTURE §8 for the exceptions: TypeScript, `@types/node`, and packages that affect test or benchmark results.

## Releases

A release is a `vX.Y.Z` tag on a commit whose `package.json` has the same version.

1. Update the version without creating a tag:

   ```sh
   npm version X.Y.Z --no-git-tag-version
   ```

2. Commit with `chore: release X.Y.Z`, tag and push:

   ```sh
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```

3. The Release workflow checks the tag, runs CI, builds the tarball once and creates a draft GitHub release with the tarball attached. Versions with a pre-release part (`X.Y.Z-beta.N`) are marked as pre-releases.
4. Review the draft release and publish it.

A release can be installed from its tarball:

```sh
npm install https://github.com/hexlabelposition/svml/releases/download/vX.Y.Z/svml-X.Y.Z.tgz
```
