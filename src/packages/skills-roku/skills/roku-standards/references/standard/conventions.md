# Conventions

The small rules that keep thousands of functions across hundreds of
components uniform. None of them are clever; all of them compound.

## File naming

- **Behavior files**: lowercase, dot-namespaced —
  `contentapi.auth.code.brs`, `grid.focus.move.brs`,
  `router.navigate.brs`. The dots read as a path: subsystem → area →
  concern.
- **Component XML**: lowercase, dot-namespaced files — `action.fetch.xml`,
  `base.screen.xml`, `smart.label.xml` — holding PascalCase, dot-namespaced
  component *names* that match the file, case aside:

  ```xml
  <component name="Action.Fetch" extends="Action.Worker" />
  ```

  Lowercase because not every file system is case-sensitive, so a name
  that differs only in case breaks somewhere. In a project whose XML files
  are already PascalCase (`Action.Fetch.xml`), match the project.

  The namespace prefix announces the component's family at a glance:

  | Prefix | Family |
  | --- | --- |
  | `Base.*` | Wrappers over Roku built-ins (the anti-corruption layer) |
  | `Smart.*` | Styled, theme-aware interface elements |
  | `Action.*` / `Worker.*` | Async command machinery |
  | `Brand.*` | Brand-owned (scene, theme) |
  | `Config.*` / `Style.*` | Configuration and style nodes, filled from script or the theme |

- **One concern per file, aggressively.** A router might be three files
  (`router.brs`, `router.interface.brs`, `router.navigate.brs`); a
  complex grid might be ten (`grid.brs`, `grid.events.brs`,
  `grid.recycle.brs`, `grid.keypress.brs`…), stitched together with
  imports at the top of the main file. Files stay small enough to read
  whole. Split when a file passes ~150–200 lines.
- **Plural folder names are load-bearing**: anything under a
  `components|tasks|models|actions|routes|modals|gateways` folder ships to
  Roku's `components/` tree via the build mapping (see
  [architecture.md](./architecture.md)). Naming a folder is a build
  decision.

## XML is structure; script is everything else

XML `<children>` describes the component's hierarchy: node types, ids and
nesting. No logic, and no field values either. Translations, focusability,
sizes and styles are rarely static over a component's lifetime, so they
belong where they can change: the script. The XML then reads as an outline
of what the component is made of.

```xml
<component name="Search" extends="Base.Screen">
  <children>
    <Base.Keyboard id="keyboard" />
    <Smart.Label id="title" />
    <Grid id="results" />
  </children>
</component>
```

The script binds every id once, then sets values and does everything else:

```brighterscript
sub init()
    getNodes(["keyboard", "title", "results"])   ' → m.nodes.keyboard etc.

    m.nodes.keyboard.setFields({ translation: [120, 190], focusable: true })
    m.nodes.title.translation = [600, 190]
    m.nodes.results.setFields({ translation: [600, 240], fixedItemsPerLane: 5 })
    ' behavior from here on
end sub
```

- **One helper call binds every node `init()` works with.** SceneGraph has
  no built-in for it; write it once rather than repeating
  `m.top.findNode(...)` per node.
- **Bind into `m.nodes.*` by default:** one bag holds every node reference,
  so a debugger shows them together, apart from component state. In a
  legacy project whose code already reads `m.keyboard`, bind straight onto
  `m.<id>` for compatibility, and match whichever the project uses.
- **Styles come from the theme, applied in script.** Where a project has
  `Config.*` / `Style.*` nodes, script creates and fills them too.

```brighterscript
' @param {string[]} ids  ids from the component's <children>
'
' Binds each child id to m.nodes.<id>.
'
sub getNodes(ids)
    if m.nodes = invalid then m.nodes = {}
    for each id in ids
        node = m.top.findNode(id)
        if node = invalid then logWarn(`getNodes: no node with id '${id}'`)
        m.nodes[id] = node
    end for
end sub
```

Many component XMLs are *empty* except the `extends` — the XML exists only
because Roku requires it (with BrighterScript's
`autoImportComponentScript`, the sibling script is wired automatically).

## No magic values

Every literal that means something gets a name, and each kind of value has
a home:

| Value kind | Home | Usage |
| --- | --- | --- |
| UI copy | strings table / resource file | `resource.getString("search.no_results")` |
| Colors, fonts | brand theme enums | `theme.brand.Color.GREY_20`, `getTheme().button` |
| Event names | enums | `AppEvent.PAGE_VIEW` |
| Domain constants | namespaced constants files | `const.video.brs`, `const.error.brs` |
| Tunables | named `const` at the top of the using file | `const SEARCH_DEBOUNCE_SEC = 3` |
| URLs, env config | config module + build flags | `getConfig().apiBase` |

```brighterscript
' theme file — colors exist exactly once
enum BrandColor
    WHITE   = &HFFF2F2F2FF
    GREY_20 = &HFF333333FF
    GREY_10 = &HFF1A1A1AFF
end enum
```

## Code style

- Guard clauses and early returns over nesting; single-line
  `if x then return` is idiomatic.
- Type guards everywhere: `is.invalid(x)`, `is.string(x, { len: 2 })`,
  `is.EQ(a, b)` — never raw `type()` comparisons in app code. BrighterScript
  does not narrow a type through a guard, so open the guarded block with
  `typecast x as T`.
- Types live in JSDoc, never in signatures: `' @param {Content} item` and
  `' @return {boolean}` above an untyped `function render(item)`. Roku does
  not convert a value that mismatches an `as` type; it crashes.
- Functions are grouped in namespaces — in components and in `source`
  utilities alike. Top-level functions are only the entry points SceneGraph
  names by string: `init`, observer callbacks, a Task's `functionName`,
  callFunc targets. Classes are for value objects (a Promise, a pool), not
  for grouping functions.
- Logging via `out.info/warn/error` with template strings; `print` is for
  scratch debugging only and never committed.
- Comment *banners* mark public entry points in foundational files
  (`main`, framework seams); everyday code has few comments because names
  and small files carry the meaning.
- JSDoc blocks are type declarations, not commentary, so every function
  has one: its `@param` types, then a one-line intent, then `@return`,
  each followed by a bare `'` line. The intent sits between the params
  and the return because bsc's intellisense misreads it above the params.
- Honest comments where reality bites — a known wart gets named, not
  hidden:

  ```brightscript
  ' there is a small leak here, but it only affects the debug relaunch path
  ```

- Anonymous subs for short callbacks (promise `.then`, hooks); named
  functions for anything reused or non-trivial.

## Documentation

- **Colocated**: a README lives in the folder it documents — the hooks
  README next to the hooks implementation, the API-domain-model README
  next to the gateway's query code. Because the build strips `.md` from
  the package, colocated docs are free.
- **Written at the point of use**: domain knowledge that isn't in the
  code — API quirks, data-model semantics — goes in the nearest README:

  > `?guid=` and `&parent=` cannot be combined; the API returns
  > `200 OK` with an empty body instead of an error.

  One sentence like that saves the next person a day.
- **Breadcrumbed**: each README opens with a small nav block linking
  parent and sibling pages; a script maintains the links so they don't
  rot.
- **Diagrams as code**: mermaid blocks in markdown, not binary images.
