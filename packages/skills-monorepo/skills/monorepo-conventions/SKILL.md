---
name: monorepo-conventions
description: Repo layout rules for this npm-workspaces monorepo, including what may sit at a package root (config only, code in src/). Use when naming a package or the repo root, creating a folder under a workspace root (src/apps, src/packages, src/plugins, src/utils, tests, tools), depending on another org repository (`github:` dependencies, sharing packages with `packager hoist`, `packager link`, package-local.json, the metapak plugin) or adding a third-party git submodule, choosing where build output, caches, logs, or temporary files go, adding files at a package root, or writing imports between files in a package.
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

The scopes above are for packages used only inside this repository. A package that another repository consumes, or that gets published, is named `@px-petals/<area>.<name>` instead, with a dot between the area and the name (`@px-petals/shell.ws-run`). Other repositories get it through the root's `packager.hoist` (see [Providers](#providers--packagerhoist)), and import it by that name.

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

## Other org repositories → `github:` dependencies on their root

Code from another org repository (`web.toolkit`, `shell.toolkit`, `web.components`, a shared app such as `app.block-cms`, …) is an npm dependency on that repository's **root** package, never a submodule. npm can't install a subfolder of a git repository, so the root is the only thing a consumer declares:

```json
{
  "devDependencies": {
    "@px-petals/shell.toolkit": "github:pixel-petals/shell.toolkit",
    "@px-petals/web.toolkit": "github:pixel-petals/web.toolkit"
  }
}
```

Code imports the provider's shared packages by **their own names**, as if each were installed on its own: `@px-petals/web.config/eslint`, `@px-petals/shell.ws-run`, `@package/blocks`. Configs (`extends`), bins and scripts use those names too. `packager link` provides them (see [Consumers](#consumers--packager-link)).

- **Never a sub-package name in `package.json`.** Depend on `@px-petals/web.toolkit`, not `@px-petals/web.config`: npm would look a sub-package name up on the registry.
- **No `file:` dependencies or `workspaces` globs** reaching into another repository's folders, and no org repository as a submodule.
- **`allow-git=all`** in `.npmrc` is required: npm 12 refuses git dependencies by default.
- **Lockfile:** it pins the provider's commit as `git+ssh://git@github.com/pixel-petals/<repo>.git#<sha>`. `npm update <provider root>` moves it to the provider's current `main`.
- **Install-script warnings** (`install scripts blocked … (prepare: …)`) for an org dependency are expected: npm builds a git dependency's `prepare` in its own temp clone. Don't add `allowScripts` entries for org repositories, and don't set `ignore-scripts=true` in `.npmrc`, which would skip that build and the `dependencies` script.
- **CI:** every private org repository the install fetches, transitively, goes in `setup`'s `repositories` input. See the [github-ci](../github-ci/SKILL.md) skill.

### The metapak plugin keeps it in step

