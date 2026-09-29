# Primitives

Small shapes that come up in every interactive codebase, modelled on solid-primitives. Each is a few lines; write it when needed, and keep its name so the next reader recognises it.

The common thread: **anything that starts something returns the function that stops it.**

## Debounce and throttle

Rate-limit a function. Every variant returns the wrapped function with a `.clear()` that cancels what is pending — call it on disposal.

| Variant | Runs | For |
| --- | --- | --- |
| Debounce (trailing) | Once, after calls stop for `wait` ms | Search-as-you-type, autosave |
| Leading | On the first call, then ignores calls until quiet for `wait` | Double-click guards, submit buttons |
| Throttle | At most once per `wait`, with the latest arguments | Scroll, resize, pointer move |
| Idle | When the browser is idle (`requestIdleCallback`) | Analytics, prefetching, non-urgent saves |

```js
/** @template {(...args: any[]) => void} F @param {F} fn @param {number} wait */
export function debounce(fn, wait) {
  let timer
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
  debounced.clear = () => clearTimeout(timer)
  return debounced
}

/** @template {(...args: any[]) => void} F @param {F} fn @param {number} wait */
export function throttle(fn, wait) {
  let timer
  let lastArgs
  const throttled = (...args) => {
    lastArgs = args
    if (timer) return

    timer = setTimeout(() => {
      timer = undefined
      fn(...lastArgs)
    }, wait)
  }
  throttled.clear = () => {
    clearTimeout(timer)
    timer = undefined
  }
  return throttled
}

/** Runs on the first call; later calls only push the quiet period back. */
export function leading(fn, wait) {
  let timer
  const wrapped = (...args) => {
    if (!timer) fn(...args)
    clearTimeout(timer)
    timer = setTimeout(() => (timer = undefined), wait)
  }
  wrapped.clear = () => {
    clearTimeout(timer)
    timer = undefined
  }
  return wrapped
}
```

For idle scheduling, swap `setTimeout`/`clearTimeout` for `requestIdleCallback`/`cancelIdleCallback` in the debounce above.

## Disposal follows ownership

Every listen, observe, subscribe and timer returns a disposer. Whatever created it — a component, a controller, a test — collects the disposers and runs them all when it goes away.

```js
export function createDisposables() {
  /** @type {(() => void)[]} */
  const disposers = []
  return {
    add: dispose => (disposers.push(dispose), dispose),
    dispose: () => disposers.splice(0).reverse().forEach(dispose => dispose()),
  }
}

class PageEditor extends HTMLElement {
  #disposables = createDisposables()

  connectedCallback() {
    const { add } = this.#disposables
    add(events.on('page-saved', this.#onSaved))
    const observer = new ResizeObserver(this.#onResize)
    observer.observe(this)
    add(() => observer.disconnect())
  }

  disconnectedCallback() {
    this.#disposables.dispose()
  }
}
```

Disposing in reverse order undoes setup in the order it was built.

## Listeners that remove themselves

An `AbortSignal` removes any number of DOM listeners at once. One controller per owner, aborted on disposal.

```js
const controller = new AbortController()
const { signal } = controller

window.addEventListener('resize', onResize, { signal })
document.addEventListener('keydown', onKey, { signal })

controller.abort() // both gone
```

`fetch` takes the same signal, so one abort cancels listeners and in-flight requests together.

## A promise from an event

Wait for the next occurrence with `await` instead of nesting callbacks.

```js
/** @param {EventTarget} target @param {string} type @param {AbortSignal} [signal] */
export const nextEvent = (target, type, signal) =>
  new Promise((resolve, reject) => {
    target.addEventListener(type, resolve, { once: true, signal })
    signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
  })

await nextEvent(dialog, 'close')
```

For a custom bus, see [`once` and `toPromise`](behavioral/event-bus.md#once-and-topromise).

## Undo history from sources

History does not need to know what it restores. Each source, when it changes, pushes a callback that puts it back; history keeps the stacks and a limit.

```js
export function createUndoHistory({ limit = 100 } = {}) {
  /** @typedef {{ undo: () => void, redo: () => void }} Entry */
  /** @type {Entry[]} */ const past = []
  /** @type {Entry[]} */ const future = []

  return {
    /** Called by a source after it changes. */
    push(entry) {
      past.push(entry)
      if (past.length > limit) past.shift()
      future.length = 0
    },
    undo: () => { const entry = past.pop(); if (entry) { entry.undo(); future.push(entry) } },
    redo: () => { const entry = future.pop(); if (entry) { entry.redo(); past.push(entry) } },
    get canUndo() { return past.length > 0 },
    get canRedo() { return future.length > 0 },
  }
}

function setTitle(next) {
  const previous = title
  title = next
  history.push({ undo: () => (title = previous), redo: () => (title = next) })
}
```

Several stores can share one history. When actions have ids and triggers of their own, use a [command](behavioral/command.md) registry instead.

## Storage-backed state

Persist a value to `localStorage`, falling back to memory where storage throws — private windows, blocked cookies, a full quota, server rendering.

```js
/** @template T @param {string} key @param {T} initial */
export function createStoredValue(key, initial) {
  let memory = initial
  try {
    const raw = localStorage.getItem(key)
    if (raw != null) memory = JSON.parse(raw)
  } catch {}

  return {
    get: () => memory,
    set(value) {
      memory = value
      try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
    },
  }
}
```

The in-memory copy is the source of truth for this page; storage is a best-effort mirror. Use it for preferences, not for data that must not be lost.

## Cross-tab sync

`BroadcastChannel` is an [event bus](behavioral/event-bus.md) across tabs of the same origin. The sender does not receive its own messages.

```js
export function createTabSync(name, onMessage) {
  const channel = new BroadcastChannel(name)
  channel.onmessage = event => onMessage(event.data)
  return {
    post: data => channel.postMessage(data),
    dispose: () => channel.close(),
  }
}

const sync = createTabSync('settings', settings => applySettings(settings))
sync.post({ theme: 'dark' })
```

Messages are structured-cloned: plain data only. Pair it with storage-backed state so a tab opened later still starts with the latest value.
