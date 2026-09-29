# Design Patterns

A pattern is a named answer to a problem that keeps coming back. Reach for one when its problem is in front of you — never in anticipation of it ([YAGNI](principles/YAGNI.md)). When one fits, use its name: in the code (`createEventBus`, `runCommand`), in doc blocks, and in commit messages, so the next reader recognises the shape instead of re-deriving it.

Prefer the functional shape of each pattern — a factory function, a closure, an object of functions — over a class hierarchy. The intent is what matters; the textbook's class diagram is one implementation of it.

## Apply by default

These two come up in almost every interactive codebase. When their trigger appears, use them without being asked.

| When… | Use | Read |
| --- | --- | --- |
| An action can start from more than one place — a button, a key, a menu, a drag — or needs undo, redo, queueing, logging or replay | **Command**: the action as an object with `run` (and `undo`), dispatched through one function | [command](patterns/behavioral/command.md) |
| Parts of a system need to hear about something without knowing about each other | **Event bus**: a typed emitter; listeners subscribe and get back their own unsubscribe | [event-bus](patterns/behavioral/event-bus.md) |

## Reach for when the problem appears

| When… | Use | Read |
| --- | --- | --- |
| Many components talk to each other directly and every change ripples | Mediator | [mediator](patterns/behavioral/mediator.md) |
| State must be restored exactly — undo, cancel, rollback | Memento (snapshot) | [memento](patterns/behavioral/memento.md) |
| Behaviour switches on a mode or status in several places at once | State machine | [state](patterns/behavioral/state.md) |
| One job, several interchangeable ways to do it | Strategy | [strategy](patterns/behavioral/strategy.md) |
| A request passes through steps that may handle, change or stop it | Chain of responsibility (middleware) | [chain-of-responsibility](patterns/behavioral/chain-of-responsibility.md) |
| A collection must be walked without exposing how it is stored | Iterator (generator) | [iterator](patterns/behavioral/iterator.md) |
| Several procedures share a skeleton and differ in a few steps | Template method (hooks) | [template-method](patterns/behavioral/template-method.md) |
| Many operations over a fixed set of node types, like a document tree | Visitor | [visitor](patterns/behavioral/visitor.md) |
| An API has the wrong shape for its caller | Adapter | [adapter](patterns/structural/adapter.md) |
| A subsystem is complicated to use for the common case | Facade | [facade](patterns/structural/facade.md) |
| Behaviour is added around a function or object — logging, caching, retries | Decorator (wrapper) | [decorator](patterns/structural/decorator.md) |
| Parts and wholes are treated alike — trees of nodes | Composite | [composite](patterns/structural/composite.md) |
| Access needs controlling — lazy loading, caching, permission, remote | Proxy | [proxy](patterns/structural/proxy.md) |
| Two dimensions vary independently, and subclassing would multiply them | Bridge | [bridge](patterns/structural/bridge.md) |
| Very many similar objects cost too much memory | Flyweight | [flyweight](patterns/structural/flyweight.md) |
| What to create is decided at runtime, or families must match | Factory | [factory](patterns/creational/factory.md) |
| An object is assembled in steps, or has many optional parts | Builder | [builder](patterns/creational/builder.md) |
| New objects are best made by copying a configured one | Prototype (clone) | [prototype](patterns/creational/prototype.md) |
| Exactly one instance is genuinely required | Singleton — rarely; see why | [singleton](patterns/creational/singleton.md) |

## Small shapes worth reusing

Debounce and throttle, disposal that follows ownership, listeners that clean up after themselves, promises from events, undo history from sources — see [primitives](patterns/primitives.md).

## Before adding one

- **Name the problem first.** If you cannot say which row above you are in, you do not need the pattern.
- **One layer.** A pattern should replace a tangle, not wrap working code in ceremony. See [KISS](principles/KISS-keep-it-simple.md).
- **Say so.** A doc block naming the pattern tells the next reader what the pieces are for.
