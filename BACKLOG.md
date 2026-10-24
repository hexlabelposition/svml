# Backlog

Work is grouped into milestones in the intended order. Milestones are not dates. Architectural decisions referenced as D1–D13 are described in [ARCHITECTURE.md](./ARCHITECTURE.md).

## v0.0 — Project setup

- [x] Verify the `svml` name on npm and GitHub; the overlap with Intel's Short Vector Math Library (SVML) does not matter: different ecosystem, and the npm name is free
- [ ] Create the repository with MIT license, README, ARCHITECTURE, BACKLOG, CONTRIBUTING
- [x] Tooling: Bun, tsdown, TypeScript 6 (library, tests, scripts projects), Vitest 5 (node + browser), fast-check, ESLint, Prettier, publint, attw
- [x] `package.json`: `"type": "module"`, `"sideEffects": false`, `engines.node >= 22`, `exports` for `.` and `./package.json`
- [x] tsdown: one entry (`src/index.ts`), `platform: "neutral"`, `target: "es2022"`
- [x] Add the `packageManager` field
- [x] Finalize the dependency policy (D13), including whether Dependabot covers npm packages
- [ ] Create the folder structure from ARCHITECTURE §3
- [x] ESLint boundary rules: imports only through folder `index.ts`, no cycles, `internal/` not exported
- [x] Workflows: CI (Node 22/24/26, Bun 1.2.23 + latest, Chromium/Firefox/WebKit), docs check, tag-based release with staged trusted publishing
- [x] Dependabot for GitHub Actions (SHA pins, weekly, 7-day cooldown)
- [ ] CONTRIBUTING: Bun commands, Conventional Commits, release steps

## v0.1 — serde + attributes

### ast

- [ ] Node types from ARCHITECTURE §2 (D4)
- [ ] `getRoot(document)`
- [ ] Type guards: `isElement`, `isText`, `isCData`, `isComment`, `isInstruction`, `isDoctype`
- [ ] `clone(node)` — deep copy, keeping `position` when present
- [ ] Traversal: `walk(node, visitor)` with the parent passed to the visitor; skipping and stopping
- [ ] Queries: `find` / `findAll` by predicate or element name

### serde

- [ ] `parse(input, options)` — strict, with `whitespace` and `positions` options (D10)
- [ ] `stringify(document, options)` — compact and `pretty` output
- [ ] `SvgParseError` with stable codes, `line`, `column`, `offset` (D12)
- [ ] Parse limits and entity handling: no external entities, text entities expanded with limits (D11)
- [ ] Round-trip guarantees from ARCHITECTURE §5 (D6), with property-based tests
- [ ] Corpus tests: icon sets and editor exports (Figma, Illustrator, Inkscape, SVGO inputs) with their licenses
- [ ] Benchmarks against svgson and svg-parser; README numbers come only from them

### attributes

- [ ] Decide which helpers belong in v0.1 (ARCHITECTURE §6): `style` property editing, `class` token editing, effective value, bulk operations
- [ ] Implement the chosen helpers with tests on the icon and editor corpus
- [ ] Decide whether mutating helpers return `void` or the node for chaining

### Release

- [ ] TSDoc on every public export
- [ ] publint and attw pass
- [ ] Publish `svml@0.1.0`

## v0.2 — spec types

- [ ] Choose sources for SVG 1.1 and SVG 2 element/attribute data (W3C specs, MDN browser-compat-data, webref)
- [ ] `scripts/generate-spec` producing `src/spec/generated`
- [ ] Types: which attributes each element accepts, per SVG version
- [ ] Value types per attribute (length, color, path data, enumerations, …)
- [ ] Runtime lookups: is an attribute valid for an element in a given version
- [ ] Typed attribute reads (`getNumber`, `getLength`, …)

## v0.3 — colors

- [ ] Value level: `parseColor`, `formatColor`, normalization (hex, rgb, hsl, named colors, `currentColor`)
- [ ] AST level: `extractColors`, `replaceColor`
- [ ] Defined behavior for `style` attributes, `<style>` elements, `url(#gradient)` references and inheritance

## v0.4 — paths

- [ ] `parsePath`, `stringifyPath`
- [ ] Normalization: relative → absolute, shorthand → full commands
- [ ] Defined numeric precision and output formatting

## Later

- [ ] geometry: bounds, center, path length
- [ ] transforms: matrix parsing and composition, applying transforms to paths
- [ ] optimization passes
- [ ] Deno in CI

## Open questions

- What exactly does `attributes` offer beyond plain object access?
- Do mutating helpers return `void` or the node?
- Is a lenient parse mode ever worth adding, given strict parsing is a stated guarantee (D10)?
- Which spec sources are authoritative for SVG 2, given parts of it are not implemented by browsers?
- JSX/TSX generation or React integration: added only when there is a real need, as a subpath export or a separate package (D7).
