# svml

**SVML (Scalable Vector Markup Library)** is a fast, modular, type-safe toolkit for working with SVG as structured data.

> [!WARNING]
> **Status: pre-alpha.** svml is in the design phase. Releases are published on [GitHub](https://github.com/hexlabelposition/svml/releases) only, and every API shown below is a draft that may change. See [BACKLOG.md](./BACKLOG.md) for what is planned and [ARCHITECTURE.md](./ARCHITECTURE.md) for how it is built.

## Why

Working with SVG in JavaScript today usually means combining several packages - one to parse, one for paths, one for colors, one for bounds - each with its own data format, its own types (or none), and often years without updates.

svml aims to be **one coherent toolkit** built around a single document model:

- **One AST, everywhere.** Parse once, run any number of operations, serialize once.
- **Types first.** Strict public types, including attribute types generated from the SVG specifications.
- **Fast.** Zero runtime dependencies, minimal allocations, benchmarked against existing libraries.
- **Runs anywhere.** Pure JavaScript with no DOM requirement: Node.js, Bun and browsers.

## Core guarantees

- **Lossless round trips.** Element order, text, comments, CDATA, processing instructions, the XML declaration, DOCTYPE, namespaces, attribute order, and unknown elements or attributes all survive parsing and serialization.
- **Strict parsing.** Only well-formed XML is accepted, and every error has a stable code and a source position.
- **Safe for untrusted input.** External entities are never loaded, and input size, nesting depth and entity expansion are limited.
- **Plain data.** No classes, DOM nodes or parent references, so the tree can be stored as JSON or sent to a worker.
- **No implicit interpretation.** Attribute values stay strings until a module explicitly parses them.
- **Measured performance.** Benchmarked against svgson and svg-parser; published numbers come only from the benchmark suite.

## Planned features

| Area                                   | What it covers                                                        | Planned for |
| -------------------------------------- | --------------------------------------------------------------------- | ----------- |
| **serde**                              | Parse SVG into an AST and serialize it back                           | v0.1        |
| **ast**                                | `clone`, traversal, queries, type guards                              | v0.1        |
| **attributes**                         | Helpers for `style`, `class` and bulk attribute edits                 | v0.1        |
| **spec types**                         | Element and attribute types per SVG version, generated from the specs | v0.2        |
| **colors**                             | Extract, normalize and replace colors                                 | v0.3        |
| **paths**                              | Parse, serialize and normalize path data (`d`)                        | v0.4        |
| **geometry, transforms, optimization** | Bounds, lengths, matrices, cleanup                                    | later       |

Versions show the intended order, not dates.

## Usage (draft API)

```ts
import { parse, stringify, getRoot } from "svml";

const doc = parse(
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
);
const svg = getRoot(doc);

// The tree is plain data: edit it directly.
const circle = svg.children[0];
if (circle.type === "element") {
  circle.attributes.fill = "currentColor";
}

stringify(doc);
// <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>

stringify(doc, { pretty: true }); // indented output
```

Operations mutate the document. When you need to keep the original, copy it explicitly:

```ts
import { clone } from "svml";

const copy = clone(doc);
```

Malformed input throws an `SvgParseError` with a stable `code` and the `line`, `column` and `offset` of the problem.

## Key characteristics

- **ESM-only** - no CommonJS build.
- **Zero runtime dependencies.**
- **Tree-shakeable** - `"sideEffects": false`; a single entry point, `svml`.
- **Round trip** - the tree survives `stringify` → `parse` unchanged. Lexical details such as quote style, entity spelling and whitespace inside tags are normalized.
- **Runtimes** - Node.js ≥ 22, Bun ≥ 1.2.23, Chromium, Firefox and WebKit, all tested in CI.

## Non-goals

svml is **not** a JSX parser, a renderer, a visual editor, or a sanitizer. Parsing untrusted SVG is safe, but the result keeps scripts and external references and must not be injected into a page as trusted. svml works with SVG/XML markup, not JSX.

## Name

**SVML** stands for **Scalable Vector Markup Library** and combines **SVG** and **XML**. The package name and the import path are written in lowercase: `svml`.

## Contributing

The project is not open for contributions yet. Development setup and conventions are described in [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
