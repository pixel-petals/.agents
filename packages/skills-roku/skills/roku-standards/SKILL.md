---
name: roku-standards
description: Operating rules for writing or reviewing Roku/BrightScript/BrighterScript/SceneGraph code, in greenfield or legacy projects. Use for any task that adds, edits, or reviews .brs/.bs/.xml Roku app code — new screens, gateways, tasks, focus handling, analytics, or judging whether existing Roku code is sound or rotten. Triggers on: Roku, BrightScript, BrighterScript, SceneGraph, roSGNode, .brs, .bs component, RowList/Group/Task components, "add a screen", "add an endpoint", "is this Roku code good".
---

# Roku standards

Operating rules for writing or reviewing Roku code. Full detail lives in
`references/` — read on demand, don't load it all up front.

Two prime directives:

> **Never promote an anti-pattern to a convention.** Frequency in the
> codebase makes something *common*, not *correct*.

> **Never rewrite uninvited.** Legacy code is load-bearing. New code to the
> standard, touched code slightly better, untouched code left alone, big
> refactors only by explicit agreement.

## Step 0: classify before you type

Say the classification out loud in your response:

- **Sound** (I/O behind gateways, thin XML, centralized hooks, no
  duplication, named constants) → match it fully, style and structure.
- **Mixed** (some discipline, some rot) → match the *best* code in the
  area, not the nearest code.
- **Rotten** (hits the anti-pattern catalog) → match surface style only;
  take structure from `references/antipattern-catalog.md`'s "write
  instead" examples.

## The two-tier imitation rule

**Tier 1 — surface style: always match local code.** Naming, indentation,
comment style, file placement, `.brs` vs `.bs`, component registration.
Diverging here is pure noise.

**Tier 2 — structure: never match anti-patterns.** Where logic/I/O/state/
focus live, whether code is duplicated. Authority here is the standard and
the catalog, not the neighboring file no matter how many neighbors agree.

Example: 12 screens fetch inline over `roUrlTransfer` in `loadEverything()`.
Task #13 needs a new field. Wrong: paste a 13th inline fetch "for
consistency." Right: same naming/file conventions (Tier 1), but the new
data goes through a Task/gateway (Tier 2) — even if it's the project's
first. Say so explicitly: "the inline-fetch pattern matches catalog #4; I
did not extend it."

## Writing new code — the standard in one screen

1. XML is structure only — node types, ids, nesting; no logic, no field
   values (set those in `init()`).
2. All I/O on Task threads behind a gateway; vendor JSON never reaches UI.
3. Async wrapped once (promises or a task-runner helper), not hand-wired
   per call.
4. No magic values — constants/enums, per-env config, theme, strings table.
5. Focus owned in one place per screen; never boolean flags.
6. Cross-component comms via typed, named events — not `m.global` grab-bag.
7. Vendor SDKs behind facades/adapters; feature code never calls an SDK
   directly.
8. One concern per file; split past ~150–200 lines.
9. Debug code behind `#if DEBUG`; logging via a leveled helper, not `print`.
10. Extend `Base.*` wrappers, never raw SDK components.
11. Types in JSDoc (`' @param {T} x`), never `as` in signatures — Roku
    crashes on a mismatched `as` rather than converting.
12. Functions grouped in namespaces, in components and source utils alike;
    top-level only for entry points SceneGraph names by string.

Before writing: find the in-project exemplar for this artifact kind (a
screen under `routes/`, an action under `actions/`, a gateway endpoint,
etc.) and copy its shape. Full patterns with code:
`references/standard/framework-patterns.md`. Naming/style details:
`references/standard/conventions.md`. Folder/build-routing rules:
`references/standard/architecture.md`, `references/standard/build-and-tooling.md`.

Before renaming or deleting anything: grep both scripts *and* XML — Roku
instantiates components by string name (`CreateObject("roSGNode", "X")`,
`<X/>`, `extends="X"`).

## Working in legacy code

1. New files are built to standard, no exceptions.
2. Touched code gets bounded improvement — fix structure *within the lines
   you're already changing*, don't reformat the rest of the file.
3. Untouched code is left alone — no drive-by refactors or renames.
4. **Third-copy rule**: two similar files already exist and the task is
   "make another one" → don't paste a third. Extract the shared piece your
   task needs first, build the new one on it.
5. If doing the task right needs bigger restructuring, do the bounded
   version now and tell the user what the real fix costs — point at
   `roku-adopt` skill / `references/adoption.md` if this repo has it.
6. Never delete odd-looking code you can't verify is safe — it's often a
   platform workaround (focus timing, firmware quirks). Keep it, flag it.

Red flags in your own reasoning — stop and check
`references/antipattern-catalog.md`: "following the existing pattern in
this file…", "for consistency with the rest of the codebase…", "I copied
ScreenX and modified it…", "added another case to the onKeyEvent
switch…", "hardcoded like the other URLs for now…".

Quick hack under deadline pressure is fine — contain it, name it, leave a
dated marker: `' TODO(YYYY-MM-DD): HACK — <what> / Real fix: <what>`.

## Review checklist

Flag in any diff:

- Logic inside XML `<script>` CDATA
- Observers registered anywhere but the end of `init()` (or a hooks
  layer), or `observeField` where `observeFieldScoped` fits
- `roUrlTransfer`/URL strings/`ParseJson` outside a gateway or task
- Raw SDK component in `extends` where `Base.*` exists
- A third+ copy of an existing component/function
- Manual focus flags instead of one focus owner
- New hardcoded copy, hex colors, URLs, or event-name strings
- Analytics calls outside the analytics facade
- `print` instead of the logging helper; `<> invalid` chains instead of
  type guards (guard with `is.*`, then `typecast` to narrow)
- `as` types in a function signature
- Unrelated reformatting bundled into the diff
- Edits to vendor/generated code
- Deleted "weird" code with no evidence it was safe to delete
- A hack without a marker comment

## Reference files

The sibling `roku` skill in this plugin covers BrighterScript v1 typing
(JSDoc types, namespaces, `*.type.bs` sidecars, `typecast`), device-tested
media behaviour, and testing on a real Roku.

- `references/agent-playbook.md` — the long form of this skill: classify,
  two-tier imitation, bounded improvement, full review checklist.
- `references/antipattern-catalog.md` — 12 anti-patterns: recognize, cost,
  minimal fix, fuller version. Read when you meet code matching a red flag
  above, or need the minimal-fix shape.
- `references/standard/architecture.md` — layering, source roots, folder
  taxonomy, build-time remapping.
- `references/standard/framework-patterns.md` — hooks, state, promises,
  actions, gateways, event bus, focus maps, full worked screen example.
- `references/standard/conventions.md` — naming, XML/script split,
  no-magic-values, colocated docs.
- `references/standard/build-and-tooling.md` — per-env configs, compile
  flags, lint philosophy, vendor quarantine.

For adopting this standard into a project (assessing current rung,
proposing next seam), use the `roku-adopt` skill instead.
