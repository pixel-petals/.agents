# Design Patterns

A pattern is a named answer to a problem that keeps coming back. Reach for one when its problem is in front of you — never in anticipation of it ([YAGNI](principles/YAGNI.md)). When one fits, use its name: in the code (`createEventBus`, `runCommand`), in doc blocks, and in commit messages, so the next reader recognises the shape instead of re-deriving it.

Prefer the functional shape of each pattern — a factory function, a closure, an object of functions — over a class hierarchy. The intent is what matters; the textbook's class diagram is one implementation of it.

## Apply by default

These two come up in almost every interactive codebase. When their trigger appears and nothing in the code already does the job, use them without being asked.

| When… | Use | Read |
| --- | --- | --- |
| An action can start from more than one place — a button, a key, a menu, a drag — or needs undo, redo, queueing, logging or replay | **Command**: the action as an object with `run` (and `undo`), dispatched through one function | [command](patterns/behavioral/command.md) |
| Parts of a system need to hear about something without knowing about each other | **Event bus**: a typed emitter; listeners subscribe and get back their own unsubscribe | [event-bus](patterns/behavioral/event-bus.md) |

## Reach for when the problem appears

| When… | Use | Read |
| --- | --- | --- |
| Many components talk to each other directly and every change ripples | Mediator | [mediator](patterns/behavioral/mediator.md) |
| State must be restored exactly — undo, cancel, rollback | Memento (snapshot) | [memento](patterns/behavioral/memento.md) |
| A status of three or more values is checked, and moved between, in several functions | State machine | [state](patterns/behavioral/state.md) |
| One job, several interchangeable ways to do it | Strategy | [strategy](patterns/behavioral/strategy.md) |
| A request passes through steps that may handle, change or stop it | Chain of responsibility (middleware) | [chain-of-responsibility](patterns/behavioral/chain-of-responsibility.md) |
| A collection must be walked without exposing how it is stored | Iterator (generator) | [iterator](patterns/behavioral/iterator.md) |
| Several procedures share a skeleton and differ in a few steps | Template method (hooks) | [template-method](patterns/behavioral/template-method.md) |
| Many operations over a fixed set of node types, each repeating the same dispatch on type — a `switch` per operation is the light form, and usually enough | Visitor | [visitor](patterns/behavioral/visitor.md) |
| An API has the wrong shape for its caller | Adapter | [adapter](patterns/structural/adapter.md) |
| A subsystem is complicated to use for the common case | Facade | [facade](patterns/structural/facade.md) |
| Behaviour is added around a function or object — logging, memoising results, retries | Decorator (wrapper) | [decorator](patterns/structural/decorator.md) |
| Parts and wholes are treated alike — trees of nodes | Composite | [composite](patterns/structural/composite.md) |
| Access needs controlling — lazy loading, access control, remote objects | Proxy | [proxy](patterns/structural/proxy.md) |
| Two dimensions vary independently, and subclassing would multiply them | Bridge | [bridge](patterns/structural/bridge.md) |
| Very many similar objects cost too much memory | Flyweight | [flyweight](patterns/structural/flyweight.md) |
| What to create is decided at runtime, or families must match | Factory | [factory](patterns/creational/factory.md) |
| An object is assembled in steps, or has many optional parts | Builder | [builder](patterns/creational/builder.md) |
| New objects are best made by copying a configured one | Prototype (clone) | [prototype](patterns/creational/prototype.md) |
| Exactly one instance is genuinely required | Singleton — rarely; see why | [singleton](patterns/creational/singleton.md) |

## Small shapes worth reusing

Debounce (with `flush`) and throttle, a guard against a second call while the first is in flight, disposal that follows ownership, listeners that end on every way out, promises from events, undo history from sources, storage-backed state, cross-tab sync — see [primitives](patterns/primitives.md).

## Before adding one

- **Name the problem first.** If you cannot say which row above you are in, you do not need the pattern.
- **Look for it already there.** Pure reducers behind one `commit` are a command dispatcher; the DOM's own events are an event bus; immutable snapshots are a memento; a keyed map of features is a registry. Name what exists rather than building a second one beside it.
- **Count copies.** A shared primitive earns its place at three copies of the same shape, or at two that have already drifted apart.
- **A pattern's "Not when" is also a reason to remove.** A factory that only calls `new`, or a wrapper nothing uses, goes.
- **One layer.** A pattern should replace a tangle, not wrap working code in ceremony. See [KISS](principles/KISS-keep-it-simple.md).
- **Say so.** A doc block naming the pattern tells the next reader what the pieces are for.
