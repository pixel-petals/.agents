---
name: javascript
description: JavaScript coding standards for this repo — code style, JSDoc types, non-strict type checking, the shared root tsconfig, barrels, and Vitest tests. Use when writing or reviewing any .js file, adding type annotations, creating a tsconfig.json or tests for a workspace package, or running lint, typecheck, or tests.
---

# JavaScript Standards

Source is plain ESM JavaScript on Node 24 (pinned by the root `.nvmrc` and `engines.node`). TypeScript is only a type checker: nothing is compiled from `.ts`, and `tsc` never emits.

## Code style

- No semicolons. Single quotes.
- ESM `.js` files only. Every package is `"type": "module"`, so don't use `.mjs` or `.cjs`.
- Class internals use real `#private` fields and methods, not `_underscore` names or `@private` tags.
- Line up the tag, type, name, and description columns in doc blocks. `npm run lint` checks this (`jsdoc/check-line-alignment`) and `eslint . --fix` repairs it.

## Types through JSDoc

Annotate in JSDoc, not in `.ts` files.

```js
/** @import { Point } from '#lib/geometry.js' */

/**
 * @typedef {object} Bounds
 * @property {Point} min
 * @property {Point} max
 */

/**
 * Smallest box containing every point.
 *
 * @param   {Point[]} points
 * @returns {Bounds}
 */
export function boundsOf(points) { ... }
```

- Import types with an `@import` tag at the top of the file, not inline `import('./x.js').Type` expressions.
- Name any type that is used more than once, or that is longer than a line, with `@typedef`. Don't repeat an inline object type.
- Use `@template` for generics and `@satisfies` to check a literal against a type without widening it.
- Annotate function boundaries (`@param`, `@returns`) and anything `tsc` cannot infer. Leave inferable locals alone.
- A `.d.ts` file is allowed only for what JSDoc cannot express: declaration merging, or an ambient module for a dependency or asset that ships no types. Name it `<cluster>.types.d.ts`, place it beside the code it describes, and add a doc block explaining why it exists.
- `// @ts-ignore` and `// @ts-expect-error` must carry a reason on the same line: `// @ts-ignore — jsdom has no matchMedia`.

## Type checking

Checking is deliberately loose. It catches wrong shapes and misspelled members, not every possible `null`.

- `strict: false`. Don't turn on `strict` or its individual flags (`strictNullChecks`, `noImplicitAny`, …) in a package.
- `skipLibCheck: true`. Errors inside dependencies' `.d.ts` files are not ours to fix. Don't add `node_modules` to `include`, and don't write local `.d.ts` patches over a library's types to silence it.

## Shared tsconfig

Compiler options live once for the whole org, in the `tsconfig.base.json` of `@px-petals/web.config`. It is a shared package of `web.toolkit`: the repo depends on `@px-petals/web.toolkit` (`github:pixel-petals/web.toolkit`), and `packager link` provides `@px-petals/web.config` by its own name (see the [monorepo-conventions](../monorepo-conventions/SKILL.md) skill). The repo's root `tsconfig.base.json` extends it and adds only `exclude`, which has to resolve from the repo root:

```jsonc
// tsconfig.base.json
{
  "extends": "@px-petals/web.config/tsconfig.base.json",
  "exclude": ["**/node_modules", "**/.artifacts"]
}
```

Each workspace package has its own `tsconfig.json` that extends the root file and adds only what is specific to that package:

```jsonc
// src/apps/example/tsconfig.json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    // runs in a browser
    "lib": ["esnext", "dom", "dom.iterable"]
  },
  "include": [
    "src/**/*.js",
    "src/**/*.d.ts",
    "src/**/.*/**/*.js",
    "src/**/.*/**/.*/**/*.js"
  ]
}
```

- Put `include` in the package config, never the base. It resolves relative to the file that declares it.
- TypeScript's `**` doesn't match dot-prefixed folders, so `src/**/*.js` alone silently skips `.tests/`, `.features/`, and `.poc/`. Each extra `.*/**/` segment reaches one more level of dot folder. Two levels covers `.features/<name>/.tests/`.
- The root base's `exclude` keeps `.artifacts/` and `node_modules/` out. A package that sets its own `exclude` replaces that list, so it must restate both.
- Overriding an array option such as `lib` or `types` **replaces** the base value; it doesn't merge. Restate `esnext` when adding `dom`.
- Environment-specific settings (`lib: dom`, `types: ["vite/client"]`) belong in the package that needs them, not the base.
- A setting every package in this repo needs goes in the root `tsconfig.base.json`. Change the shared base in `web.toolkit` only for settings every repo should share.
- Tests are type-checked too. Don't exclude `.tests/` from `include`.

## Barrels and folders

- Each cluster folder exposes an `index.js` that re-exports its public surface, namespaced when the names would otherwise collide: `export * as status from './status/index.js'`.
- Proof-of-concept and opt-in feature folders are dot-prefixed (`.poc/`, `.features/`). Barrels and generated catalogues skip them, so don't re-export them from an `index.js`.

## Tests

- Vitest is the runner. Import its API explicitly (`import { expect, test } from 'vitest'`) rather than relying on globals, so `tsc` sees the types.
- Tests are `*.test.js` files in a `.tests/` folder beside the code they cover. See the [docs](../docs/SKILL.md) skill for the folder layout.

## Scripts

Each package defines the scripts that apply to it, and the root runs them across every workspace:

| Package script | Value          | Root script         | Runs                                 |
| -------------- | -------------- | ------------------- | ------------------------------------ |
| `typecheck`    | `tsc -p .`     | `npm run typecheck` | every package's `typecheck`          |
| `test`         | `vitest run`   | `npm test`          | every package's `test`               |
| —              | —              | `npm run lint`      | `eslint .` once, from the root       |

The root `typecheck` and `test` call `ws-run <script>` (`@px-petals/shell.ws-run`, a shared package of the `@px-petals/shell.toolkit` dependency), which runs the script in every workspace that defines it and skips while no workspace package exists yet. Plain `npm run --workspaces` fails in that state.

Lint runs once from the root, because the one flat `eslint.config.js` already covers every package. It builds on `config()` from `@px-petals/web.config/eslint`, whose options cover the usual differences (`ignores`, `globals`, `recommended`). A plugin or rule only this repo uses goes in a block after it:

```js
import { defineConfig } from 'eslint/config'
import { config } from '@px-petals/web.config/eslint'

export default defineConfig([
  ...config({ ignores: [ '**/.wrangler/**' ] }),
  { files: [ '**/*.js' ], rules: { 'no-console': 'error' } },
])
```

Don't add a package-level ESLint config unless the package needs rules the rest of the repo doesn't.

`typescript`, `vitest`, and `eslint` are root devDependencies, pinned exactly. Don't add them to a package. A package script finds them through the root `node_modules/.bin`. `@eslint/js`, `eslint-plugin-jsdoc`, and `globals` come with `@px-petals/web.config`, which web.toolkit's root declares for it, so don't add them anywhere. Never add `@px-petals/web.config` or `@px-petals/shell.ws-run` to `package.json` either: the root dependencies on `@px-petals/web.toolkit` and `@px-petals/shell.toolkit` provide them.
