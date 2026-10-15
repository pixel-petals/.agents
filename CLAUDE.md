# CLAUDE.md

npm-workspaces monorepo. Workspace roots are the `workspaces` globs in [package.json](package.json).

## Conventions

Load the `skills-monorepo:monorepo-conventions` skill before doing any of the following. It has the full steps.

- **New workspace package:** any new folder that matches a `workspaces` glob. Name it `@<scope>/<folder>`, where the scope is the workspace root made singular (`src/apps/example` → `@app/example`). Add a root passthru script `"app:example": "npm run --workspace @app/example --"`.
- **Shared package names:** a package another repo consumes, or that gets published, is `@px-petals/<area>.<name>` (`@px-petals/shell.ws-run`). The root is `@px-petals/<repo-name>`: rename the template's `@px-petals/org.template` in a new repo.
- **Temporary / ignored files:** put them in `.artifacts/<kind>/` (`dist`, `cache`, `coverage`, `logs`, `tmp`), in the package's own folder or at the repo root. Never use a sibling `dist/`, `build/`, or `out/` folder.
- **Package layout:** no loose code files at a package root. Code lives in `src/`. The root holds only `package.json`, `readme.md`, `tsconfig.json`, dot-folders, and tool config files.
- **Other org repositories:** depend on the provider repository's **root**, never a submodule or a `file:` path: `"@px-petals/web.toolkit": "github:pixel-petals/web.toolkit"`. Import its shared packages by their own names (`@px-petals/web.config/eslint`, `ws-run` from `@px-petals/shell.ws-run`); never put a sub-package name in `package.json`, since npm would look it up on the registry. Org install-script warnings are expected; don't add `allowScripts` for org repositories.
- **metapak plugin:** `"metapak": { "configs": [ "main" ] }` with the `@px-petals/metapak-dependencies` (`github:pixel-petals/.dependencies`) and `metapak` devDependencies keeps the `github:` specs, `@px-petals/tools.packager`, the `dependencies` script (`packager link`), `allow-git=all` in `.npmrc` and the `package-local.json` ignore rule in step. Run `npm run metapak` after changing an org dependency, then `npm install`. It moves its key to the top of `package.json` and drops the final newline; leave both. CI runs it, and it exits 1 on drift there.
- **Providers:** a repository whose workspace packages other repositories use lists `[ "main", "provider" ]`, names those packages in `"packager": { "hoist": [ "<glob>", "!<excluded>" ] }` (root-only entries in `packager.root`), has a `version`, and commits what `npm run hoist` writes into the root `package.json`. CI also runs `hoist:check`.
- **Sibling checkouts:** a git-ignored `package-local.json` links provider roots to local checkouts instead of the GitHub copies. `packager scan` writes it (`npm run scan --prefix <workspace>` from the umbrella workspace), then `npm install`; after a hand edit, `npx packager link`. Never commit it.
- **Third-party submodules:** code from outside the org goes in `src/.submodules/<name>` (`git submodule add -f`). Run `git submodule update --init --recursive` after cloning or bumping one. Never add an org repository as a submodule.
- **Workspace file:** `package.code-workspace` opens the repo root plus every third-party submodule at any depth, one folder per repository at its shallowest path. Rename the template's `.template` root folder in a new repo, and add or remove a folder whenever a submodule is added or removed. Org repositories are not listed.
- **Import aliases:** use Node `#` subpath imports declared in the package's `package.json` `imports` field. Never use tsconfig `paths` or bundler aliases.

## JavaScript

Load the `skills-monorepo:javascript` skill before writing or reviewing `.js` files or any `tsconfig.json`.

