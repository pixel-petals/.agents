---
name: roku-adopt
description: Assess a Roku/BrightScript project against the standard adoption ladder and propose the next seam to install. User-invoked via /roku-adopt. Use when the user asks to adopt the Roku standard, check adoption progress, or plan the next migration step for a legacy Roku codebase.
---

# Roku adopt

Workflow skill: assess where a Roku project sits on the adoption ladder and
propose the next concrete seam. Not ambient — only runs when invoked.

## The ladder

| Rung | What | Why this order |
| --- | --- | --- |
| 1 | Build & environment discipline: BrighterScript, per-env configs, `bs_const` flags | Everything after needs reproducible builds |
| 2 | Stdlib seams: constants/config, logging, type guards | One file each; every later rung uses them |
| 3 | Async wrapped once: promises or a task-runner helper | Gateway needs a sane calling convention |
| 4 | Gateways with parse layers | Ends render-thread I/O and vendor-JSON leakage |
| 5 | Typed events + analytics facade/adapters | Ends SDK sprawl through feature code |
| 6 | UI structure: hooks, `Base.*` wrappers, focus discipline, base screen | Lifecycle/focus solved once, not per screen |
| 7 | Repo restructuring: build-time layout remapping, multi-root separation | Highest churn; only valuable once 1–6 exist |

Never suggest jumping to rung 7 first — a nice folder structure over
spaghetti is still spaghetti. Full rationale and code for every rung:
`references/adoption.md`.

## What to do when invoked

1. **Determine greenfield vs legacy.** Empty/new project → on-ramp A
   (climb the ladder as setup, see `references/adoption.md`). Existing
   codebase → on-ramp B (strangler fig), below.
2. **For legacy, assess the current rung** by checking for evidence, not
   asking the user to self-report:
   - Rung 1: is there a linter config (`bslint.json`)? Scripted
     deploy in `package.json`? Per-env `bsconfig*.json`?
   - Rung 2: grep for a constants file, a logging helper (`logInfo`/
     `logAt`), type-guard helpers (`isValid`, `isNode`).
   - Rung 3: grep for a `runTask()`/promise wrapper, or `roku-promise`
     in dependencies.
   - Rung 4: grep for gateway/Task components with a `parse*()` layer vs.
     raw `roUrlTransfer` scattered in screens.
   - Rung 5: grep for event-name constants + an analytics facade
     (`trackPageView`-style) vs. raw SDK calls (`m.adobe.callFunc`) in
     screen files.
   - Rung 6: is there a shared `BaseScreen`/`Base.*` component? Any
     `moveFocus()`-style single focus owner, or scattered `m.xFocused`
     flags?
   - Rung 7: multiple source roots (`src-brand/`, `src-debug/`,
     `src-vendor/`)? Build-time `files` routing remap?

   Useful greps (from `references/adoption.md`'s progress heuristic):
   ```sh
   grep -rc 'observeField("' src/ | sort -t: -k2 -rn | head
   grep -rn 'roUrlTransfer' src/ --include='*.brs' | grep -v gateway
   grep -rn '^\s*print ' src/ --include='*.brs'
   ```
3. **Report the rung** the project sits on, plainly — e.g. "rungs 1–2 are
   in place (linter + constants file), rung 3 is missing (no task-runner
   seam, every screen hand-wires `roSGNode` + `observeField` ceremony)."
4. **Propose exactly one next seam** — the lowest unmet rung, sized as a
   single PR (see "one seam per PR" rule below). Point at the matching
   catalog entry in `../roku-standards/references/antipattern-catalog.md` for the minimal
   starter code, and phase guidance in `references/adoption.md`'s
   "On-ramp B" section.
5. **Do not implement unless asked.** This skill reports and proposes; if
   the user then asks you to install the seam, do that as a normal
   focused edit — one seam, nothing else in the diff.

## Rules that keep adoption honest

- New code always lands on the current rung's seams — no "just this once"
  bypass.
- Migrations ride other work; convert a file when a feature/bug brings you
  there. Standalone cleanup PRs must be mechanical, zero behavior change.
- **One seam per PR.** Adding a logging helper *and* converting 40 call
  sites *and* fixing a bug can be neither reviewed nor reverted.
- Verify on-device after touching legacy code — focus/threading/firmware
  quirks don't show up at compile time.
- Rung 7 (repo restructuring, multi-root split) needs explicit team
  buy-in, not agent initiative — flag it as a proposal, never do it
  unprompted.

## Reference files

- `references/adoption.md` — full ladder, both on-ramps, phase-by-phase
  legacy migration plan, progress heuristic.
- `../roku-standards/references/antipattern-catalog.md` — minimal starter code for each
  seam (constants file, logging helper, type guards, task-runner, gateway,
  analytics facade, base screen, etc.).
- `../roku-standards/references/standard/architecture.md` — what rung 7's repo layout and build-time
  remapping actually look like, for when that conversation comes up.

For the day-to-day coding rules once seams exist (classify code, two-tier
imitation, bounded improvement), use the `roku-standards` skill.
