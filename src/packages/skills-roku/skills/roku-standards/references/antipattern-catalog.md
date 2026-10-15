# Roku Anti-Pattern Catalog

Field guide for legacy Roku codebases. Each entry: how to **recognize** the
anti-pattern, what it **costs** (why it's harmful, not just ugly), and what
to **write instead** — with a minimal version that works in any repo today,
no framework required.

Entries are roughly ordered by how often they appear and how much damage
replication does. None of them are ever the thing to imitate, no matter how
consistently the legacy codebase does them.

All snippets are plain BrightScript so they apply to any project; if the
project uses BrighterScript, the same shapes apply with nicer syntax
(imports, enums, template strings).

---

## 1. Logic in XML `<script>` blocks

**Recognize:**

```xml
<component name="DetailsScreen" extends="Group">
  <script type="text/brightscript">
    <![CDATA[
      sub init()
          m.title = m.top.findNode("title")
          ' ...300 more lines of business logic inside the XML...
      end sub
    ]]>
  </script>
  <children> ... </children>
</component>
```

**Cost:** No linting, terrible diffs, logic invisible to search-by-filetype,
nothing shareable between components.

**Write instead:** XML holds structure only; behavior and values live in a
script file:

```xml
<component name="DetailsScreen" extends="Group">
  <script type="text/brightscript" uri="DetailsScreen.brs" />
  <children>
    <Label id="title" />
  </children>
</component>
```

**Minimal version:** for any XML you touch, put *new* logic in the sibling
`.brs` file — even if the file currently has both. Never grow the CDATA
block.

## 2. `observeField` string-callback spaghetti

**Recognize:**

```brightscript
sub init()
    m.top.observeField("content", "onContent")
    m.top.observeField("visible", "onVis")
end sub

sub onContent()
    m.grid.content = m.top.content
    m.top.ready = true          ' ← sets a field...
end sub
' ...800 lines later...
sub somethingElse()
    m.top.observeField("ready", "onReady")   ' ← ...observed from elsewhere
end sub
```

**Cost:** Callbacks named in strings are rename-unsafe; observers
registered all over the file make the field→handler web the app's real,
undocumented control flow; fields-triggering-fields creates emergent
execution order nobody can predict.

**Write instead — minimal version:** every observer is registered as the
last step of `init()`, with `observeFieldScoped`, and nowhere else. Last,
so no observer can fire before `init()` has finished setting up `m`. A
helper such as `setupObservers()` is fine, but the order is what matters,
not the helper:

```brightscript
sub init()
    m.keyboard = m.top.findNode("keyboard")
    m.grid = m.top.findNode("grid")

    ' observers last: the ONLY place this component registers them
    m.top.observeFieldScoped("content", "onContent")
    m.top.observeFieldScoped("visible", "onVisibleChanged")
    m.keyboard.observeFieldScoped("text", "onSearchText")
end sub
```

Callbacks named by string must be top-level functions: BrighterScript
never rewrites namespaced names inside strings.

Fuller version (if the project adopts one): an `observe()` helper taking
function references, or a hooks layer (`onMount`, `onContent`, `onFocus`)
so lifecycle has names instead of field-wiring. With references, any
namespaced function works as a callback.

## 3. The God file / God handler

**Recognize:** `MainScene.brs` at 2,000+ lines; one `onKeyEvent` with 40
branches; a `Utils.brs` where everything lives:

```brightscript
' @param {string} key
' @param {boolean} press
'
' @return {boolean}
'
function onKeyEvent(key, press)
    if not press then return false
    if key = "back"
        if m.inSearch and m.keyboardVisible and not m.resultsFocused
            ' ...35 more elses, one per screen/state combination...
```

**Cost:** Every change touches the same file (merge conflicts), nothing is
findable, and each added branch raises the cost of the next.

**Write instead — minimal version (the 1-line rule):** when adding to a God
file, put the logic in a *new* file and call it — the God file grows by one
line, not forty:

```brightscript
' MainScene.brs — your entire diff to this file:
if key = "options" then return handleOptionsKey()   ' see OptionsKey.brs
```

Fuller version: one concern per file joined by `<script uri>` entries or
imports; per-key handlers registered individually instead of a switch. Do
not split the rest of the God file uninvited — just stop feeding it.

## 4. Network and parsing on the render thread / in UI components

**Recognize:**

```brightscript
' inside a screen component
sub loadContent()
    req = CreateObject("roUrlTransfer")            ' ← render thread
    req.setUrl("https://api.prod.example.com/v2/content/" + m.top.id)
    json = ParseJson(req.getToString())            ' ← blocks all UI
    m.title.text = json.data.attributes.display_title  ' ← vendor shape in UI
end sub
```

**Cost:** UI jank/freezes (Roku terminates apps that block the render
thread too long), API knowledge smeared across every screen, and an API
change becomes a whole-app change.

**Write instead — minimal version:** one Task component per API area that
owns URLs and converts vendor JSON to app models; screens observe a result
field and never see a URL:

```xml
<!-- ApiTask.xml -->
<component name="ApiTask" extends="Task">
  <script type="text/brightscript" uri="ApiTask.brs" />
  <interface>
    <field id="request" type="assocarray" />
    <field id="response" type="assocarray" />
  </interface>
</component>
```

```brightscript
' ApiTask.brs — the ONLY file that knows URLs and response shapes
sub init()
    m.top.functionName = "execute"
end sub

sub execute()
    req = m.top.request
    raw = fetchJson(buildUrl(req))         ' roUrlTransfer lives here, on the Task thread
    m.top.response = parseContent(raw)     ' vendor JSON → app model
end sub

' @param {roAssociativeArray} raw
'
' @return {object}
'
function parseContent(raw)
    ' normalize once; screens never see data.attributes.*
    return {
        title:    raw?.data?.attributes?.display_title
        synopsis: raw?.data?.attributes?.long_description
    }
end function
```

```brightscript
' the screen — no URL, no vendor shape, no blocking
sub loadContent()
    m.task = CreateObject("roSGNode", "ApiTask")
    m.task.observeField("response", "onContent")
    m.task.request = { endpoint: "content", id: m.top.id }
    m.task.control = "run"
end sub
```

## 5. Copy-paste components ("make another one like ScreenA")

**Recognize:** `MovieDetails.brs` and `SeriesDetails.brs` are 90%
identical; grids/keyboards duplicated per screen with tweaked numbers;
fixing a bug means remembering every place it was pasted.

**Cost:** Bug fixes and platform workarounds silently diverge across
copies; the codebase grows linearly with features instead of
logarithmically.

**Write instead:** extract shared structure at the *second* copy;
configure differences via fields:

```xml
<!-- BaseDetails.xml — the shared skeleton -->
<component name="BaseDetails" extends="Group">
  <script type="text/brightscript" uri="BaseDetails.brs" />
  <interface>
    <field id="buttonLabels" type="array" />
  </interface>
  <children> <!-- hero, metadata row, button row --> </children>
</component>
```

```xml
<!-- LiveDetails.xml — a variant is now a few lines -->
<component name="LiveDetails" extends="BaseDetails">
  <script type="text/brightscript" uri="LiveDetails.brs" />
</component>
```

**Minimal version:** the third-copy rule — before creating copy №3,
extract only the part your task needs shared (one function or one child
component), point the existing two copies at it, and build the new thing
on it. Full base-component extraction can come later.

## 6. Magic values everywhere

**Recognize:**

```brightscript
url = "https://api.prod.example.com/v2/search"   ' also in 14 other files
' url = "https://api.staging.example.com/v2/search"   ' ← the "environment story"
m.title.color = "0x1A1A1AFF"
m.errorLabel.text = "Something went wrong. Please try again."
m.global.notify = "userLoggedIn"    ' stringly-typed event, typo = silent failure
```

**Cost:** Environments switch by editing code; rebranding touches hundreds
of files; typos in stringly-typed names fail silently at runtime.

**Write instead — minimal version:** one constants file is a seam any repo
can absorb today:

```brightscript
' Constants.brs
'
' @return {object}
'
function AppConstants()
    return {
        API_BASE:  "https://api.prod.example.com/v2"    ' see Config for env switching
        COLOR_BG:  "0x1A1A1AFF"
        COLOR_TEXT:"0xF2F2F2FF"
        EVENT_USER_LOGIN:  "userLoggedIn"
        EVENT_PAGE_VIEW:   "pageView"
        MSG_GENERIC_ERROR: "Something went wrong. Please try again."
    }
end function
```

The rule for legacy work: **never add a new magic value**, even where ten
already exist. Name yours; convert old ones only in lines you already
touch.

## 7. `m.global` as a mutable grab-bag

**Recognize:** dozens of unrelated fields on the global node, written from
anywhere, observed from everywhere:

```brightscript
m.global.addFields({ lastScreen: "", searchOpen: false, tempResult: invalid })
' ...somewhere else entirely...
m.global.tempResult = json      ' who reads this? who else writes it?
```

**Cost:** Invisible coupling — a shared mutable namespace with no
ownership; cross-thread copies silently diverge; "who set this?" becomes
unanswerable.

**Write instead:** global holds *static app context*, written once at
launch (env, device info, config). Dynamic communication uses named events
or fields on an owning component:

```brightscript
' main.brs — the only writer of global fields
m.global.addFields({
    env: env
    config: loadConfig(env)
    deviceInfo: getDeviceSnapshot()
})
```

**Minimal version:** never add a new global field for messaging. Add one
observed field on the component that *owns* the state, or one named event
(constant from №6) on a single dedicated `eventBus` node — not a new
top-level global.

## 8. Analytics calls sprinkled through UI code

**Recognize:**

```brightscript
' in SearchScreen.brs
m.adobe.callFunc("track", { pageName: "search" })
' in DetailsScreen.brs — same intent, different fields, different casing
m.adobe.callFunc("track", { page_name: "Details", contentId: id })
' in Player.brs
beacon = CreateObject("roUrlTransfer") : beacon.setUrl(comscoreUrl + ...)
```

**Cost:** Vendor swap = whole-app surgery; tracking is inconsistent because
every call site made its own decisions; vendor SDK bugs crash feature code.

**Write instead — minimal version:** a one-file facade; screens state
*what happened*, only the facade knows vendors exist:

```brightscript
' @param {string} pageName
' @param {object} [context]
'
' Analytics.brs
'
sub trackPageView(pageName, context = {})
    payload = { pageName: pageName, ts: CreateObject("roDateTime").asSeconds() }
    payload.append(context)
    ' the ONLY place vendor SDKs are called:
    m.adobe.callFunc("track", payload)
end sub
```

```brightscript
' any screen
trackPageView("search")
```

Fuller version: screens publish semantic events (`EVENT_PAGE_VIEW`) on an
event bus; one adapter component per vendor subscribes and translates.
Adding/removing a vendor then touches one folder.

## 9. Manual focus bookkeeping

**Recognize:**

```brightscript
m.keyboardFocused = true
m.resultsFocused = false
m.wasOnMenu = m.menuFocused     ' flags about flags
' ...
if key = "down" and m.keyboardFocused and not m.dialogOpen
    m.keyboard.setFocus(false)
    m.results.setFocus(true)
    m.keyboardFocused = false : m.resultsFocused = true
```

**Cost:** Focus is the #1 Roku bug category; shadow booleans drift from
actual focus state and interact combinatorially — every fix breaks a
different screen.

**Write instead — minimal version:** one function per screen owns *all*
`setFocus` calls, and focus state is read from the node tree, never from
flags:

```brightscript
' @param {string} direction
'
sub moveFocus(direction)
    ' the ONLY sub in this screen allowed to call setFocus()
    if direction = "down" and m.keyboard.isInFocusChain()
        m.results.setFocus(true)
    else if direction = "up" and m.results.isInFocusChain()
        m.keyboard.setFocus(true)
    end if
end sub

' @param {string} key
' @param {boolean} press
'
' @return {boolean}
'
function onKeyEvent(key, press)
    if not press then return false
    if key = "up" or key = "down"
        moveFocus(key)
        return true
    end if
    return false
end function
```

Fuller version: a declarative focus map (`[[keyboard, results]]` meaning
"keyboard is left of results") interpreted by one shared helper.

## 10. `print` debugging and dead code left in place

**Recognize:**

```brightscript
print "HERE 2"
print "json="; json
' sub oldLoadContent()     ' commented out 2019-04-12
'     ...
' end sub
if false then legacyMigration()
```

**Cost:** Noise that buries real log signal; dead code that still costs
comprehension time — and gets "consistently" imitated.

**Write instead — minimal version:** a 15-line leveled logger; new code
uses it, old `print`s convert only in lines you already touch:

```brightscript
' @param {dynamic} msg
'
' Log.brs
'
sub logInfo(msg)
    logAt(2, msg)
end sub
' @param {dynamic} msg
'
sub logError(msg)
    logAt(0, msg)
end sub
' @param {integer} level
' @param {dynamic} msg
'
sub logAt(level, msg)
    #if DEBUG
        levels = ["ERROR", "WARN", "INFO"]
        print "[" + levels[level] + "] "; msg
    #end if
end sub
```

Dead code: delete it (git remembers) — but only after proving it's
unreferenced. On Roku that means grepping scripts *and* XML, because
components are referenced by string name.

## 11. Raw Task wiring repeated per call

**Recognize:** every async operation hand-builds ~20 lines of ceremony,
each copy subtly different, error paths mostly missing:

```brightscript
m.searchTask = CreateObject("roSGNode", "SearchTask")
m.searchTask.observeField("state", "onSearchState")
m.searchTask.observeField("result", "onSearchResult")
m.searchTask.query = text
m.searchTask.control = "run"
' (no unobserve, no error handling — copy #7 of this block in the file)
```

**Cost:** Boilerplate per call; leaked observers and task nodes; errors
unhandled because handling them is tedious in this shape.

**Write instead — minimal version:** wrap the ceremony once:

```brightscript
' @param {string} taskType
' @param {object} fields
' @param {string} onDone
'
' TaskRunner.brs
'
' @return {object}
'
function runTask(taskType, fields, onDone)
    task = CreateObject("roSGNode", taskType)
    task.update(fields, true)
    task.observeField("result", onDone)
    task.control = "run"
    return task
end function
```

```brightscript
m.searchTask = runTask("SearchTask", { query: text }, "onSearchResult")
```

Fuller version: adopt a promise implementation (the community
`roku-promise` library, or an in-house one) so async code chains with
`.then` and error paths are first-class.

## 12. No environment story

**Recognize:** one build; prod URLs hardcoded (see №6) with staging
variants in comments; QA tests against prod; "switch to staging" is a code
edit that has been shipped to production by mistake at least once.

**Cost:** Exactly that incident, eventually.

**Write instead — minimal version:** compile-time consts in the manifest
plus one config function:

```text
# manifest
bs_const=DEBUG=false;STAGING=false
```

```brightscript
' Config.brs
'
' @return {object}
'
function getConfig()
    #if STAGING
        return { apiBase: "https://api.staging.example.com/v2", logLevel: 2 }
    #else
        return { apiBase: "https://api.prod.example.com/v2", logLevel: 0 }
    #end if
end function
```

Fuller version: one build config per environment (prod / staging / cert /
debug) sharing a common base, with the manifest generated per-target, so
an environment is a build selection — never a code edit.

---

## Using this catalog

When you meet code matching an entry: **don't replicate it, don't crusade
against it.** Write your addition using the minimal version, leave the
existing rot untouched, and mention the catalog entry in your summary so a
human can decide whether a larger cleanup (see the
[adoption guide](./adoption.md)) is worth scheduling.

Each entry's "fuller version" — the pattern the minimal version grows
into — is specified in
[standard/framework-patterns.md](./standard/framework-patterns.md).
