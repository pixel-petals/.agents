---
name: vscode-sync
description: Keeps .vscode/launch.json (including compounds that start a project's servers together) and .vscode/tasks.json in step with package.json scripts. Use whenever a package.json `scripts` entry is added, renamed, removed, or changed (root or any workspace package), including passthru scripts added for a new workspace package, and whenever editing .vscode launch configs, compounds, or tasks, or adding, removing, or moving a git submodule, or replacing an org submodule with a `github:` dependency (package.code-workspace).
---

# VS Code ↔ npm Scripts Sync

`package.json` scripts are the single source of truth for how to run things. `.vscode/launch.json` and `.vscode/tasks.json` are entry points to those scripts, so every script change needs a check of both files.

## Which scripts belong where

| Script kind                                                                        | VS Code entry                                                        |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Long-running: app servers, build watchers, and dev tools such as Storybook, mock servers, and proxies | `launch.json` configuration (`node-terminal`), plus the project's compound |
| Background checkers that only report problems: `tsc --watch`, lint watchers        | `tasks.json` background task that runs on folder open                |
| One-shot checks with file/line output: typecheck, lint, test                        | `tasks.json` task (`type: npm`) with a problem matcher               |
| Setup, one-off maintenance, migrations, deploys                                    | Nothing. Run them from the terminal.                                 |

Not every script needs an entry. Add one when a person would reasonably start that script from the editor.

## Entry shapes

A launch config runs the npm script in a debug terminal. It uses `node-terminal` rather than `node`, because an npm script spawns its own processes and a debugger attached to the npm wrapper wouldn't follow them.

```jsonc
{
  // why this exists or what it pairs with, not what it does
  "name": "Example app (vite :5173)",
  "request": "launch",
  "type": "node-terminal",
  "command": "npm run app:example dev",
  "cwd": "${workspaceFolder}"
}
```

- Run a workspace package's script through its root passthru (`npm run app:example dev`), so the command is the same one someone would type.
- Name the config `<what> (<how>[ :port])`, e.g. `Example app (vite :5173)`. The port is in the name so the URL can be seen in the Run and Debug list.

A task calls the npm script directly:

```jsonc
{
  "label": "typecheck: example",
  "type": "npm",
  "script": "typecheck",
  "path": "src/apps/example",
  "problemMatcher": ["$tsc"],
  "presentation": { "reveal": "silent", "panel": "dedicated" }
}
```

- `path` is the folder of the `package.json` that owns the script. Leave it out for root scripts.
- Pick a problem matcher that fits the tool (`$tsc`, `$tsc-watch`, `$eslint-stylish`) so failures land in the Problems panel.

**Never inline a command** in `launch.json` or `tasks.json`, whether as a `shell` task, a raw `node` program, or `npx ...`. If an entry needs a command that no script provides, add the script first and point the entry at it. Then the editor and the terminal can't disagree about what running something means.

## Compounds

Someone opening a project shouldn't need to remember which tools to turn on. When a project has more than one long-running launch config, add a compound that starts all of them with one click.

"Long-running" covers dev tools as well as the app: frontend and backend servers, the watchers that rebuild what they serve, Storybook, mock servers, and local proxies. If a developer would normally have it running while working on the project, it goes in the compound.

A project is whatever someone runs together to work on one thing. That can be one workspace package with several servers, or several packages that only work together, e.g. `src/apps/web` calling `src/apps/api`.

```jsonc
"compounds": [
  {
    // the web UI proxies /api to the API server, so neither is useful alone
    "name": "Example: everything",
    "configurations": [
      "Example API (wrangler :8787)",
      "Example web (vite :5173)",
      "Example Storybook (:6006)"
    ],
    "stopAll": true
  }
]
```

- Name it `<project>: everything`.
- Set `"stopAll": true`, so stopping one stops the set rather than leaving half of it running.
- Include every long-running config used while working on the project, dev tools included. Leave out only configs that conflict with another in the set (e.g. two servers on the same port) and ones needed only for rare, specific work (e.g. a variant that only runs under WSL). Add a comment to the compound saying what it leaves out and why.
- When a project has mutually exclusive modes, such as a watch build versus HMR for the same UI, add one compound per mode and name the difference: `Example: everything (HMR)`. Comment on each one to say which configs it swaps.

### Background checkers start on folder open

Watchers that only report problems, such as `tsc --watch`, don't belong in a compound. They run as background tasks that start when the folder opens, so the Problems panel stays live without anyone starting them.

```jsonc
{
  // keeps the Problems panel live on every save
  "label": "typecheck:watch",
  "type": "npm",
  "script": "typecheck:watch",
  "isBackground": true,
  "problemMatcher": ["$tsc-watch"],
  "runOptions": { "runOn": "folderOpen" },
  "presentation": { "reveal": "never", "panel": "dedicated" }
}
```

- The task calls an npm script (e.g. `"typecheck:watch": "tsc -p . --watch --pretty false"`), following the rule against inlining commands.
- When there are several watchers, give each its own task and add one aggregate `watch` task with `runOn: folderOpen` that lists them all in `dependsOn`, with `"dependsOrder": "parallel"`.
- VS Code asks once per workspace before running automatic tasks. That prompt is expected.
- A compound can only name configs from its own workspace. If the project spans repos, it belongs in the workspace file's `launch.compounds` (see [Workspace file](#workspace-file)).

## Workspace file

Every repo has a `package.code-workspace` at its root, which opens the repo and each of its third-party submodules as its own folder.

```jsonc
{
  "folders": [
    { "name": "app.example", "path": "." },
    { "name": "open-jev", "path": "src/.submodules/open-jev" }
  ]
}
```

- `folders[0]` is the repo root: `{ "name": "<repo name>", "path": "." }`.
- After the root, list one folder for every submodule at any depth. Read `.gitmodules` recursively through nested submodules and dedupe by repository (the url's repo name). Keep the shallowest path. Name each folder after its repository, and use forward-slash paths relative to the root.
- **No org repositories.** Other org repositories are `github:` dependencies, not submodules, linked to sibling checkouts through the git-ignored `package-local.json` (see the [monorepo-conventions](../monorepo-conventions/SKILL.md) skill). Where those checkouts sit differs per machine, so the committed workspace file doesn't list them. Open them in their own windows, or from the umbrella workspace that checks every repository out side by side.
- Leave `settings` out unless something is needed there that `.vscode/settings.json` doesn't already cover.
- Compounds that span folders go in the file's `launch.compounds`. They name each config with its folder: `{ "name": "Docs (serve :8080)", "folder": "open-jev" }`. Add one only when a project needs a process from a submodule running. Say why in a comment.

Keep the file in step with the submodules. When a submodule is added, removed, or moved, including one nested inside another submodule, update `folders`, and check that every workspace compound still names a folder and config that exist. When an org submodule is replaced by a `github:` dependency, remove its folder and every compound entry naming it.

## On every script change

Search `.vscode/` (and any `*.code-workspace` file) for the script name before finishing. Configs refer to scripts in two forms, `"command": "npm run <script>..."` and `"script": "<script>"`, and to each other by `name` and `label`.

| Change           | Update                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Script added     | Add a launch config or task if its kind calls for one (table above). If it's long-running (dev tools included) and its project now has two or more long-running configs, add the project's compound, or add the config to the compound that already exists. A problem-only watcher becomes a folder-open task instead. |
| Script renamed   | Update every `command` and `script` that refers to it. If the entry's `name` or `label` changes too, update every compound `configurations` list and task `dependsOn` that names it.      |
| Script removed   | Remove its entries, then remove them from compounds and `dependsOn`. Delete a compound left with fewer than two configs, and an aggregate task left with nothing to aggregate. |
| Script changed   | Update the entry's name if the port or mode in it changed, and its problem matcher if the tool changed. Update its comment if the comment no longer holds.                                      |
| Package added    | When the passthru script is added (see the [monorepo-conventions](../monorepo-conventions/SKILL.md) skill), add entries for that package's long-running scripts and checks.                          |
| Package removed  | Remove every entry that runs `npm run <scope>:<name>` or has `"path"` pointing into it.                                                                                                            |

Compounds and `dependsOn` refer to entries by exact name, and VS Code doesn't flag a stale reference until someone runs it. After any rename or removal, check that every name in a `configurations` or `dependsOn` list still matches an existing entry.

## Editing the files

- Both files are JSONC. Keep the existing comments and add a comment to a new entry when its purpose isn't obvious from its name, e.g. when it has to run alongside another entry or needs Docker.
- Group related entries and keep compounds after configurations. Don't reorder existing entries without a reason.
- Create `launch.json` or `tasks.json` only when the first entry for it is needed. Their `version` fields are `"0.2.0"` and `"2.0.0"`.
