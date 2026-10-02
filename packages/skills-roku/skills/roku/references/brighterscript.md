# BrighterScript v1

BrighterScript is a superset of BrightScript that compiles to it. v1 adds a real type checker. Everything here was checked against `brighterscript` **1.0.0-alpha.56** unless marked as from the docs; the upstream docs are at [rokucommunity/brighterscript/docs (v1)](https://github.com/rokucommunity/brighterscript/tree/v1/docs).

## Version

- **Pin `brighterscript` to an exact v1 alpha** in the package that builds (`"brighterscript": "1.0.0-alpha.56"`). npm's `latest` tag is still v0 (0.73), so an unpinned `npx bsc` resolves v0 and none of the typing below exists.
- **v1 moved compiler options under `compilerOptions`.** Top-level `autoImportComponentScript`, `strict` and the rest still work but warn `deprecated-bsconfig-option`.

## Types

### Where types go

| Form | Use | Runtime effect |
| --- | --- | --- |
| `' @param {T} name` / `' @return {T}` | **Every function** | None: comments |
| `typecast m as T` (file top) | Typing a component's `m` | None |
| `typecast x as T` (first statement of a block) | Narrowing after a guard | None |
| `x as T` (inline) | One-off narrowing; unvalidated | None |
| `name as T = value` (declared assignment) | Typing a local; validated | None |
| `function f(x as T) as T` | **Never** | Crashes on mismatch |

- **Signatures stay untyped.** BrightScript enforces `as` on parameters and returns at runtime, and a mismatch crashes the channel rather than converting. JSDoc types are checked by bsc just as strictly, in `.bs` and `.brs` alike.
- **JSDoc syntax:** `' @param {motion.Sheet} sheet  what it is`, optional parameters as `' @param {integer} [count]`, and `' @type {integer}` above a variable to type it (from the docs, which describe it for `.brs`; not tested here).

### Type expressions

| Syntax | Means |
| --- | --- |
| `string`, `integer`, `longinteger`, `float`, `double`, `boolean`, `dynamic`, `object`, `invalid` | Primitives |
| `roAssociativeArray`, `roArray`, `roSGNodeTimer`, `roSGNodeEvent`, … | Built-in components and nodes |
| `string[]`, `float[][]` | Typed arrays; transpile to `object` |
| `string or motion.Sound` | Union: only members common to all may be used |
| `HasId and HasUrl` | Intersection |
| `{id as string}` | Inline interface |
| `function(name as string) as integer` | Function type |
| `motion.Sheet` | A namespaced interface, enum or class |

### Interfaces and type statements

```brighterscript
namespace motion
    interface Sheet
        uri as string
        frameWidth as integer
        optional columns as integer
    end interface

    type Number = integer or float or double
end namespace
```

- **`optional` members** may be missing without a diagnostic, but are typed when read.
- **Interfaces may extend built-in node types:** `interface DataNode extends roSGNodeContentNode` declares a node's custom fields, and bsc then checks field names, field types and `@.` callfunc targets against it.
- **All of it transpiles to `dynamic` or nothing.**

### Narrowing

bsc does not narrow a union or a nullable through runtime checks:

```brighterscript
entry = findState(states)          ' motion.machine.State or invalid
if entry <> invalid
    typecast entry as motion.machine.State   ' must open the block
    count = entry.transitions.count()
end if
```

- **`typecast` must be the first statement of its block,** or at the top of the file. Placed after an early `return`, it is an error (`unexpected-statement-location`). Restructure so the guarded code sits inside the `if`.
- **Inline casts are unvalidated:** `name = 1234 as string` compiles. Prefer a declared assignment (`name as string = value`), which bsc checks.

### Checks bsc performs

Verified diagnostics, each from real mistakes:

- `argument-type-mismatch`: a `{float}` parameter given `float or invalid`; a `{motion.Renderer}` parameter given a node's `string` field.
- `return-type-mismatch`: returning `invalid` from `{float}`; returning a union from a narrower type.
- `assignment-type-mismatch`: a node interface field typed as an enum where the XML declares `string`.
- `cannot-find-name`, `cannot-find-function`, `cannot-find-callfunc`: unknown members, methods and callFunc targets on typed values.
- `operator-type-mismatch`: `<=` between `float or invalid` and `integer`.

## Namespaces

```brighterscript
namespace motion.fit
    function bounds(size, mediaWidth, mediaHeight)
        ' callers write motion.fit.bounds(...); it transpiles to motion_fit_bounds(...)
    end function
end namespace
```

- **Dots become underscores** in the output. Functions in the same namespace call each other unqualified.
- **Parent namespaces are not in scope:** inside `motion.fit`, a member of `motion` needs its full name.
- **Strings are never rewritten.** `observeFieldScoped("field", "motion.fit.onX")` looks up a function that does not exist. Keep string-named entry points top-level, or pass the transpiled name (`"motion_fit_onX"`). roku-kit instead passes a function reference and converts it at runtime with `ref.toStr().replace("Function: ", "")`.
- **Prefix every namespace in library code** with the library name, so a host channel's own `fit` or `is` cannot collide.
- **A namespace and a type cannot share a name, case-insensitively.** `interface Machine` beside `namespace machine` in the same parent is a `name-collision` error.
- **Type keywords parse as types:** inside `namespace motion.is`, a bare call `integer(value)` is `not-callable`. Call it fully qualified, as `motion.is.integer(value)`.
- **`alias get2 = get`** (from the docs) gives a shadowed namespace a usable name.

## Enums, constants and computed keys

```brighterscript
namespace motion
    enum Playback
        PLAYING = "playing"
        FINISHED = "finished"
    end enum

    const FORMATS = {
        [motion.SoundVia.AUDIO]: { wav: true, mp3: true }
        [motion.SoundVia.EFFECT]: { wav: true }
    }
end namespace
```

- **Enums and consts are inlined at compile time** and do not exist at runtime. String enum members inline as their string; members of one enum must share a type.
- **Computed keys** take a string enum member, a string const or a string literal (`["Content-Type"]`). Numeric members, numbers and runtime variables are errors.
- **Complex consts are inlined as a new literal at every reference.** `for each k in BIG_MAP` then `BIG_MAP[k]` builds the AA once per reference, so read it into a local first in loops.
- **A local variable silently shadows a const of the same name, in any case.** `trailer = createObject("roByteArray")` then `trailer.push(TRAILER)` pushed the byte array itself: the const was not inlined and nothing was reported. bsc inlines the const only where the local is not yet assigned, which is fragile. Never give a local a const's name.
- **Hex consts work:** `const TRAILER_INTRODUCER = &h3B`.

## Operators and literals

| Feature | Transpiles to | Watch for |
| --- | --- | --- |
| `a ?? b` | `bslib_coalesce(a, b)` when both sides are simple; otherwise an IIFE capturing the variables | `m.x.y ?? 0` is an IIFE call on every evaluation |
| `c ? a : b` | `if`/`else` on the right of an assignment; `bslib_ternary(c, a, b)` (both sides evaluated) or an IIFE elsewhere | Not a standalone statement; put a space after `?` before `[` or `(`, or it parses as optional chaining |
| `` `a ${b}` `` | `"a " + bslib_toString(b)` | Newlines become `chr(10)` |
| `/x/i` | `CreateObject("roRegex", "x", "i")` | A new object per evaluation; escape `/` as `\/` |
| `node@.fn(a)` | `node.callfunc("fn", a)` | With no arguments `invalid` is passed, so the target needs one dynamic parameter |
| `try … catch` (no variable) | `catch e` | — |
| `SOURCE_LINE_NUM`, `FUNCTION_NAME`, `PKG_PATH`, … | String or number literals | `FUNCTION_NAME` gives the transpiled `ns_fn` name |
| `x?.y` | Itself, natively | Native from Roku OS 11 only; gated by `minFirmwareVersion` |

- **`bslib.brs`** is emitted to `source/` and added to every component that uses it, even in a library with no `source/` folder of its own.

## Imports

- **`import "pkg:/components/x/x.bs"`** at the top of a `.bs` file adds a `<script>` tag for it to every component XML that includes the importing file.
- **Type-only files transpile to empty scripts.** Turn on `pruneEmptyCodeFiles` to drop them and their `<script>` tags.
- **The language server flags an un-imported file** as `file-not-referenced` until something imports it.

## Classes

- **Classes compile to builder functions over AAs:** `new Person()` becomes `Person()`. Methods bind `m` only when called through the instance; a method lifted off the object sees the caller's `m`.
- **Prefer namespaced functions over classes for component logic.** Node fields copy AAs, and functions inside them are not expected to survive the copy (not tested here), so instances do not travel between components or threads.

## bsconfig

```jsonc
{
  "rootDir": ".",
  "files": ["components/**/*"],
  "compilerOptions": {
    "autoImportComponentScript": true,  // x.xml picks up x.bs
    "strict": true,                     // strictCallFunc + strictNodeMembers
    "pruneEmptyCodeFiles": true,        // drop type-only scripts
    "minFirmwareVersion": "10.0.0"      // `?.` becomes an error below 11
  }
}
```

| Option | Effect |
| --- | --- |
| `strict` | Turns on `strictCallFunc` (no `@.` on bare `roSGNode`) and `strictNodeMembers` (unknown fields on typed nodes are errors) |
| `minFirmwareVersion` | Gates natively-compiled syntax: `?.` from 11.0; `continue for/while` from 11.5, rewritten to `goto` below it; line continuation in `.brs` from 15.3 |
| `pruneEmptyCodeFiles` | Removes empty output files and their script tags |
| `emitDefinitions` | Writes `.d.bs` type definitions |
| `sourceMap` | Source maps for the debugger |
| `extends` | Inherits another bsconfig; deep-merges only `compilerOptions`, other arrays are replaced |
| `diagnosticFilters` / `diagnosticSeverityOverrides` | Silence or re-level codes by path |

- **The build lands in `outDir`.** With a `stagingDir` set, files go there instead, so zip from that folder: the manifest must sit at the zip's root.

## Suppressing diagnostics

- `' bs:disable-next-line: code1 code2` above a line; `' bs:disable-line` on it.
- `' bs:disable: code` … `' bs:enable` around a span; a bare `bs:disable` at the top covers the file.
- Suppress with the code named, and say why on the line above.
