# Adopting the Standard

One ladder, two on-ramps. The [standard](../../roku-standards/references/standard/architecture.md) is
adopted in the same order whether the project is brand new or ten years
old — the difference is pacing: a greenfield project climbs the ladder as
project setup; a legacy project installs each rung as a *seam* and lets
the strangler fig grow.

## The ladder

Each rung pays for itself before the next; stop at any point and the
codebase is still better than before.

| Rung | What | Why this order |
| --- | --- | --- |
| 1 | Build & environment discipline: BrighterScript, per-env configs, `bs_const` flags | Everything after this needs cheap, reproducible builds |
| 2 | The stdlib seams: constants/config, logging, type guards | One file each; every later rung uses them |
| 3 | Async wrapped once: promises or a task-runner helper | Gives the gateway a sane calling convention |
| 4 | Gateways with parse layers | Ends render-thread I/O and vendor-JSON leakage |
| 5 | Typed events + analytics facade/adapters | Ends SDK sprawl through feature code |
| 6 | UI structure: hooks, `Base.*` wrappers, focus discipline, base screen | Lifecycle and focus solved once, per app not per screen |
| 7 | Repo restructuring: build-time layout remapping, multi-root separation | Highest churn; only valuable once rungs 1–6 exist beneath it |

Don't skip to rung 7. A beautiful folder structure over spaghetti is
still spaghetti.

---

## On-ramp A: greenfield

Climb the ladder as setup, before feature work:

1. **Tooling first** — bsc + per-environment bsconfigs + the `files`
   routing table ([build-and-tooling.md](../../roku-standards/references/standard/build-and-tooling.md),
   [architecture.md](../../roku-standards/references/standard/architecture.md)), lint configured for
   signal, IDE config checked in.
2. **The expressions stdlib** — `is.*`, `out.*`,
   `create`/`update`/`observe`, polyfills
   ([framework-patterns.md](../../roku-standards/references/standard/framework-patterns.md)).
3. **Promises + actions/workers.**
4. **Hooks + focus maps.**
5. **`Base.*` wrapper components** — wrap SDK components before the first
   screen extends one.
6. **First gateway with a parse layer; event enums + event bus; analytics
   adapters.**
7. **Multi-root separation** (`src-brand/`, `src-debug/`, `src-vendor/`)
   — defer the brand split until a second brand/theme is plausible; add
   `src-debug/` when debug tooling starts growing.

The first screen you build should already look like the ~40-line example
at the end of
[framework-patterns.md](../../roku-standards/references/standard/framework-patterns.md). If it can't,
the missing piece belongs in the framework, not the screen.

---

## On-ramp B: legacy (the strangler fig)

Old code migrates only when touched for other reasons, or when a
scheduled cleanup targets it. New code always lands on the seams installed
so far. Starter code for most seams is in the
[anti-pattern catalog](../../roku-standards/references/antipattern-catalog.md) (entry numbers below).

### Phase 0 — safety nets (before changing anything)

1. **A linter, tuned for signal.** For BrightScript/BrighterScript,
   `bslint`:

   ```jsonc
   // bslint.json — catch crashes, skip bikeshedding
   {
     "ignores": ["**/vendor/**", "**/out/**"],
     "rules": {
       "unsafe-path-loop": "error",     // real Roku thread-safety crashes
       "unsafe-iterators": "error",
       "case-sensitivity": "warn",
       "unused-variable": "warn",
       "inline-if-style": "off",        // style rules off — a legacy repo
       "condition-style": "off",        // will drown in style warnings
       "type-annotations": "off"        // governs `as` only; types live in JSDoc
     }
   }
   ```

   A linter that reports 4,000 style violations on day one gets
   uninstalled by day three. Vendor and generated code are not yours to
   fix — exclude them.

2. **A scripted build/deploy** if launching is manual:

   ```jsonc
   // package.json
   "scripts": {
     "deploy": "roku-deploy --host $ROKU_DEV_TARGET --password $ROKU_DEV_PASSWORD"
   }
   ```

   Migration requires cheap iteration; a 5-minute manual sideload loop
   kills it.

3. **Baseline the behavior** where you'll be working (manual test notes
   are fine — screen loads, focus path, back-button behavior). Legacy has
   no tests; you are the regression suite.

### Phase 1 — the one-file seams (rungs 1–2; days, not weeks)

Each is a single file that new code adopts immediately; old code converts
only when touched:

1. **Constants/config file** (catalog №6) — kills new magic values. The
   cheapest, highest-leverage seam in the list.
2. **Logging helper** (catalog №10) — new code stops `print`ing.
3. **Type-guard helpers** — ends the `<> invalid and type(x) = ...`
   incantations, and the crashes when someone gets one wrong:

   ```brightscript
   ' @param {dynamic} x
   '
   ' Guards.brs
   '
   ' @return {boolean}
   '
   function isValid(x)
       return type(x) <> "<uninitialized>" and x <> invalid
   end function

   ' @param {dynamic} x
   '
   ' @return {boolean}
   '
   function isNonEmptyString(x)
       return isValid(x) and getInterface(x, "ifString") <> invalid and x <> ""
   end function

   ' @param {dynamic} x
   ' @param {string} [subtype]
   '
   ' @return {boolean}
   '
   function isNode(x, subtype = "")
       if not isValid(x) or getInterface(x, "ifSGNodeChildren") = invalid then return false
       if subtype <> "" then return x.isSubtype(subtype)
       return true
   end function
   ```

