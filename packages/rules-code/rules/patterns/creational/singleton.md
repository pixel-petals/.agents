# Singleton

A class that guarantees it has one instance and hands that instance to anyone who asks. Avoid it: what it provides is global state, and the costs of global state come with it.

## Why to avoid it

| Problem | Why |
| --- | --- |
| Hidden dependencies | `Store.getInstance()` inside a function is an input that does not appear in its signature. Reading the call site no longer tells you what it touches. |
| Tests share state | One test's writes leak into the next. Tests pass alone, fail together, or depend on order. |
| Hard to replace | A test double or a second configuration needs the singleton's own reset hooks. |
| Two jobs | The class does its work and also polices its own lifetime. |
| "Exactly one" rarely holds | Two editors on a page, a worker with its own copy, a test with a fresh one — the assumption breaks. |

## Prefer

**Create one and pass it.** Build the instance at the composition root — the app's entry point — and hand it to what needs it as an argument or through context.

```js
// main.js
const events = createEmitter()
const store = createStore({ events })
mountEditor(root, { store, events })
```

**Module scope when "one per program" is real.** An ES module is evaluated once, so an exported instance is already shared. No `getInstance`, no class.

```js
// logger.js
export const logger = createLogger({ level: 'info' })
```

This is still global state; the difference is that it is visible in an `import` line and trivially replaced with a test's module mock.

## When it is acceptable

- The resource is genuinely one per process — the logger, the `IndexedDB` connection, a registry of custom element names that the platform itself keeps global.
- The instance is stateless or immutable after startup — configuration read once, a frozen lookup table.
- A lazy, expensive resource must be created once on first use:

```js
let connection
export const getDb = () => (connection ??= openDatabase('app', 1))
```

Even then, prefer that the code using it receives it as an argument, so tests can hand in another.

## Pairs with

- [Factory](factory.md) — call it once at the root instead of guarding the constructor.
- [Facade](../structural/facade.md) — a shared entry point that is often exported as a module instance.
- [Event bus](../behavioral/event-bus.md) — the most common accidental singleton; pass it explicitly.
