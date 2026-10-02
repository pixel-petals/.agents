# Agent Playbook: Writing Roku Code

Operating rules for Claude agents (and human developers) writing or
reviewing Roku code — in a clean project, a legacy project, or the usual
mix of both. The measure of "good" is [the standard](./standard/architecture.md);
the failures to avoid are the [anti-pattern catalog](./antipattern-catalog.md).

Two prime directives, one per failure mode:

> **Never promote an anti-pattern to a convention.** Something appearing
> many times in the codebase makes it *common*, not *correct*. Frequency
> is how legacy code lobbies you; don't be lobbied.

> **Never rewrite uninvited.** Legacy code is load-bearing; it encodes bug
> fixes and platform workarounds that look like noise. Improvement is
> bounded: new code to the standard, touched code slightly better,
> untouched code left alone, big refactors only by explicit agreement.

## Step 0: classify before you type

Before writing code, explicitly classify the area you're working in — and
say the classification out loud in your response, which forces the
judgment call instead of silent imitation:

- **Sound** — structure matches the standard (I/O behind gateways, thin
  XML, hooks/observers centralized, no duplication, named constants).
  → Match it fully, style and structure. Follow
  [Writing to the standard](#writing-to-the-standard) below.
- **Mixed** — some discipline, some rot. → Match the *best* code in the
  area, not the nearest code.
- **Rotten** — hits multiple entries in the
  [anti-pattern catalog](./antipattern-catalog.md). → Match surface style
  only; take structure from the catalog's "write instead" examples.
  Follow [Working in legacy code](#working-in-legacy-code) below.

## The two-tier imitation rule

This is the rule that resolves "be consistent" against "don't copy garbage":

**Tier 1 — surface style: always match the local code.**
Naming casing, indentation, comment style, file/folder placement, whether
the project uses `.brs` or BrighterScript `.bs`, how components are
registered. Diverging here creates noise and review friction with zero
benefit. A gold-standard pattern written in the project's accent is still
gold standard.

**Tier 2 — structure: never match anti-patterns.**
Where logic lives, how async and threading work, how focus is managed,
where I/O and parsing happen, how state is shared, whether code is
duplicated. Here the authority is the standard and the catalog — not the
neighboring file, no matter how many neighbors agree.

### Worked example

The task: "add a `watchlist` count to the details screen." Every existing
screen in this project fetches inline, like this:

```brightscript
' DetailsScreen.brs — existing code (and 11 other screens like it)
sub loadEverything()
    url = "https://api.prod.example.com/v2/content/" + m.top.contentId
    req = CreateObject("roUrlTransfer")     ' ← network on render thread
    req.setUrl(url)
    json = ParseJson(req.getToString())     ' ← blocks UI; raw shape leaks
    m.top.findNode("title").text = json.data.attributes.display_title
end sub
```

**Wrong response** (frequency-as-authority): add
`json.data.attributes.watchlist_total` to `loadEverything()` and a 13th
copy of the URL string, "consistent with the existing pattern."

**Right response** (two tiers): keep Tier 1 — same naming style, same
file, same `sub`/casing conventions — but put the new I/O behind a Task,
even if it's the project's *first* (catalog №4 shows the full shape):

```brightscript
' DetailsScreen.brs — the addition, Tier-1 consistent, Tier-2 correct
sub loadWatchlistCount()
    m.watchlistTask = CreateObject("roSGNode", "ApiTask")
    m.watchlistTask.observeField("response", "onWatchlistCount")
    m.watchlistTask.request = { endpoint: "watchlistCount", contentId: m.top.contentId }
    m.watchlistTask.control = "run"
end sub
```

The existing `loadEverything()` stays untouched. Then *say* in your
summary: "the inline-fetch pattern in the other screens matches catalog
entry №4; I did not extend it — new data goes through `ApiTask`."

---

## Writing to the standard

The defaults for new code — always for new files, and for any work in
sound areas. Full patterns with mechanisms:
[framework-patterns.md](./standard/framework-patterns.md); naming and
style: [conventions.md](./standard/conventions.md).

### Before writing anything

1. **Find the in-project exemplar first.** In a conforming codebase,
   every artifact kind has an existing example — copy its shape:

   | Task | Exemplar to find and imitate |
   | --- | --- |
   | New screen | Any folder under `routes/` — thin XML extending `Base.Screen` + a behavior script |
   | New async command | Any folder under `actions/` — near-empty XML extending `Action.Worker`, `execute`/`resolve` script |
   | New API endpoint | A file under `gateways/<api>/endpoints/` + a handler entry in the gateway dispatch table + parsing in `parse/` |
   | New analytics vendor | An adapter under `features/analytics/` subscribing to the event enums |
   | New reusable UI element | A `Smart.*` component under `core/components/` |

   If no exemplar exists (the project predates the pattern), build the
   minimal version from the catalog's "write instead" column.
2. **Pick the right source root** (if the project has them):
   brand-specific → `src-brand/`; dev-only → `src-debug/`; third-party →
   `src-vendor/` (never edit); everything else → `src/`.
3. **Check references by text search in scripts *and* XML** before
   renaming or deleting — Roku instantiates components by string name
   (`CreateObject("roSGNode", "MyThing")`, `<MyThing/>`,
   `extends="MyThing"`).

### Placement rules (the build may depend on them)

- In projects using build-time remapping
  ([architecture.md](./standard/architecture.md)), SceneGraph components
  go in folders named `components/`, `actions/`, `routes/`, `tasks/`,
  `models/`, `modals/`, or `gateways/` — the plural folder name routes
  them into Roku's `components/` tree. Naming a folder is a build decision.
- Never create files under the build output dir (`out/`) — it's generated.
- Colocate a `readme.md` with any non-obvious domain knowledge; markdown
  is stripped from the package, so it's free.

### The code itself

- **XML = structure only.** Node types, ids and nesting; no logic, no
  `<script>` CDATA, and no field values (translations, focus flags,
  styles), which change over a component's life and belong in script.
- **Extend `Base.*`, never raw SDK components** (`Base.Screen`, not
  `Group`) — the wrappers are where platform fixes live.
- **In `init()`**: bind ids once (`getNodes([...])`), then register
  observers as the last step: by function reference through hooks where
  the project has them, otherwise with `observeFieldScoped`. Callbacks
  named by string must be top-level functions.
- **Types in JSDoc** (`' @param {T} x`, `' @return {T}`), never `as` in a
  signature: Roku crashes on a mismatched `as` rather than converting.
- **Namespaces group functions**, in components and `source` utilities
  alike; classes are for value objects only.
- **Async**: promise-returning actions (`doAction(...).then(...)`); never
  block the render thread with I/O; all network access through a gateway.
- **State**: `setState({...})` / `getState()` — no ad-hoc `m.` fields for
  mutable screen state.
- **Focus**: focus maps + one setter; read truth from `isInFocusChain()`;
  never track focus in boolean flags.
- **Events**: publish semantic `eventBus.notify(AppEvent.X, payload)`;
  only adapter components talk to vendor SDKs.
- **Guards & logging**: `is.*` type guards, `out.*` leveled logging,
  early returns over nesting.
- **No magic values**: copy → strings table; colors/fonts → theme enums;
  event names → enums; tunables → named `const`; URLs/env → config module.
- **Debug code**: behind `#if DEBUG` and/or in the debug source root.
- **Split files by concern** past ~150–200 lines.

---

## Working in legacy code

The bounds that keep improvement from becoming a rewrite:

1. **New files are built to standard.** A brand-new component, task, or
   utility has no legacy to be consistent with. New code is how the good
   pattern enters the repo.
2. **Touched code gets bounded improvement.** When editing an existing
   function: fix structure *within the lines you're already changing*
   (extract the copy-paste you'd otherwise extend, name the magic value
   you'd otherwise duplicate). Do not reformat or restructure the rest of
   the file "while you're here".
3. **Untouched code is left alone.** No drive-by refactors, no renames
   for taste, no deleting things that look dead without checking callers
   (script *and* XML grep — see above).
4. **The third-copy rule.** If the task is "make another one of these"
   and two copies already exist, do not create the third:

   ```text
   MovieDetails.brs   (900 lines)
   SeriesDetails.brs  (870 lines, 92% identical)   ← the warning
   LiveDetails.brs    ← your task. Do NOT paste-and-tweak.
   ```

   Extract only what your task needs to share (say, the metadata-row
   builder) into one function/component both existing files call; build
   the new screen on that. Copy №3 is where duplication becomes a
   pattern; you are the last cheap moment to stop it.
5. **Escalate instead of big-banging.** If doing the task *right*
   requires restructuring beyond the immediate change (a promise wrapper,
   splitting a God file, environment configs), do the bounded version now
   and *tell the user* what the structural fix would be and roughly what
   it costs. The [adoption guide](../../roku-adopt/references/adoption.md) is the menu to point at.
6. **Never "fix" what you can't verify.** Legacy weirdness is often a
   platform workaround (focus timing, thread rendezvous, firmware
   quirks). If a change would delete something
   odd-but-deliberate-looking, keep it and flag it. Code like this is
   load-bearing documentation:

   ```brightscript
   sleep(1)  ' do not remove — RowList loses focus on 4.4 devices without this
   ```

### Red flags that you're being lobbied

Catch yourself if any of these appear in your reasoning, and check the
catalog before proceeding:

- "Following the existing pattern in this file…" — *is it a pattern or an
  anti-pattern?*
- "For consistency with the rest of the codebase…" — *consistency is owed
  at Tier 1 only. Structural consistency with rot compounds the rot.*
- "I copied `ScreenA` and modified it…" — *third-copy rule.*
- "Added another case to the observer callback / `onKeyEvent` switch…" —
  *God-function growth; add a seam instead (catalog №3).*
- "Hardcoded like the other URLs for now…" — *magic values are the
  cheapest thing to do right; there is no "for now".*

### When the user asks for a quick hack

Sometimes the right answer *is* the hack (demo tomorrow, cert deadline).
Do it — but contain it: keep the hack in one place, name it honestly, and
leave a dated marker comment in the project's existing TODO style stating
what the real fix is:

```brightscript
' TODO(2026-07-10): HACK — retries masked by fixed 3s delay for the demo.
' Real fix: surface task failure state and show the error dialog.
sleep(3000)
```

A contained, labeled hack is legacy-safe; a silent structural
anti-pattern in fresh code is not.

---

## Review checklist

Flag in any diff (yours or others'):

**Structure**

- [ ] Logic inside XML `<script>` CDATA blocks
- [ ] Observers registered anywhere but the end of `init()` (or a hooks
      layer), or `observeField` where `observeFieldScoped` fits
- [ ] `roUrlTransfer`, URL strings, or `ParseJson` of API responses in
      routes or features (belongs in a gateway/task)
- [ ] Raw SDK component in an `extends` where `Base.*` wrappers exist
- [ ] A third+ copy of an existing component/function with edits
- [ ] Manual focus bookkeeping (`m.somethingFocused` flags, scattered
      `setFocus`) instead of one focus owner / focus maps

**Values and hygiene**

- [ ] New hardcoded copy, hex colors, URLs, or event-name strings
- [ ] Analytics SDK calls outside the analytics facade/adapters
- [ ] `print` instead of the logging helper; raw `<> invalid` chains
      instead of type guards (guard with `is.*`, then `typecast` to narrow)
- [ ] `as` types in a function signature (types belong in JSDoc)
- [ ] Thread-unsafe iteration (lint rules `unsafe-path-loop` /
      `unsafe-iterators` are errors for a reason)

**Discipline**

- [ ] New code that imitates a catalog anti-pattern "for consistency"
- [ ] Unrelated reformatting/restructuring bundled into the diff
- [ ] Edits to `src-vendor/**` or generated output
- [ ] Deleted "weird" code with no evidence it was safe to delete
      (script *and* XML grep)
- [ ] A hack without a marker comment naming the real fix
- [ ] A new file in a folder whose name would route it to the wrong
      package location
