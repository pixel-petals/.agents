# SceneGraph Components, Typed

How a component is laid out so bsc v1 can check it, taken from the Motion component (`roku.rive-adapter/src/roku`). Architecture and framework patterns (screens, gateways, focus, the async wrapper) are the `roku-standards` skill's domain.

## One component

```text
components/motion/player/lottie/
  lottie.xml        <component name='Motion.Lottie'> — interface fields only, no logic
  lottie.bs         entry points + namespace lottie
  lottie.type.bs    m's interface, node interfaces, enums
```

### `lottie.type.bs`

```brighterscript
import "pkg:/components/motion/player/player.type.bs"

namespace lottie

    ' AnimatedImage's `state`, as observed on device
    enum ImageState
        DECODE = "decode"
        STOP = "stop"
        ERROR = "error"
    end enum

    interface Scope
        top as player.Node
        image as lottie.ImageNode
        media as motion.Media
        hasEnded as boolean
    end interface

end namespace
```

### `lottie.bs`

```brighterscript
import "pkg:/components/motion/player/lottie/lottie.type.bs"

typecast m as lottie.Scope

sub init()
    m.image = m.top.createChild("AnimatedImage")
    m.hasEnded = false

    ' observers last, so nothing fires before init completes
    m.image.observeFieldScoped("state", "onImageState")
    m.top.observeFieldScoped("media", "onMedia")
end sub

' Observers
' ■■■■■■■■■

sub onImageState()
    if m.image.state = lottie.ImageState.DECODE then lottie.layout()
end sub

namespace lottie

    ' Fits the image into the requested bounds.
    sub layout()
        fitted = fit.bounds(m.top.size, m.media.width, m.media.height)
        m.image.setFields({ width: fitted.width, height: fitted.height })
    end sub

end namespace
```

- **`typecast m as …` goes at the top of every script file that touches `m`,** after the imports. It covers the file's namespace blocks too. A file without it sees `m` as an untyped AA.
- **Declare every `m` field in the Scope interface,** including ones set to `invalid` at first. bsc flags assignments of the wrong type (`m.count = "x"` against `count as integer`).
- **Entry points (`init`, observer callbacks) stay top-level and short:** they read the event, then call into the namespace.

## Structure in XML, values in init

The XML says what the component is made of; `init()` says how it looks and behaves.

```xml
<component name="topicsCard" extends="NewBaseCard">
    <interface>
        <!-- { listing_id, chapter_id, progress } for this topic, or invalid to clear -->
        <function name="setProgress" />
        <function name="isTopic" />
    </interface>

    <children>
        <topicRow id="topicRow" />
        <Group id="topicProgress">
            <BaseProgressBar id="topicProgressBar" />
        </Group>
    </children>
</component>
```

```brighterscript
sub init()
    findNodes([
        "topicRow"
        "topicProgress"
        "topicProgressBar"
    ])

    m.nodes.topicProgress.translation = [0, 180]
    m.nodes.topicProgressBar.width = 320
end sub
```

- **`<children>` holds node types, ids and nesting.** Leave out field values (`translation`, `focusable`, `width`, `color`, `text`, `visible`, …): they are rarely static over a component's life, so they belong in the script, where they can change, be computed, themed or typed. The XML stays a readable outline of the hierarchy.
- **Every node `init()` touches has an id,** and is listed once in `findNodes`.
- **Bind into `m.nodes.*` by default:** one bag holds every node reference, so a debugger shows them together, apart from component state. In a legacy project whose code already reads `m.topicRow`, bind onto `m.<id>` instead, and match whichever the project uses.
- **Declare the nodes in the component's Scope interface,** as a `nodes` member typed by a small interface (`topicRow as roSGNodeGroup`, …), so `typecast m` types them.

### findNodes

SceneGraph has no built-in for this. Write it once, in a shared script every component imports:

```brighterscript
' @param {string[]} ids  ids from the component's <children>
'
' Binds each child id to m.nodes.<id>, for the nodes init() works with.
'
sub findNodes(ids)
    if m.nodes = invalid then m.nodes = {}
    for each id in ids
        node = m.top.findNode(id)
        if node = invalid then print "findNodes: no node with id "; id
        m.nodes[id] = node
    end for
end sub
```

- **It runs in the calling component's scope,** so `m` and `m.top` are that component's.
- **A missing id is reported, not silently stored as `invalid`.** Use the project's logging helper in place of `print`.
- **Name it after the project's existing helper** if there is one: roku-standards' examples call it `getNodes`. For a legacy project binding onto `m.<id>`, store `m[id] = node` instead.

## Typing nodes

### Your own components

bsc builds a type for each component from its XML (`roSGNodeMotion.Data` for `<component name="Motion.Data">`). **A dot-named component's type cannot be written in source:** `roSGNodeMotion.Data` parses as a namespace path. Declare a stand-in:

```brighterscript
' Motion.Data's fields; must match data.xml exactly
interface DataNode extends roSGNodeContentNode
    states as roAssociativeArray
    ' motion.Control
    control as string
    result as roSGNodeNode
end interface
```

- **Match the XML's field types exactly.** The real node type is checked against the interface wherever one is assigned to the other, so a field typed as an enum where the XML says `string` is an `assignment-type-mismatch`. Name the enum in a comment instead.
- **Undotted component names** get a usable type directly: `roSGNodeMyWidget`.
- **File names are lowercase** (`lottie.xml` holds `Motion.Lottie`), because not every file system is case-sensitive; match the project instead if its XML files are already PascalCase.