4. **Environment consts** (catalog №12) — `bs_const` flags +
   `getConfig()`.

### Phase 2 — async and I/O discipline (rungs 3–5; the big win)

1. **One task-runner seam** (catalog №11): a `runTask()` helper or a
   promise wrapper (e.g. the community `roku-promise` library). Do this
   *before* the gateway, so the gateway has a sane calling convention.
2. **First gateway** (catalog №4): pick the API area your current work
   touches. One Task component that owns URLs, plus one `parse*()`
   function converting vendor JSON to app models. Route *new* screens
   through it; migrate old screens opportunistically.
3. **Named events + an analytics facade** (catalog №8): event-name
   constants and a `trackPageView()`-style facade. Per-vendor adapter
   components can come later; the facade alone stops the sprawl.

### Phase 3 — UI structure (rung 6; screen by screen)

1. **BrighterScript adoption**, if the project is raw `.brs`: `bsc`
   consumes existing `.brs` untouched, so this is additive — new files in
   `.bs`, old files converted only when heavily edited. Unlocks imports,
   enums, and template strings that phases 1–2 are nicer with (they work
   without it; don't block on it).
2. **A base screen component**: the project's first shared screen parent,
   installing lifecycle order and back-key semantics once:

   ```xml
   <component name="BaseScreen" extends="Group">
     <script type="text/brightscript" uri="BaseScreen.brs" />
     <interface>
       <field id="wasShown" type="boolean" />
       <field id="closeRequested" type="boolean" alwaysNotify="true" />
     </interface>
   </component>
   ```

   New screens extend it; each legacy screen migrates when it next needs
   real work. Hooks and further `Base.*` wrappers grow from here.
3. **Focus discipline per screen** (catalog №9): when a screen's focus
   bugs bring you in anyway, replace its flag soup with one `moveFocus()`
   owner — for that screen only.
4. **Shrink God files under the 1-line rule** (catalog №3): additions go
   in new files called from the God file. It stops growing immediately
   and shrinks whenever a scheduled cleanup carves a concern out.

### Phase 4 — only with explicit buy-in (rung 7)

These restructure the repo and need team agreement, not agent initiative:

1. **Human-friendly repo layout remapped at build time** — the
   feature-first taxonomy and `files` routing table described in
   [architecture.md](../../roku-standards/references/standard/architecture.md). High value — the repo
   starts *screaming its architecture* instead of Roku's constraints —
   but it moves every file; do it as a dedicated change with nothing else
   in the diff.
2. **Multi-root separation**: split brand assets/theme (`src-brand/`),
   dev-only tooling (`src-debug/`, behind `#if DEBUG`), and third-party
   SDK code (`src-vendor/`, lint-ignored, never edited) out of the app
   tree. Worth it when debug tooling grows, vendor SDKs churn, or a
   second brand appears. Not before.
3. **Wholesale screen rewrites** — justified only when a screen is being
   redesigned anyway. Rewriting a working-but-ugly screen for purity is
   how migrations lose their sponsors.

---

## Rules that keep adoption honest (both on-ramps)

- **New code always lands on the current rung's seams.** The point of a
  seam is that nothing new bypasses it. One exception granted "just this
  once" un-installs the seam.
- **Migrations ride other work.** Convert a file when a feature or bug
  brings you there. Standalone cleanup PRs are fine but must be
  mechanical, reviewed as such, and contain zero behavior change.
- **One seam per PR.** A diff that adds a logging helper *and* converts
  40 call sites *and* fixes a bug can be neither reviewed nor reverted.
- **Verify on device, not just by compile.** Roku's runtime (focus,
  threading, firmware quirks) breaks in ways no compiler sees. After
  touching legacy code, run the affected flow on hardware before calling
  it migrated.
- **Track the debt you create.** When bounded improvement leaves known
  rot in place, note it (project TODO convention, ticket, or a `DEBT.md`
  next to these docs) so "later" has an address.

## Progress heuristic

Adoption is working if, month over month:

- new files score clean against the
  [catalog](../../roku-standards/references/antipattern-catalog.md),
- the God files are not growing,
- and grep counts for the worst markers trend down:

  ```sh
  grep -rc 'observeField("' src/ | sort -t: -k2 -rn | head  # spaghetti hotspots
  grep -rn 'roUrlTransfer' src/ --include='*.brs' | grep -v gateway
  grep -rn '^\s*print ' src/ --include='*.brs'
  ```

It is failing if the good patterns exist but new code still bypasses
them — that's a seam-enforcement problem (see the review checklist in the
[agent playbook](../../roku-standards/references/agent-playbook.md)), not a tooling problem.
