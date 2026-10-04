---
name: github-ci
description: GitHub Actions CI/CD standards for this repo — workflows compose actions and contain no scripts, and every action keeps its script logic in a sidecar file. Use when creating or editing anything under a .github/ folder (workflows, composite actions, or their scripts), or when adding a CI job, check, or deploy step.
---

# GitHub CI/CD

The YAML wires, the script decides. Workflows say *when* and *in what order*. Actions say *what* by calling a script that sits beside them.

## Workflows compose actions

A workflow (`.github/workflows/*.yml`) is only wiring: triggers, `permissions`, `concurrency`, jobs, `needs`, `if`, `outputs`, and `uses:` steps with their `with:` inputs.

- **No `run:` steps in a workflow.** If a job needs to do something no existing action does, write an action for it, even for a one-liner.
- A job is a short list of `uses:` steps, typically setup → the action that does the work.
- A condition on a job or step (`if:`) is fine. It's wiring, not a script.

```yaml
jobs:
  static:
    name: Lint & types
    runs-on: ubuntu-latest
    steps:
      - uses: pixel-petals/.devops/.github/actions/setup@main
        with:
          app-id: ${{ secrets.GH_DEVOPS_ID }}
          private-key: ${{ secrets.GH_DEVOPS_SECRET }}
          repositories: app.example, web.toolkit, shell.toolkit, tools.packager, .dependencies
      - uses: pixel-petals/.devops/.github/actions/npm-run@main
        with:
          scripts: lint typecheck metapak
```

## Shared actions come first

Anything not specific to one repository lives in [pixel-petals/.devops](https://github.com/pixel-petals/.devops/tree/main/.github): composite actions under `.github/actions/<name>` and reusable workflows under `.github/workflows/<name>.yml`. Call them at `@main`. Its readme lists what exists.

- **Set up through `setup`.** When `GH_DEVOPS_ID` and `GH_DEVOPS_SECRET` are passed, it mints a GitHub App token and rewrites SSH GitHub URLs to HTTPS with it, which is what reaches a private org repository: the `github:` dependencies `npm ci` fetches (the lockfile records them as `git+ssh://git@github.com/…`), and any private submodule. It then checks out, installs Node and runs `npm ci`, whose `dependencies` script links the providers' shared packages. Without the secrets it uses the run's own token.
- **List every private org repository the install fetches in `repositories`,** transitively: the repository itself, each provider root it depends on (see the [monorepo-conventions](../monorepo-conventions/SKILL.md) skill), the org repositories those depend on in turn, and `tools.packager` and `.dependencies`, which every repository installs. A missing one fails `npm ci` with a git authentication error.
- **Check the dependency wiring.** Add `metapak` to the checked scripts of every repository: under `CI` it exits 1 when the `@px-petals/metapak-dependencies` plugin would change anything. A provider also checks `hoist:check`, which exits 1 when its root `package.json` no longer matches its shared packages.
- **Prefer a reusable workflow** (`verify`, `visual`, `baselines`) to a job built from the same actions. Pass secrets with `secrets: inherit`.
- **Write a local action only for what this repository alone needs.** If a second repository would copy it, add it to `.devops` instead.

## Actions keep scripts in sidecar files

Each action is a composite action: a folder holding `action.yml` and the scripts it runs.

```text
.github/actions/verify/
  action.sh
  action.yml
```

- A `run:` step does one thing: call its sidecar script. No inline logic, pipes, or conditionals in the YAML.
- Name the script `action.sh` when there is one. When there are several, use `action.<step>.sh`, e.g. `action.install.sh` and `action.build.sh`.
- Reach the script through `$GITHUB_ACTION_PATH`, so the action works wherever it lives, and invoke it with `bash` so it doesn't depend on the file's executable bit (which Windows checkouts lose).
- Pass inputs to the script through `env:`, never by interpolating `${{ inputs.* }}` into the command line. Interpolation is pasted into the script before it runs, which makes it a shell-injection path.
- Steps that use another action (`uses: actions/setup-node@v4`) are fine inside a composite action. The sidecar rule applies to `run:` steps.

```yaml
name: Verify
description: Runs one verification task against the installed workspace.

inputs:
  task:
    description: Which task to run — `static` or `unit`.
    required: true

runs:
  using: composite
  steps:
    - name: Run ${{ inputs.task }}
      shell: bash
      run: bash "$GITHUB_ACTION_PATH/action.sh"
      env:
        TASK: ${{ inputs.task }}
```

```bash
#!/usr/bin/env bash
# One entry per task, so a job asks for work by name rather than repeating commands.

set -euo pipefail

case "$TASK" in
  static) npm run lint && npm run typecheck ;;
  unit)   npm test ;;
  *)      echo "unknown task: $TASK" >&2; exit 1 ;;
esac
```

## Sidecar scripts

- Start with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Add a header comment that says why the script exists or why its steps are in that order, not a list of what the commands do.
- Keep scripts runnable from the repo root outside CI, with the same env vars set, so a failing step can be reproduced locally.
- Scripts that need anything beyond shell and npm should use a tool the repo already depends on (e.g. a `node` script) rather than installing one.

## Where actions live

- Generic actions and workflows go in `pixel-petals/.devops` (see [Shared actions come first](#shared-actions-come-first)).
- Repo-wide actions go in `/.github/actions/<name>/`.
- An action that serves one workspace package goes under that package, e.g. `src/apps/example/.github/actions/<name>/`, and workflows reference it by path: `uses: ./src/apps/example/.github/actions/<name>`.
- Workflows always live in `/.github/workflows/`, because GitHub only reads them from there.
- Document an action's inputs and behaviour in its `description` fields. Longer rationale goes in a `readme.md` in the action's folder, per the [docs](../docs/SKILL.md) skill.
