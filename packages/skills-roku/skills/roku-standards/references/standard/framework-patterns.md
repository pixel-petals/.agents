# Framework Patterns

The core insight: **raw SceneGraph is a hostile API, so build a small
framework once and write the whole app against it.** Every pattern below
exists to eliminate a specific Roku pain. Snippets show both the API a
component author sees and enough of the mechanism to rebuild it.

Syntax is BrighterScript where it matters (enums, imports, anonymous
subs); everything has a plain-BrightScript equivalent.

## Hooks — lifecycle without observeField strings

Roku's native model is `init()` plus
`m.top.observeField("field", "callbackName")` string wiring: rename-unsafe
and scattered. Instead, components register callbacks *by function
reference* against named lifecycle moments:

```brighterscript
sub init()
    getNodes(["keyboard", "title", "results"])   ' bind XML ids → m.nodes.*

    useHook.mount(onMount)                       ' first time visible
    useHook.onContent(onContent)                 ' content field changed
    useHook.focus(onFocus)                       ' focus received
    useHook.keyPress(KeyPress.BACK, onKeyBack)   ' key handling, per-key
    useHook.show(sub ()                          ' anonymous subs work too
        eventBus.notify(AppEvent.PAGE_VIEW, { type: "search" })
    end sub)
end sub
```

Give the hook vocabulary real lifecycle *semantics* the platform lacks:

- `mount` ≠ `visible` ≠ `ready`: mount fires once on first display;
  visible/hidden fire on each toggle; ready fires after async load
  completes.
- `keyPress(key, handler)` per key, instead of one God `onKeyEvent`
  switch.
- `onProp`, `onStyle`, `onContent` for field changes, by function ref.

The mechanism is small: a base component (`Base.Screen` etc.) owns the
actual `observeField`/`onKeyEvent` plumbing once, stores registered
function references in `m._hooks`, and invokes them at the right moments.
Component authors never touch the plumbing again.

## State — setState/getState per component

Standardize *where mutable component state lives*, so it isn't scattered
across ad-hoc `m.` fields:

```brighterscript
setState({ isSearching: true, searchText: text })
if getState().isSearching then return
```

The implementation is ~15 lines (a lazily-created `m.state` bag plus a
merge), which is the point — the value is the convention, not the code:

```brighterscript
' @return {object}
'
function getState()
    if m.state = invalid then m.state = {}
    return m.state
end function

' @param {object} newState
'
sub setState(newState)
    getState().append(newState)
end sub
```

## Promises — ES6 semantics for async

Implement (or adopt) a Promise as a SceneGraph node type with `.then`,
chaining, rejection, and composition, deliberately matching ES6 semantics
so async code reads like JavaScript:

```brighterscript
doAction("getContent", { query: { parent: id, limit: 100 } }).then(sub (results, _context)
    loading.hideIndicator()
    m.nodes.results.content = results
end sub)
```

Mechanism sketch: a `Promise` node with `fulfilled`/`rejected`/`settled`
fields; `.then` registers observers on those fields; resolution writes the
result field, firing them. Community implementations exist
(`roku-promise` and successors) — adopting one is as good as writing one.

## Actions & workers — the command pattern over Task threads

Raw Roku Tasks require node creation, field wiring, observer setup, and
cleanup per call. Instead, an **action** is a tiny component with an
`execute(args)` entry and `resolve/reject` exits, invoked by name:

```brighterscript
' the caller
doAction("fetch", { path: "/v2/trending" }).then(onTrending)
```

```brighterscript
' @param {object} args
'
' actions/Fetch/fetch.brs — a complete action
'
sub execute(args)
    waitFor({
        fetch: getGateway("content").send(buildRequest(args))
    })
end sub

' @param {object} completed
'
sub onWaitAllComplete(completed)
    resolve(completed.fetch)
end sub
```

```xml
<!-- actions/Fetch/Action.Fetch.xml — the XML is just registration -->
<component name="Action.Fetch" extends="Action.Worker" />
```

The machinery — task pooling and recycling, promise creation, timing
benchmarks, resolution queueing — lives once in the framework's `Action` /
`Action.Worker` base components. `waitFor({...})` +
`onWaitAllComplete` gives `Promise.all` semantics for fan-out. A new async
capability costs ~15 lines.

## Gateways — every byte of I/O behind one door

One module per external system is the *only* code that knows that system
exists:

- **One file per endpoint**, grouped by concern:

  ```text
  gateways/contentapi/
    contentapi.gateway.brs          ← dispatch + shared response plumbing
    endpoints/auth/auth.code.brs
    endpoints/auth/auth.status.brs
    endpoints/content/content.query.brs
    endpoints/stream/stream.get.brs
    parse/parse.collection.brs      ← vendor JSON → app models
    parse/parse.playable.brs
  ```

  Tiny files, obvious diffs, no merge conflicts.