- **Style:** no semicolons, single quotes, `.js` only (all ESM), and `#private` class members.
- **Types through JSDoc:** source is plain JS, typed with JSDoc (`@import`, `@typedef`, `@param`). Use `.d.ts` only for what JSDoc cannot express.
- **Loose checking:** `strict: false` and `skipLibCheck: true`. Don't tighten either per package.
- **Shared tsconfig and ESLint:** compiler options and lint rules come from `@px-petals/web.config`, a shared package of the `@px-petals/web.toolkit` dependency. The root [tsconfig.base.json](tsconfig.base.json) extends it, adding only `exclude`, and [eslint.config.js](eslint.config.js) builds on its `config()`. Each package's `tsconfig.json` extends the root base and adds only its own `include` and environment settings.
- **Tests:** Vitest, with `*.test.js` in a `.tests/` folder beside the code. Tests are type-checked too.
- **Folders:** each cluster has an `index.js` barrel. `.poc/` and `.features/` are dot-prefixed so barrels skip them.
- **Scripts:** `npm run typecheck` and `npm test` run in every workspace through `ws-run` (`@px-petals/shell.ws-run`, from the `@px-petals/shell.toolkit` dependency), which skips while there are none. `npm run lint` runs ESLint once from the root.

## Docs

Load the `skills-monorepo:docs` skill before writing or moving any markdown doc.

- **Collocated:** docs live beside the code they describe. `readme.md` is the folder's entry point, `<file>.md` holds docs specific to one file, and `.docs/` holds assets, diagrams, and further docs. Docs about the repo as a whole are handwritten in `src/.docs/`, with `readme.md` the only doc at the repo root.
- **Dot-prefixed:** at every depth, a docs folder is `.docs/` and a tests folder is `.tests/`, never `docs/` or `tests/`. They sort above the code in a folder listing.

## CI/CD

Load the `skills-monorepo:github-ci` skill before creating or editing anything under a `.github/` folder.

- **Shared first:** generic actions and reusable workflows live in `pixel-petals/.devops`. Set up with its `setup` action, which fetches private org repositories; list every one the install fetches, transitively (providers, `tools.packager`, `.dependencies`), in its `repositories` input. Check `metapak` in every repository, and `hoist:check` in a provider. Write a local action only for what this repository alone needs.
- **Workflows compose actions:** a workflow is wiring only, made of `uses:` steps. It has no `run:` steps. If a job needs a script, write an action for it.
- **Sidecar scripts:** an action's `run:` steps only call a script beside its `action.yml` (`action.sh`, or `action.<step>.sh`). Pass inputs through `env:`, never by interpolating `${{ inputs.* }}`.

## Editor

Load the `skills-monorepo:vscode-sync` skill whenever a `package.json` script is added, renamed, removed, or changed.

- **Scripts are the source of truth:** `.vscode/launch.json` and `tasks.json` only call npm scripts and never inline a command.
- **Keep them in sync:** after any script change, update the launch configs, tasks, compounds, and `dependsOn` lists that refer to it.
- **Compounds:** a project with more than one long-running script gets a `<project>: everything` compound that starts them all, dev tools like Storybook included, so nobody has to remember what to turn on. Problem-only watchers such as `tsc --watch` run as folder-open tasks instead.

## This repository

The org's Claude Code plugin marketplace. [readme.md](readme.md) lists the plugins and how to install them.

- **Marketplace:** [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json) lists every plugin, each with a `source` path to a folder under `src/packages/` that holds a `.claude-plugin/plugin.json`. Every repository in the org loads this marketplace, so a `source` that points at a missing folder breaks every session. When moving, adding, or removing a plugin folder, update its `source` and check that each one still resolves.
- **Plugins:** each folder in `src/packages/` is one plugin and one workspace package (`@package/<plugin>`). A rules plugin injects its `rules/` through a `SessionStart` hook in `hooks/hooks.json`; a skills plugin keeps each skill in `skills/<name>/SKILL.md`. A folder under `skills/` or `rules/` is named after the skill or rule, so `skills/docs` is the `docs` skill, not a docs folder.
- **Versions:** the marketplace and every plugin share one version. `npm version <bump>` runs the root `version` script (`sync-version`, from `src/utils/version`), which writes the new version into `marketplace.json` and each plugin's `package.json` and `.claude-plugin/plugin.json`, then stages them. Don't edit plugin versions by hand.
