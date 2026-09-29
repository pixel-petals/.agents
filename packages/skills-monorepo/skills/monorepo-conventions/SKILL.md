---
name: monorepo-conventions
description: Repo layout rules for this npm-workspaces monorepo, including what may sit at a package root (config only, code in src/). Use when naming a package or the repo root, creating a folder under a workspace root (src/apps, src/packages, src/plugins, src/utils, tests, tools), adding a git submodule or a shared tool from another org repo, choosing where build output, caches, logs, or temporary files go, adding files at a package root, or writing imports between files in a package.
---

# Monorepo Conventions

The workspace roots are the `workspaces` globs in the root `package.json`. Re-read that list rather than trusting the table below if the two disagree.

## Adding a workspace package

Any new folder that matches a `workspaces` glob is a package, so it needs a name and a root passthru script.

### Naming

The npm scope is the workspace root's folder name made singular. The package name is the folder name.

| Workspace root   | Scope      | Example folder         | Package name       | Root script       |
| ---------------- | ---------- | ---------------------- | ------------------ | ----------------- |
| `src/apps/*`     | `@app`     | `src/apps/example`     | `@app/example`     | `app:example`     |
| `src/packages/*` | `@package` | `src/packages/example` | `@package/example` | `package:example` |
| `src/plugins/*`  | `@plugin`  | `src/plugins/example`  | `@plugin/example`  | `plugin:example`  |
| `src/utils/*`    | `@util`    | `src/utils/example`    | `@util/example`    | `util:example`    |
| `tests/*`        | `@test`    | `tests/example`        | `@test/example`    | `test:example`    |
| `tools/*`        | `@tool`    | `tools/example`        | `@tool/example`    | `tool:example`    |

### Shared packages → `@px-petals/<area>.<name>`

The scopes above are for packages used only inside this repository. A package that another repository consumes, or that gets published, is named `@px-petals/<area>.<name>` instead, with a dot between the area and the name (`@px-petals/shell.ws-run`).

The root `package.json` follows the same scope, named after the repository: `@px-petals/<repo-name>` (`@px-petals/app.procgen-studio`). The template ships as `@px-petals/org.template`, so a new repository renames it, and points `repository.url` at itself, in its first commit.

### Steps

