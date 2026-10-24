# Architecture

This document records the decisions behind svml — SVML (Scalable Vector Markup Library) — and the rules that keep the codebase consistent. Decisions marked **Accepted** are settled; **Proposed** ones are still under discussion. When a decision changes, update it here rather than leaving it implicit in code.

## 1. Decision log

| #   | Decision                                                                                                     | Status   |
| --- | ------------------------------------------------------------------------------------------------------------ | -------- |
| D1  | Single npm package `svml` — SVML (Scalable Vector Markup Library), MIT, TypeScript, ESM-only                 | Accepted |
| D2  | Zero runtime dependencies                                                                                    | Accepted |
| D3  | The parser, serializer and AST are part of svml itself, not a dependency on another SVG library              | Accepted |
| D4  | The AST is made of plain objects, mutated in place and copied explicitly with `clone()`                      | Accepted |
| D5  | Pure JavaScript, no DOM: Node.js ≥ 22, Bun, browsers                                                         | Accepted |
| D6  | Round trips are lossless at the tree level; lexical details are normalized (section 5)                       | Accepted |
| D7  | Single entry point `svml`; subpath exports are added only when a feature needs its own dependencies or types | Accepted |
| D8  | Source organized as folders inside one package, not as workspace packages                                    | Accepted |
| D9  | v0.1 scope: `serde` + `attributes`                                                                           | Accepted |
| D10 | Parsing is strict: only well-formed XML is accepted                                                          | Accepted |
| D11 | Parsing is safe for untrusted input: no external entities, configurable resource limits                      | Accepted |
| D12 | Parse errors are `SvgParseError` with stable `code` values and a source position                             | Accepted |
| D13 | Dependency pinning policy (section 8)                                                                        | Proposed |

## 2. Data model

The AST is the public contract of the whole library: every module reads and writes it.

```ts
interface SvgDocument {
  type: "document";
  declaration?: XmlDeclaration; // <?xml version encoding standalone?>
  children: SvgDocumentChild[]; // exactly one SvgElement among them
}

interface SvgElement {
  type: "element";
  name: string; // qualified name as written: "svg", "sodipodi:namedview"
  attributes: Record<string, string>;
  children: SvgNode[];
  position?: SvgPosition;
}

interface SvgText {
  type: "text";
  value: string;
  position?: SvgPosition;
}
interface SvgCData {
  type: "cdata";
  value: string;
  position?: SvgPosition;
}
interface SvgComment {
  type: "comment";
  value: string;
  position?: SvgPosition;
}
interface SvgInstruction {
  type: "instruction";
  target: string;
  value: string;
  position?: SvgPosition;
}
interface SvgDoctype {
  type: "doctype";
  value: string;
  position?: SvgPosition;
}

type SvgNode = SvgElement | SvgText | SvgCData | SvgComment | SvgInstruction;
type SvgDocumentChild =
  | SvgElement
  | SvgText
  | SvgComment
  | SvgInstruction
  | SvgDoctype;

interface XmlDeclaration {
  version: string;
  encoding?: string;
  standalone?: "yes" | "no";
}
interface SvgSourcePoint {
  line: number;
  column: number;
  offset: number;
}
interface SvgPosition {
  start: SvgSourcePoint;
  end: SvgSourcePoint;
}
```

Rules:

- **Attribute values are strings** with character and entity references decoded, and tabs and line breaks replaced by spaces as XML requires. Typed parsing (numbers, lengths, colors, path data) lives in the modules that need it.
- **Attribute order is the object's insertion order**, kept by `stringify()`. This is reliable because XML names cannot start with a digit.
- **Namespaces are kept as written.** Prefixes stay in names; `xmlns` declarations are ordinary attributes. Namespace URIs are not resolved; undeclared prefixes are rejected by the parser.
- **The XML declaration is a field, not a node.** Set or delete `declaration` to control whether `stringify()` writes it.
- **Doctype appears only at document level; CDATA only inside elements.** The two child unions encode this.
- **Positions are optional**, added only with `parse(…, { positions: true })`. They describe the parsed source, are ignored by `stringify()` and are not updated when the tree changes.
- **No classes, no parent pointers.** The tree is plain data: it can be stored as JSON or sent to a worker. Traversal helpers pass the parent to callbacks instead.
- **Mutation is the default.** Editing is plain object editing (`el.attributes.fill = "red"`, `delete el.attributes.style`, splicing `children`). Helper functions mutate too. `clone(node)` makes a deep copy.

New node fields may only be added as optional fields. Changing or removing an existing field is a major release.

## 3. Module structure

One package, organized by domain folders. Each folder is treated as an internal package with an explicit public surface. Unit tests sit next to the code they test.

