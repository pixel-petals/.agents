# SceneGraph Components, Typed

How a component is laid out so bsc v1 can check it, taken from the Motion component (`roku.rive-adapter/src/roku`). Architecture and framework patterns (screens, gateways, focus, the async wrapper) are the `roku-standards` skill's domain.

## One component

```text
components/motion/player/lottie/
  lottie.xml        <component name='Motion.Lottie'> — interface fields only, no logic
  lottie.bs         entry points + namespace motion.lottie
  lottie.type.bs    m's interface, node interfaces, enums
```

### `lottie.type.bs`

```brighterscript
import "pkg:/components/motion/player/player.type.bs"

namespace motion.lottie

    ' AnimatedImage's `state`, as observed on device
    enum ImageState
        DECODE = "decode"
        STOP = "stop"
        ERROR = "error"
    end enum

    interface Scope
        top as motion.player.Node
        image as motion.lottie.ImageNode
        media as motion.Media
        hasEnded as boolean
    end interface

end namespace
```

### `lottie.bs`

```brighterscript
import "pkg:/components/motion/player/lottie/lottie.type.bs"

typecast m as motion.lottie.Scope

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
    if m.image.state = motion.lottie.ImageState.DECODE then motion.lottie.layout()
end sub

namespace motion.lottie

    ' Fits the image into the requested bounds.
    sub layout()
        fitted = motion.fit.bounds(m.top.size, m.media.width, m.media.height)
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
' Binds each child id to m.nodes.<id>, for the nodes init() works with.
' @param {string[]} ids  ids from the component's <children>
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
    optional motionTask as motion.task.Node
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

## Tasks

A long-lived task answers requests on the request node itself (the roku-kit Server pattern):

```brighterscript
typecast m as motion.task.Scope

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
        if type(event) = "roSGNodeEvent" then motion.task.respond(event.getData())
    end while
end sub
```

- **One task, shared on `m.global`,** since Roku caps how many tasks exist.
- **Answer on the request's own `result` field, with one assignment:** only the asker hears it, never half-written.
- **Code shared by the render and task threads** (type guards, the data contract) lives in a shared folder that both import; each thread gets its own copy of the script.

## Type guards

Comparing mismatched types, including against `invalid`, crashes BrightScript. Guard values from JSON, fields and callers with a shared namespace:

```brighterscript
namespace motion.is
    ' @param {dynamic} value
    ' @return {boolean}
    function string(value)
        valueType = type(value)
        return valueType = "String" or valueType = "roString"
    end function
end namespace
```

Inside the namespace, call siblings fully qualified when their name is a type keyword (`motion.is.integer`), and narrow afterwards with `typecast` (see [brighterscript.md](brighterscript.md#narrowing)).
