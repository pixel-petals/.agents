---
name: roku
description: How to write, type and test Roku code with BrighterScript v1 — JSDoc types (never `as` in signatures), namespaces, *.type.bs sidecars, `typecast m`, enums and computed keys, bsconfig — plus device-tested facts about AnimatedImage, Audio and SoundEffect, and testing on a real Roku through the roku-dev-studio MCP. Use when writing or refactoring .bs/.brs/.xml SceneGraph code, typing a component, choosing a bsc version or bsconfig option, playing Lottie, video or sound on Roku, or sideloading and debugging on a device. Pairs with roku-standards in this plugin, which covers architecture and framework patterns.
---

# Roku

BrighterScript v1 is a type checker as much as a compiler: write code it can check, and keep everything it checks out of the runtime. Roku crashes on what other runtimes coerce, so the rules below lean on compile-time types and explicit guards.

`roku-standards` (the sibling skill in this plugin) owns architecture, framework patterns and anti-patterns. This skill owns the language, the type system, runtime facts and device testing. The two agree; where they meet, both apply.

## Rules

### Types

- **Types go in JSDoc, never in signatures.** `' @param {motion.Sheet} sheet` and `' @return {float}`; the function line stays untyped. A value that does not match a signature's `as` type crashes Roku; it is never converted. bsc v1 validates JSDoc types in `.bs` exactly as it validates `as`.
- **Every function gets a JSDoc block:** a one-line intent, then `@param {type} name  description` and `@return {type}  description`.
- **Nullable returns say so:** `@return {motion.Media or invalid}`. Returning `invalid` from a `{motion.Media}` function is an error.
- **Guards do not narrow.** After `if not is.invalid(x)` or `if is.string(x)`, bsc still sees the union. Guard with the `is.*` helpers (not raw `<> invalid` chains), then open the guarded block with `typecast x as T`, or cast inline with `x as T`. Both casts are compile-time only and vanish from the output.
- **Never rely on a typed parameter to convert a number.** Integer, float and double compare directly; convert explicitly when a type must change.

### Files and names

- **Functions are grouped in namespaces,** in components and `source` utilities alike. A namespace is a short, meaningful grouping (`is.string`, `log.warn`, `fit.bounds`), not a path: don't prefix everything with the app or library name (`motion.fit.bounds`). A library prefix belongs only on code shipped into other channels' `source/` (roku-toolkit's `roToolbelt`, `roAsync`); `ro.` suits Roku built-in vocabularies. See [brighterscript.md](references/brighterscript.md#choosing-names). Classes are for value objects (a Promise, a pool), not for grouping functions.
- **Top-level functions are the entry points SceneGraph names by string:** `init`, observer callbacks, a Task's `functionName`, `<function>` callFunc targets. bsc never rewrites namespaced names inside strings. Callbacks registered by function reference (hooks, an `observe()` helper) can be any namespaced function.
- **Files are lowercase,** XML included (`action.fetch.xml` holding `<component name="Action.Fetch">`), because not every file system is case-sensitive. In a project whose XML files are already PascalCase, match the project.
- **Each component has a `<name>.type.bs` sidecar** holding its `m` interface, node interfaces and enums. Every script that touches `m` starts with `typecast m as <ns>.Scope`.
- **String vocabularies are enums** (`Playback.FINISHED = "finished"`), and maps keyed by them use computed keys (`[Playback.FINISHED]: …`).
- **Names are case-insensitive everywhere.** An interface `Machine` collides with a namespace `machine`. **A local variable silently shadows a const of the same name**: the const stops inlining, with no diagnostic. Never give a local a const's name in any case.
- **Keywords and built-ins are off-limits as function names,** even in a namespace: `stop` and `next` are parse errors, and a top-level `run` is silently replaced by the built-in `Run()`. The exception is a guard named `invalid` inside a namespace (`is.invalid`): bsc reports `cannot-use-reserved-word`, but the name transpiles to `is_invalid`, so suppress it on that line, as roku-kit does.

### Components

- **XML `<children>` describes the hierarchy, and nothing else:** which nodes exist, their ids and how they nest. Values (sizes, colours, text, translations, flags) are set in `init()` or later, so the XML reads as the component's structure.
- **Field values are set in script, not XML:** translations, focusability and styles are rarely static over a component's life.
- **`init()` gathers node references with one helper call,** `findNodes(["row", "progress"])` (or the project's `getNodes`). SceneGraph has no such built-in; write it once rather than repeating `m.top.findNode` per node. Bind into `m.nodes.*` by default, since one bag is easier to inspect when debugging; bind onto `m.<id>` where a legacy project's code already expects that. See [scenegraph.md](references/scenegraph.md#structure-in-xml-values-in-init).

### Runtime

- **Observers are registered as the last step of `init()`, with `observeFieldScoped`,** and nowhere else; never XML `onChange`. Only the order matters, not a particular helper.
- **Tasks are long-lived servers** held on `m.global`, answering on the request node, since Roku caps how many tasks exist.
- **`??` and ternaries on member access compile to an IIFE per evaluation,** and complex consts are inlined as a new literal at every reference. Keep both out of loops: use plain `if` checks, and read a complex const into a local once.
- **`minFirmwareVersion` is at least `"11.0.0"`,** which makes optional chaining (`?.`, native from Roku OS 11) safe; bsc flags syntax newer than the floor.

## References

| Read | When |
| --- | --- |
| [brighterscript.md](references/brighterscript.md) | Writing or typing `.bs`: every v1 feature, what it transpiles to, and the gotchas verified against bsc 1.0.0-alpha.56 |
| [scenegraph.md](references/scenegraph.md) | Structuring components and tasks: sidecars, `typecast m`, typing dot-named components and nodes bsc does not know, bsconfig |
| [media.md](references/media.md) | Playing Lottie, animated images, video or sound: AnimatedImage, Audio and SoundEffect as they behave on devices |
| [device-testing.md](references/device-testing.md) | Sideloading, logging and verifying on a real Roku through the roku-dev-studio MCP |