```text
svml/
├── src/
│   ├── index.ts            # root entry: re-exports the public API of each module
│   ├── ast/                # node types, getRoot, clone, walk/find, type guards
│   │   ├── types.ts        #   node types
│   │   └── index.ts
│   ├── serde/              # parser and serializer
│   │   ├── parse.ts        #   parse, ParseOptions
│   │   ├── stringify.ts    #   stringify, StringifyOptions
│   │   ├── errors.ts       #   SvgParseError, SvgParseErrorCode
│   │   ├── entities.ts, doctype.ts, declaration.ts, namespaces.ts, whitespace.ts, position.ts
│   │   ├── *.test.ts
│   │   └── index.ts
│   ├── attributes/         # attribute helpers (section 6)
│   │   └── index.ts
│   ├── spec/               # element and attribute data per SVG version
│   │   ├── generated/      # output of scripts/generate-spec, committed
│   │   └── index.ts
│   ├── colors/             # later
│   ├── paths/              # later
│   └── internal/           # shared helpers (XML character rules, …), never exported
├── test/
│   ├── corpus.test.ts      # every fixture parses, round-trips, prints stably
│   └── fixtures/           # Figma, Illustrator, Inkscape, SVGO inputs + licenses/
├── scripts/
│   ├── benchmarks/         # vitest bench suites vs svgson and svg-parser
│   └── generate-spec/      # builds src/spec/generated from spec sources
├── .github/                # CI, docs, release workflows; Dependabot
├── README.md
├── ARCHITECTURE.md
├── BACKLOG.md
└── CONTRIBUTING.md
```

### Boundary rules

1. **A folder's `index.ts` is its public boundary.** Code outside a folder imports only from that folder's `index.ts`, never from its internal files. Enforced with ESLint (`no-restricted-imports` or `eslint-plugin-boundaries`).
2. **Dependencies flow one way** and never form cycles:

   ```text
   internal ← ast ← serde
                  ← attributes ← colors
                  ← spec
   ```

3. **Value-level utilities do not depend on `ast`.** Functions like `parsePath("M0 0 L10 10")` or `parseColor("#fff")` work on strings, so they are usable with framework props, DOM attributes or any other source. AST-level functions (`replaceColor(doc, …)`) are built on top of them.
4. **`internal/` is never exported**, directly or through re-exports.
5. **A future separate package** is extracted from a folder into a workspace only when it needs its own dependencies or release cycle.

## 4. Public API

- `svml` is the only entry point and exports the whole public API.
- `package.json` `exports` lists exactly `.` and `./package.json`; tsdown builds one entry (`platform: "neutral"`, `target: "es2022"`, ESM, `.d.ts`).
- Core exports: `parse`, `stringify`, `getRoot`, `clone`, `SvgParseError` and all node and option types.
- Every exported function has an explicit return type and TSDoc comment.
- Every build is validated with publint and arethetypeswrong (`esm-only` profile, `error` level).

## 5. Parsing and serialization

### Parsing

- Input is a string; streaming is out of scope.
- **Strict (D10).** Only well-formed XML is accepted. SVG embedded in HTML has to be extracted as well-formed XML first.
- **Errors (D12).** `parse()` throws `SvgParseError` with `code`, `line`, `column` and `offset`. Codes: `MALFORMED_XML`, `MISSING_ROOT`, `UNDECLARED_PREFIX`, `UNDEFINED_ENTITY`, `EXTERNAL_ENTITY`, `UNSUPPORTED_ENTITY` and the `MAX_*_EXCEEDED` limit codes. Existing codes change only in major releases; new codes may appear in minor ones; message text may change at any time.
- **Safe for untrusted input (D11).** External entities are never loaded. `ParseOptions` limits input length (64 Mi chars), nesting depth (1,024), entity expansions (10,000) and expanded text length (1 Mi chars) by default.
- **Entities.** Text entities declared in the internal DTD subset are expanded (Adobe Illustrator uses them). Entities containing markup throw `UNSUPPORTED_ENTITY`. The DTD is otherwise not interpreted: no parameter entities, no `<!ATTLIST>` defaults.
- **Options.** `whitespace: "preserve" | "trim"` (default `preserve`; `trim` drops whitespace-only text between elements, never inside text content) and `positions: boolean`.

### Serialization

- Compact by default; `pretty: true` with `indent` (default 2) indents element-only content and never touches text content.
- Text and attribute values are escaped as needed, and every character is checked to be allowed in XML.

### Round-trip guarantee (D6)

- For any document from `parse()`, `parse(stringify(doc))` is deeply equal to `doc`. With `pretty: true` the same holds once whitespace-only text between elements is ignored.
- Kept: element order, text including whitespace, comments, CDATA, processing instructions, the XML declaration, DOCTYPE, namespaces, attribute order, unknown elements and attributes.
- Normalized: quote style, entity spelling and whitespace inside tags.