Every repository installs the `@px-petals/metapak-dependencies` [metapak](https://github.com/nfroidure/metapak) plugin, from `github:pixel-petals/.dependencies`, instead of wiring the pieces by hand:

```json
{
  "metapak": { "configs": [ "main" ] },
  "devDependencies": {
    "@px-petals/metapak-dependencies": "github:pixel-petals/.dependencies",
    "metapak": "7.1.1"
  }
}
```

| Config | For | Does |
| --- | --- | --- |
| `main` | every npm repository | Rewrites dependencies on org repositories to their `github:` specs, adds `@px-petals/tools.packager` and the `dependencies` script, keeps the plugin and metapak installed, and merges `allow-git=all` into `.npmrc` and `**/package-local.json` into `.gitignore` |
| `provider` | a repository others depend on | Adds the `hoist` and `hoist:check` scripts. A provider lists `[ "main", "provider" ]` |

- **Run it through `metapak-px`:** `npm run metapak` (the plugin sets the script), or `npx metapak-px` on the first run. Plain `metapak` silently does nothing on Windows.
- **After adding or changing a dependency on an org repository,** run `npm run metapak` so its spec is the `github:` one, then `npm install`.
- **metapak moves its key to the top of `package.json` and drops the final newline.** Leave both.
- **In CI** (`CI` set), `npm run metapak` exits 1 on drift, so it is one of the checked scripts.

### Providers → `packager.hoist`

A repository whose workspace packages other repositories use is a provider. A consumer installs only its root, and npm plans that install from the root `package.json` as committed, so the root must already declare everything its shared packages need. `packager hoist` generates that:

```json
{
  "version": "1.0.0",
  "packager": {
    "hoist": [ "src/packages/*", "src/plugins/*", "!src/packages/argtypes-diff" ],
    "root": {
      "dependencies": { "better-auth": "1.4.0" }
    }
  }
}
```

- **`packager.hoist`** names the shared packages: only what other repositories use, plus what those import from this repository. `!` globs exclude.
- **`packager.root`** holds what the root needs for itself, such as app dependencies or pinned platform bindings in `optionalDependencies`. `hoist` removes any root `dependencies`, `optionalDependencies`, peers or `bin` that neither a shared package nor `packager.root` declares, and lists them, so read that list.
- **`npm run hoist`** writes the shared packages' dependencies, peers, bins and `files` into the root `package.json`, which is committed. Rerun it after changing a shared package's manifest. `npm run hoist:check` exits 1 on drift and runs in CI.
- **Fix what it reports in the sub-package, not the root.** A conflict means shared packages need incompatible versions: align them, or, for a tool the root also uses as a devDependency at another version, make it an optional peer in the sub-package. An unshared dependency means a shared package depends on a workspace package that isn't shared: share it, or drop the dependency.
- **Each shared package declares `files`** (`[ "src", "!src/**/.tests" ]`), or its whole folder ships. Its own `package.json` always ships.
- **The root needs a `version`:** npm packs a git dependency.

### Consumers → `packager link`

The `main` config adds the lifecycle script that links shared packages:

```json
{
  "scripts": {
    "dependencies": "packager link || exit 0"
  }
}
```

- npm runs the root `dependencies` script after every command that changes `node_modules` (`install`, `ci`, `update`, `uninstall`, …). `packager link` links each installed provider's shared packages into `node_modules` **by their own names**, so `package.json` and the lockfile never change.
- A shared package with a `bin` gets a stub folder instead of a junction, so npm's next prune doesn't take the provider's root bins with it.
- `npm ls` lists the links as extraneous. That's expected.
- `|| exit 0` keeps `npm ci --omit=dev` working, where the bin isn't installed. Such an install gets no links.

### Sibling checkouts → `package-local.json`

To work against sibling checkouts instead of the GitHub copies, a git-ignored `package-local.json` beside the root `package.json` maps provider root names to sibling folders, relative to the file:

```json
{
  "links": {
    "@px-petals/web.toolkit": "../../tools/web"
  }
}
```

- `packager scan [folder...]` writes it for every repository under the folders. From the umbrella workspace, `npm run scan --prefix <workspace>` does it for every checkout. Then run `npm install` in the repository.
- `packager link` links each listed root to its sibling, then the shared packages from it, so they come from the sibling's working tree.
- A link exposes the sibling as it is: a provider whose root exports a built dist (web.toolkit's `.artifacts/dist`) needs its `prepare`, build or watch run there first.
- After editing the file by hand, run `npx packager link`: an `npm install` that changes nothing skips the script. Delete the file and run `npm install` to go back to the GitHub copies.
- **Never commit it.** Without it, as in CI or a standalone clone, `packager link` links only the installed providers' shared packages.
- Don't use `npm link`, `file:` paths, or cross-repository workspaces for this: each gets undone by the next install or leaks a local path into committed files.

## Third-party code → `src/.submodules/`

Code vendored from outside the org (a repository whose URL isn't under `pixel-petals`) can be a git submodule:

```sh
git submodule add -f <url> src/.submodules/<name>
```

`<name>` is the repository name. Don't put submodules at the repo root or inside a workspace package. Never add an org repository as a submodule; depend on its root as above.

`-f` is required because `.gitignore` ignores every folder in `src/.submodules/`. That way, a folder that was never registered as a submodule can't be committed as plain files. Once a submodule is registered, git tracks it as a pointer to a commit, and the ignore rule doesn't affect it: new commits in the submodule still show up in `git status` and can be committed as usual. Don't remove the ignore rule to avoid needing `-f`.

- After cloning, and after any submodule bump, run `git submodule update --init --recursive`.
- Third-party install scripts are gated per package by npm's `allowScripts` in the root `package.json` (`npm install-scripts ls`, `approve`, `deny`). Review a submodule bump like any other code change.

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