- **A dispatch table** maps request names to response handlers, with a
  logged warning for misses:

  ```brighterscript
  ' @param {string} called
  '
  ' @return {dynamic}
  '
  function getResponseHandler(called)
      if called = "query"     then return onQueryResponse
      if called = "getStream" then return onGetStream
      if called = "authCode"  then return onAuthCode
      logWarn(`no response handler for '${called}'`)
      return invalid
  end function
  ```

- **A parse layer** converts vendor JSON into app content models *before*
  the UI sees it. Screens never touch `json.data.attributes.*`.
- **Centralized response plumbing**: status checks, token decode, error
  normalization happen once, in one `parseResponse()`.
- Gateways run on worker threads; the UI reaches them only through
  actions/promises.

## Event bus — semantic events, pluggable consumers

Provide `eventBus.notify(event, payload)` / `eventBus.subscribe(event,
handler)` over a dedicated node (or scoped channel nodes). Event names are
**typed enums**, never inline strings:

```brighterscript
enum AppEvent
    PAGE_VIEW = "pageView"
    VIDEO_START = "videoStarted"
    VIDEO_FINISH = "videoFinished"
    USER_LOGIN = "userLogin"
    ERROR_FATAL = "errorFatal"
end enum
```

The payoff is analytics (and any cross-cutting concern): each vendor is an
**adapter component** that subscribes and translates —

```brighterscript
' features/analytics/acmetrics/adapter.brs
sub init()
    m.sdk = AcmetricsInit(getConfig().acmetrics)
    eventBus.subscribe(AppEvent.PAGE_VIEW, onPageView)
    eventBus.subscribe(AppEvent.VIDEO_START, onVideoStart)
end sub

' @param {object} payload
'
sub onPageView(payload)
    m.sdk.track("screen_view", { name: payload.type })
end sub
```

Screens fire one semantic event; N vendors consume it. Adding or removing
a vendor never touches feature code, and no screen ever imports an SDK.

## Focus — declared, not computed

Focus management is the platform's most notorious bug source. Make it
declarative — a map of spatial relationships, one setter, and truth read
from the node tree:

```brighterscript
focus.setFocusMap([
    [m.nodes.keyboard, m.nodes.results]   ' adjacency: left ↔ right
    [m.nodes.menu,     m.nodes.keyboard]  ' menu above keyboard
])
```

plus `focus.set(node)` as the only way focus moves, and
`node.isInFocusChain()` instead of shadow booleans. Arrow-key navigation
is then interpreted by one shared helper walking the map — screens contain
no focus arithmetic at all. Back-key semantics live in the router, once.

## The expressions standard library

BrightScript is missing a stdlib; write one and make it globally
available. The categories that pay for themselves:

| Namespace | Purpose | Example |
| --- | --- | --- |
| `is.*` | Type guards for a dynamically-typed language | `is.invalid(x)`, `is.string(x, { len: 2 })`, `is.node(x, "Group")`, `is.EQ(a, b)` |
| `out.*` | Leveled logging; no bare `print` in app code | `out.warn(\`no handler for '${called}'\`)` |
| `create.*` / `update()` / `observe()` | Node creation with field bags, batch updates, function-ref observers | `create.node("HTTP.Request", { path: p })` |
| `objects.*`, `array.*`, `strings.*`, `datetime.*` | Polyfills mirroring the JS stdlib | `objects.merge(a, b)`, `array.map(xs, f)` |
| `timeouts.*` | Debounce/throttle | `timeouts.debounce({ duration: 3, callback: search })` |
| `color.*`, `animate.*` | Color math (hex/hsv/tween), animation helpers | `color.tween(from, to, t)` |
| `getTheme()`, `resource.getString()` | Theming and localized copy | `font: getTheme().button` |

The test of the framework's success: a complete non-trivial screen —
debounced search with a trending fallback, focus map, analytics — should
read top-to-bottom in ~150 lines with no Roku boilerplate visible:

```brighterscript
const SEARCH_QUERY_MIN_LENGTH = 2
const SEARCH_DEBOUNCE_SEC = 3

sub init()
    getNodes(["keyboard", "title", "results"])
    focus.setFocusMap([[m.nodes.keyboard, m.nodes.results]])
    useHook.mount(onMount)
    observe(m.nodes.keyboard, { text: onSearchText })
end sub

sub onSearchText()
    text = m.nodes.keyboard.text
    if not is.string(text, { len: SEARCH_QUERY_MIN_LENGTH }) then return
    m.searchTimeout = timeouts.debounce({
        duration: SEARCH_DEBOUNCE_SEC, callback: search, args: [text]
    })
end sub

' @param {string} text
'
sub search(text)
    if is.EQ(text, getState().searchText) then return
    setState({ searchText: text })
    doAction("searchContent", { term: text }).then(sub (results, _ctx)
        m.nodes.results.content = results
    end sub)
end sub
```

If a screen in your project can't look like this, the missing piece
belongs in the framework, not in the screen.
