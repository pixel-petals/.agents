# Event bus

A channel that carries facts from whoever caused them to whoever cares, so neither has to know the other exists. The observer pattern with the subject pulled out into its own object.

## Use when

- Several unrelated parts react to one thing happening — a save updates the title, clears a dirty flag, and logs analytics.
- A lower layer must notify a higher one without importing it.
- Listeners come and go at runtime (panels open and close, plugins load).

## Not when

- There is one listener, known at write time. Call it, or pass it as a callback.
- The caller needs an answer. An event is fire-and-forget; a request that expects a result is a function call or a [command](command.md).
- The flow is a strict sequence where each step depends on the last. Events hide that order; write the sequence.

## Rules

- **`listen` returns its own unsubscribe.** No separate `off(name, fn)` that needs the same function reference kept around.
- **Tie the unsubscribe to the owner's lifetime.** A component that listens in `connectedCallback` unsubscribes in `disconnectedCallback`; collect disposers with [`createDisposables`](../primitives.md#disposal-follows-ownership). A forgotten listener is a leak and a ghost handler.
- **Do not rely on listener order.** Subscribers are notified in an order nobody should depend on. If B must run after A, that is a sequence, not two listeners.
- **Events are facts, named in the past tense:** `page-saved`, `block-selected`. **Commands are requests, in the imperative:** `save-page`. A bus of imperatives is a command dispatcher in disguise, with no single owner of the action.
- **Type the payloads.** One `@typedef` event map documents every channel and what it carries.
- **Prefer passing the bus explicitly.** A module-level bus that everything imports is hidden global coupling — any file can emit anything, and tests share state. Hand the bus to what needs it; see [singleton](../creational/singleton.md).

## Shape

The shapes follow solid-primitives' `event-bus` package. Each stays small; pick the one that fits.

### `createEventBus` — one channel

```js
/**
 * @template T
 * @returns {{ listen(fn: (payload: T) => void): () => void, emit(payload: T): void, clear(): void }}
 */
export function createEventBus() {
  /** @type {Set<(payload: T) => void>} */
  const listeners = new Set()

  return {
    listen(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    emit(payload) {
      for (const fn of [...listeners]) fn(payload)
    },
    clear() {
      listeners.clear()
    },
  }
}
```

Copying the set before iterating lets a listener unsubscribe itself mid-emit.

### `createEmitter` — named, typed channels

```js
/**
 * @typedef {object} EditorEvents
 * @property {{ id: string, savedAt: number }} page-saved
 * @property {{ id: string }} block-selected
 * @property {void} selection-cleared
 */

/**
 * @template {Record<string, any>} Events
 */
export function createEmitter() {
  /** @type {Map<keyof Events, Set<Function>>} */
  const channels = new Map()

  /** @template {keyof Events} K */
  function on(name, /** @type {(payload: Events[K]) => void} */ fn) {
    if (!channels.has(name)) channels.set(name, new Set())
    channels.get(name).add(fn)
    return () => channels.get(name)?.delete(fn)
  }

  /** @template {keyof Events} K */
  function emit(name, /** @type {Events[K]} */ payload) {
    for (const fn of [...(channels.get(name) ?? [])]) fn(payload)
  }

  return { on, emit, clear: () => channels.clear() }
}

/** @type {ReturnType<typeof createEmitter<EditorEvents>>} */
const events = createEmitter()
```

### Event hub

A hub groups several single-channel buses under one object — `hub.saved.listen(...)`, `hub.selected.emit(...)` — and can offer a catch-all `hub.listen((name, payload) => …)` for logging or devtools. Use it when the channels are defined in one place and passed around together.

### Event stack

A bus that also keeps what it emitted: `emit` pushes onto a list, listeners receive the item and the current stack, and `remove(item)` or `clear()` edits the history. Suits toasts, notifications and activity feeds, where late subscribers need to see what already happened.

### `once` and `toPromise`

```js
/** @template T @param {{ listen(fn: (p: T) => void): () => void }} bus */
export function once(bus, fn) {
  const off = bus.listen(payload => {
    off()
    fn(payload)
  })
  return off
}

/** @template T @returns {Promise<T>} */
export const toPromise = bus => new Promise(resolve => once(bus, resolve))

await toPromise(saved) // continue after the next save
```

### Batching emits

When one change fires many events — a paste inserts forty blocks — collect them and emit once per tick, or emit a single summary event (`blocks-inserted` with a list) rather than forty `block-inserted`. Listeners that re-render then run once.

```js
export function batched(bus) {
  let queue = []
  return payload => {
    queue.push(payload)
    if (queue.length > 1) return

    queueMicrotask(() => {
      const items = queue
      queue = []
      bus.emit(items)
    })
  }
}
```

## The DOM is already a bus

For web components, `EventTarget` and `CustomEvent` are the built-in bus: typed by name, bubbling through the tree, and removable with an `AbortSignal`.

```js
this.dispatchEvent(new CustomEvent('block-selected', {
  detail: { id },
  bubbles: true,
  composed: true, // crosses shadow roots
}))

const controller = new AbortController()
host.addEventListener('block-selected', onSelect, { signal: controller.signal })
// later: controller.abort()
```

Use DOM events when sender and listener are in the same tree, and a plain `new EventTarget()` when they are not but you want the platform's semantics. Reach for `createEmitter` when payloads should be typed without subclassing `Event`, or when the code runs outside the DOM.

## Pairs with

- [Command](command.md) — commands are requests, events are the facts they produce.
- [Mediator](mediator.md) — a bus with no rules; a mediator is a hub that also decides.
- [Primitives](../primitives.md) — disposal, auto-removing listeners, promises from events, cross-tab sync with `BroadcastChannel`.
- [Singleton](../creational/singleton.md) — why a global bus is a trap.