1. Create the folder, its `package.json`, and a `src/` folder for its code (see [Package layout](#package-layout)). Set at least `name` (from the table) and `"type": "module"`.
2. Add the passthru script to the **root** `package.json`:

   ```sh
   npm pkg set "scripts.app:example=npm run --workspace @app/example"
   ```

   Keep root `scripts` sorted by key so each scope's scripts sit together.

3. Link the new workspace: `npm run setup` if the root defines it, otherwise `npm install`.
4. Add VS Code launch configs and tasks for the package's scripts, as described in the [vscode-sync](../vscode-sync/SKILL.md) skill.

### Package layout

No loose code files at a package's root. All code, including entry points, bins, and scripts, lives under `src/`. The root holds only what describes or configures the package.

```text
src/apps/example/
  .artifacts/        ← ignored output
  .docs/
  src/
    .tests/
    index.js         ← entry point
    server.js
  package.json
  readme.md
  tsconfig.json
  vite.config.js     ← tool config, allowed at the root
```

- **Allowed at the root:** `package.json`, `readme.md`, `tsconfig.json`, dotfiles and dot-folders (`.docs/`, `.artifacts/`, `.github/`, `.env.example`), and tool config files that the tool looks for at the package root (`*.config.js`, `wrangler.jsonc`).
- **Everything else goes in `src/`**, even a package with a single file. Point `exports`, `main`, `bin`, and `imports` into it: `"exports": { ".": "./src/index.js" }`.
- A tool config file stays config. If one grows helpers or logic, move them into `src/` and import them.
- The repo root follows the same rule: its code lives in the workspace packages under `src/`, and the root holds only configuration.

### Using the passthru

The script is `npm run --workspace <name>` with no script name, so the caller supplies one:

```sh
npm run app:example                         # lists @app/example's scripts
npm run app:example dev                     # runs @app/example's `dev`
npm run app:example dev -- -- --port 3000   # forwards flags to `dev`
```

Flags need the doubled `--`: the root script uses up the first one, and a single `--` makes npm reject `--port` as an unknown CLI flag. Positional args (`dev -- foo`) only need one `--`.

## Temporary and ignored files → `.artifacts/`

Anything generated, temporary, or gitignored goes in a `.artifacts/<kind>/` folder, never in a top-level `dist/`, `build/`, `out/`, `coverage/`, or similar sibling folder.

- Package-scoped output goes in that package's `.artifacts/`, e.g. `src/apps/example/.artifacts/dist/`.
- Repo-wide output goes in the root `.artifacts/`.
- Use one subfolder per kind: `dist`, `cache`, `coverage`, `logs`, `tmp`.
- Point each tool there in its config (e.g. Vite `build.outDir`, Vitest `coverage.reportsDirectory`, `tsc` `outDir`). Don't rely on its default location.
- Scratch files you make while working in the repo, such as repro scripts or captured output, go in the nearest `.artifacts/tmp/`.

`**/.artifacts/` is already gitignored. Don't add a new ignore pattern for output that could live there.

## Git submodules → `src/.submodules/`

```sh
git submodule add -f <url> src/.submodules/<name>
```

`<name>` is the repository name. Don't put submodules at the repo root or inside a workspace package.

`-f` is required because `.gitignore` ignores every folder in `src/.submodules/`. That way, a folder that was never registered as a submodule can't be committed as plain files. Once a submodule is registered, git tracks it as a pointer to a commit, and the ignore rule doesn't affect it: new commits in the submodule still show up in `git status` and can be committed as usual. Don't remove the ignore rule to avoid needing `-f`.

### Shared tools from other repositories

A tool from another org repository (the `tools/*` repos, such as `shell.toolkit`) is consumed as a submodule plus a `file:` dependency on the package inside it:

```sh
git submodule add -f ../shell.toolkit.git src/.submodules/shell.toolkit
npm install -D "@px-petals/shell.ws-run@file:src/.submodules/shell.toolkit/packages/ws-run"
```

- Use a relative URL (`../<repo>.git`), so it resolves against whichever remote the parent was cloned from.
- `install-links=true` in `.npmrc` installs the package as a packed copy, not a symlink into the submodule.
- After cloning, and after any submodule bump, run `git submodule update --init --recursive` before `npm ci`. `npm ci` fails on a missing `file:` folder.
- npm packs a `file:` dependency by running its `prepare` in the package's own folder, before its `node_modules` exist, so a prepare-time build must use Node built-ins only. For the same reason `.npmrc` must not set `ignore-scripts=true`: it would skip that build.
- Third-party install scripts are gated per package by npm's `allowScripts` in the root `package.json` (`npm install-scripts ls`, `approve`, `deny`). It does not gate a `file:` dependency's `prepare`, so review a submodule bump like any other code change.
- A private submodule also has to be named in CI's `setup` `repositories` input. See the [github-ci](../github-ci/SKILL.md) skill.

## Import aliases → `#` subpath imports

Use Node's native [subpath imports](https://nodejs.org/api/packages.html#subpath-imports), declared in the `imports` field of the package's own `package.json`. Node resolves these with no build step, and TypeScript follows them under `moduleResolution: node16`, `nodenext`, or `bundler`.

```json
{
  "imports": {
    "#lib/*": "./src/lib/*",
    "#config": "./src/config.js"
  }
}
```

```js
import { parse } from '#lib/parse.js'
```

- Name aliases after the folder they map (`#lib/*`, `#routes/*`). Avoid the bare `#/*` form: it only works on newer Node versions.
- Map folders without an extension and write the extension in the import, the same way as a relative ESM import.
- Aliases are private to their package. To use code from another package, depend on it by package name (`@package/example`) and its `exports`, not by reaching into its files.
- Don't use tsconfig `paths`, bundler `resolve.alias`, or `@/` / `~/` prefixes. They break under plain `node`.
