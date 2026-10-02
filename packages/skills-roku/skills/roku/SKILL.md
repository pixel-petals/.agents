---
name: roku
description: How to write, type and test Roku code with BrighterScript v1 — JSDoc types (never `as` in signatures), namespaces, *.type.bs sidecars, `typecast m`, enums and computed keys, bsconfig — plus device-tested facts about AnimatedImage, Audio and SoundEffect, and testing on a real Roku through the roku-dev-studio MCP. Use when writing or refactoring .bs/.brs/.xml SceneGraph code, typing a component, choosing a bsc version or bsconfig option, playing Lottie, video or sound on Roku, or sideloading and debugging on a device. Pairs with roku-standards, which covers architecture and framework patterns.
---

# Roku

BrighterScript v1 is a type checker as much as a compiler: write code it can check, and keep everything it checks out of the runtime. Roku crashes on what other runtimes coerce, so the rules below lean on compile-time types and explicit guards.

`roku-standards` (in the roku repo) owns architecture, framework patterns and anti-patterns. This skill owns the language, the type system, runtime facts and device testing. Where they meet, both apply.

## Rules

### Types

- **Types go in JSDoc, never in signatures.** `' @param {motion.Sheet} sheet` and `' @return {float}`; the function line stays untyped. A value that does not match a signature's `as` type crashes Roku; it is never converted. bsc v1 validates JSDoc types in `.bs` exactly as it validates `as`.
- **Every function gets a JSDoc block:** a one-line intent, then `@param {type} name  description` and `@return {type}  description`.
- **Nullable returns say so:** `@return {motion.Media or invalid}`. Returning `invalid` from a `{motion.Media}` function is an error.
- **Guards do not narrow.** After `if x <> invalid` or `if isString(x)`, bsc still sees the union. Open the guarded block with `typecast x as T`, or cast inline with `x as T`. Both are compile-time only and vanish from the output.
- **Never rely on a typed parameter to convert a number.** Integer, float and double compare directly; convert explicitly when a type must change.

### Files and names

- **Top-level subs are SceneGraph entry points only:** `init`, observer callbacks, a Task's `functionName`, `<function>` callFunc targets. SceneGraph names them by string, and bsc does not transpile namespaced names inside strings.
- **Everything else lives in a namespace,** prefixed with the library or app name (`motion.fit.bounds`), so code embeds in any channel without collisions.
- **Each component has a `<name>.type.bs` sidecar** holding its `m` interface, node interfaces and enums. Every script that touches `m` starts with `typecast m as <ns>.Scope`.
- **String vocabularies are enums** (`Playback.FINISHED = "finished"`), and maps keyed by them use computed keys (`[Playback.FINISHED]: …`).
- **Names are case-insensitive everywhere.** An interface `motion.Machine` collides with a namespace `motion.machine`. **A local variable silently shadows a const of the same name**: the const stops inlining, with no diagnostic. Never give a local a const's name in any case.
- **Keywords and built-ins are off-limits as function names,** even in a namespace: `stop` and `next` are parse errors, and a top-level `run` is silently replaced by the built-in `Run()`.

### Runtime

- **Observers are set with `observeFieldScoped` as the last step of `init()`;** never XML `onChange`.
- **Tasks are long-lived servers** held on `m.global`, answering on the request node, since Roku caps how many tasks exist.
- **`??` and ternaries on member access compile to an IIFE per evaluation,** and complex consts are inlined as a new literal at every reference. Keep both out of loops: use plain `if` checks, and read a complex const into a local once.
- **`minFirmwareVersion` below 11** turns `?.` (native only from Roku OS 11) into a compile error instead of a crash on older devices.

## References

| Read | When |
| --- | --- |
| [brighterscript.md](references/brighterscript.md) | Writing or typing `.bs`: every v1 feature, what it transpiles to, and the gotchas verified against bsc 1.0.0-alpha.56 |
| [scenegraph.md](references/scenegraph.md) | Structuring components and tasks: sidecars, `typecast m`, typing dot-named components and nodes bsc does not know, bsconfig |
| [media.md](references/media.md) | Playing Lottie, animated images, video or sound: AnimatedImage, Audio and SoundEffect as they behave on devices |
| [device-testing.md](references/device-testing.md) | Sideloading, logging and verifying on a real Roku through the roku-dev-studio MCP |