### Performance rules

- No regexes over the whole document, no intermediate token arrays where a single pass works, no repeated parsing within one operation chain.
- Benchmarks measure the built `dist/`, the same entry point consumers use. Claims about speed in docs must come from the benchmark suite.

## 6. Attributes module

Because attributes are already a plain object, `attributes` must add behavior that plain access does not give, not wrap `el.attributes[name]` in functions. Candidates for v0.1, to be confirmed:

- `style` attribute: parse to and write from a property map; get, set and remove one property while keeping the rest of the text.
- `class` attribute: has, add, remove, toggle without duplicating or reordering tokens.
- Effective value: an attribute versus the same property in `style`, following CSS precedence.
- Bulk operations across a tree: rename, remove or set an attribute on every matching element.

Typed reads (`getNumber`, `getLength`, …) depend on the spec data and come with v0.2.

## 7. Tooling

| Purpose                           | Tool                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| Package manager and script runner | Bun (`bun.lock`, `bun install --frozen-lockfile` in CI)                                         |
| Language                          | TypeScript 6 (three projects: library, tests, scripts)                                          |
| Build                             | tsdown with publint and attw validation                                                         |
| Unit, property and corpus tests   | Vitest 5, `node` project                                                                        |
| Browser tests                     | Vitest browser mode with Playwright: Chromium, Firefox, WebKit                                  |
| Property-based tests              | fast-check                                                                                      |
| Benchmarks                        | `vitest bench` (Tinybench), sequential, one worker, vs svgson and svg-parser                    |
| Lint                              | ESLint 10 + typescript-eslint, eslint-config-prettier, `eslint.config.ts` via jiti              |
| Format                            | Prettier, including a separate Markdown check                                                   |
| Icon corpus                       | Simple Icons, Bootstrap Icons, Tabler Icons                                                     |
| Editor corpus                     | Checked-in Figma, Illustrator, Inkscape exports and SVGO regression inputs, with their licenses |

**CI** (GitHub Actions, actions pinned to commit SHAs):

- Lint, format check, type check and build on Node.js 24.
- Tests on Node.js 22, 24 and 26 (minimum, active LTS, current).
- Tests on Bun 1.2.23 and latest.
- Tests in Chromium, Firefox and WebKit.
- Markdown formatting check.

**Release:** pushing a `vX.Y.Z` tag that matches `package.json` runs CI, builds the tarball once, and stages it with npm trusted publishing and provenance. The version becomes installable only after a maintainer approves it with 2FA. A GitHub release is created from the same tag.

**Conventions:** Conventional Commits (`feat`, `fix`, `perf`, `docs`, `test`, `build`, `ci`, `chore`); release commits are `chore: release X.Y.Z`. Workflow changes are checked with actionlint.

**Testing rules:**

- Every parser change keeps the round-trip property: `parse(stringify(parse(x)))` equals `parse(x)`.
- Every corpus file and every icon parses, round-trips and produces stable compact and pretty output.
- Third-party fixtures keep their licenses in `test/fixtures/licenses/` and are never shipped in the package.

## 8. Dependency policy (Proposed)

- **Runtime dependencies:** none.
- **GitHub Actions:** pinned to commit SHAs, updated weekly by Dependabot with a 7-day cooldown.
- **Tooling** (tsdown, vitest, eslint, …): caret ranges (`^`), `bun.lock` committed. Exception: TypeScript uses a tilde range (`~`), because typescript-eslint supports only specific TypeScript minor versions. Whether Dependabot also covers npm packages, and with what cooldown, is still open.
- **Anything that affects test or benchmark results** — benchmark competitors (svgson, svg-parser) and icon sets — is pinned to **exact versions**, so snapshots and benchmark numbers change only when the code changes.
- The package manager is declared in the `packageManager` field.

## 9. Compatibility

- svml works with SVG/XML markup. It does not parse JSX: JSX attributes can contain arbitrary JavaScript expressions.
- No DOM APIs are used in `src/`. Browser support means "runs in a browser", not "integrates with live DOM nodes".
- Node.js ≥ 22 is the minimum. Bun is tested from 1.2.23. Deno is expected to work but is not tested yet.

## 10. Non-goals

- Rendering, canvas or editor UI.
- Parsing JSX/TSX.
- Sanitizing SVG. The parser is safe to _run_ on untrusted input, but its output keeps scripts, event handlers and external references and must not be treated as safe to inject into a page.
- Interpreting the DTD beyond text entities, or resolving namespace URIs.
- Full SVGO-level optimization in early versions.
- Complete coverage of the SVG specification before v1.0.