### Nodes bsc does not know

bsc's node list can lag the firmware. **AnimatedImage is missing** in alpha.56: `createObject("roSGNode", "AnimatedImage")` raises `unknown-rosgnode`, and `roSGNodeAnimatedImage` does not exist.

```brighterscript
' bs:disable-next-line: unknown-rosgnode
m.image = m.top.createChild("AnimatedImage")
```

Then declare its fields as an interface extending the nearest base (`roSGNodeGroup`) and use that interface in the Scope.

### m.global

```brighterscript
interface Global extends roSGNodeNode
    optional motionTask as task.Node
    optional motionAudio as motion.AudioNode
end interface
```

Fields added at runtime with `addFields` are `optional` members.

## Entry points by string

SceneGraph refers to these by name, and bsc never rewrites strings, so each must be a top-level function:

| Mechanism | Example |
| --- | --- |
| Observer callback | `node.observeFieldScoped("state", "onImageState")` |
| Task thread | `m.top.functionName = "serve"` |
| callFunc target | `<function name="open" />` in the XML |
| Timer, Animation and other node callbacks | `m.timer.observeFieldScoped("fire", "onTick")` |

A table of observers can live in a namespaced const:

```brighterscript
namespace motion
    ' Motion.Data field → observer
    const DATA_OBSERVERS = { states: "onRequestField", control: "onControl" }
end namespace
```

## Observers and init

- **Observers are registered as the last step of `init()`,** with `observeFieldScoped`, never XML `onChange`: an observer set earlier can fire before `init` has finished assigning `m`. A helper such as `setupObservers()` is optional; the order is the rule.
- **Re-binding a node's observers:** unobserve the old node's fields, then observe the new one's, from the same field → callback table.
- **`alwaysNotify="true"`** on fields that carry commands (`control`), so re-sending the same value fires.
- **Observers on another component can run inside the assignment.** Setting a child's `control` ran its observer, which set its `playback`, which ran the parent's observer, all before the next line. Set up anything those observers read before the assignment that triggers them.
- **An unset `assocarray` field reads as `invalid`,** not `{}`: check `is.valid(node.field)` before `.count()`.

## Runtime facts

Checked on a device (Roku Ultra, OS 16):

- **An associative-array literal lowercases its keys:** `{ Next: true }` holds `next`. Lookups ignore case, but `=` on strings does not, so compare names with `lcase()` on both sides.
- **BrightScript strings have no escapes.** `"\"` is a single backslash; a quote is `chr(34)`.
- **`FormatJSON` takes only arrays and associative arrays.** Wrap a scalar, `FormatJSON([value])`, and strip the brackets.
- **`setFields` is a node method.** On an associative array it fails at runtime ("Member function not found"); assign members one by one.
- **Reserved words go beyond the obvious:** `run`, `step` and `goTo` (as `goto`) cannot name functions or locals.
- **A Label with a `height` clips its last line to an ellipsis** when the font's line height runs taller than expected. Leave `height` at 0 to let a wrapping Label grow.
- **A Label's line advance is the font's own line height plus `lineSpacing`.** To match a design's line height, measure the font: register it with `roFontRegistry` (`getFamilies()` before and after names the new family), then `getFont(family, size, false, false).getOneLineHeight()`, and set `lineSpacing` to the difference.
- **`roFontRegistry` exists only on the main and task threads.** On the render thread (any component's own code) `createObject` logs "MAIN|TASK-only component failed on RENDER thread" and returns `invalid`. Measure in a Task and pass the number over.
- **A key shadows an associative array's own method.** With a key `count`, `table.count()` calls the stored value and crashes ("Function Call Operator ( ) attempted on non-function"); likewise `keys`, `append`, `doesExist`. For tables keyed by content (input, state or layer names), test emptiness with `for each` and track counts yourself.

## Tasks

A long-lived task answers requests on the request node itself (the roku-kit Server pattern):

```brighterscript
typecast m as task.Scope

sub init()
    m.port = createObject("roMessagePort")
    m.top.functionName = "serve"
    ' observe on the port before the thread starts, so early requests queue
    m.top.observeFieldScoped("data", m.port)
    m.top.control = "run"
end sub

sub serve()
    while true
        event = wait(0, m.port)
        if type(event) = "roSGNodeEvent" then task.respond(event.getData())
    end while
end sub
```

- **One task, shared on `m.global`,** since Roku caps how many tasks exist.
- **Answer on the request's own `result` field, with one assignment:** only the asker hears it, never half-written.
- **Code shared by the render and task threads** (type guards, the data contract) lives in a shared folder that both import; each thread gets its own copy of the script.

## Type guards

Comparing mismatched types, including against `invalid`, crashes BrightScript. Guard values from JSON, fields and callers with a shared namespace:

```brighterscript
namespace is
    ' @param {dynamic} value
    '
    ' @return {boolean}
    '
    function string(value)
        valueType = type(value)
        return valueType = "String" or valueType = "roString"
    end function
end namespace
```

Inside the namespace, call siblings fully qualified when their name is a type keyword (`is.integer`), and narrow afterwards with `typecast` (see [brighterscript.md](brighterscript.md#narrowing)).
