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
| Idle | Once calls stop and the browser is idle, `wait` ms after the last call at the latest (`requestIdleCallback`; `setTimeout` where it is missing) | Analytics, prefetching, non-urgent saves |

```js
/**
 * @template {(...args: any[]) => void} F
 * @typedef {((...args: Parameters<F>) => void) & { clear(): void }} Limited
 */

/**
 * @template {(...args: any[]) => void} F
 * @typedef {Limited<F> & { flush(): void }} Debounced
 */

/**
 * @template {(...args: any[]) => void} F
 * @param    {F}      fn
 * @param    {number} wait
 * @returns  {Debounced<F>}
 */
export function debounce(fn, wait) {
  let timer
  let pending = null

  const run = () => {
    const args = pending

    clearTimeout(timer)
    pending = null
    if (args) fn(...args)
  }

  const debounced = (...args) => {
    pending = args
    clearTimeout(timer)
    timer = setTimeout(run, wait)
  }

  debounced.clear = () => {
    clearTimeout(timer)
    pending = null
  }
  debounced.flush = run

  return debounced
}

/**
 * @template {(...args: any[]) => void} F
 * @param    {F}      fn
 * @param    {number} wait
 * @returns  {Limited<F>}
 */
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

/**
 * Runs on the first call; later calls only push the quiet period back.
 *
 * @template {(...args: any[]) => void} F
 * @param    {F}      fn
 * @param    {number} wait
 * @returns  {Limited<F>}
 */
export function leading(fn, wait) {
  let timer
  const wrapped = (...args) => {
    if (!timer) fn(...args)
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
    }, wait)
  }
  wrapped.clear = () => {
    clearTimeout(timer)
    timer = undefined
  }

  return wrapped
}

/**
 * A debounce that waits for the browser to be idle, and runs `wait` ms after the last call at the latest.
 *
 * @template {(...args: any[]) => void} F
 * @param    {F}      fn
 * @param    {number} wait
 * @returns  {Limited<F>}
 */
export function debounceIdle(fn, wait) {
  const hasIdle = typeof requestIdleCallback === 'function' // Safari has none
  const schedule = hasIdle
    ? callback => requestIdleCallback(callback, { timeout: wait })
    : callback => setTimeout(callback, wait)
  const cancel = hasIdle ? cancelIdleCallback : clearTimeout

  let handle
  const debounced = (...args) => {
    cancel(handle)
    handle = schedule(() => fn(...args))
  }
  debounced.clear = () => cancel(handle)

  return debounced
}
```

`debounceIdle` is a debounce. solid-primitives' `scheduleIdle` is a different shape: a throttle whose `maxWait` bounds how long it waits for idle, and which falls back to `throttle` where `requestIdleCallback` is missing.

## Disposal follows ownership

Every listen, observe, subscribe and timer returns a disposer. Whatever created it — a component, a controller, a test — collects the disposers and runs them all when it goes away.

```js
import { events } from './events.js' // the app's emitter; see event-bus

/** @returns {{ add(dispose: () => void): () => void, dispose(): void }} */
export function createDisposables() {
  /** @type {(() => void)[]} */
  const disposers = []

  return {
    add(dispose) {
      disposers.push(dispose)

      return dispose
    },
    dispose() {
      for (const dispose of disposers.splice(0).reverse()) dispose()
    },
  }
}

class PageEditor extends HTMLElement {
  #disposables = createDisposables()

  #onSaved = ({ id }) => {
    if (id === this.dataset.pageId) this.removeAttribute('dirty')
  }

  #onResize = () => {
    this.classList.toggle('narrow', this.clientWidth < 600)
  }

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

The handlers are arrow-function class fields, so `this` is the element however they are called.

Disposal tears down in the reverse of the order it was built: what was set up later may depend on what came before it, so it goes first.

A debounced write needs `flush()` wherever something reads what it writes: undo, save and "unsaved changes?" must flush pending typing first, and a page going hidden must flush a pending preference save. Without it, the read sees the state from before the last `wait` ms. `clear()` drops the pending call; `flush()` runs it now.

## An in-flight guard

A second call while an async action is still running gets the first call's promise, not a second request — a double-clicked Save, a retried submit. Keyed on the pending promise, not on a timer: a leading debounce guesses how long the action takes, and guesses wrong on a slow network.

```js
/**
 * @template T
 * @param    {() => Promise<T>} action
 * @returns  {() => Promise<T>}
 */
export function oneAtATime(action) {
  let running = null

  return () => {
    running ??= action().finally(() => { running = null })

    return running
  }
}
```

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

Listeners on `document` or `window` outlive the element that added them unless something ends them. Every way out ends them:

- **A gesture** — a drag, a resize, a press — ends on `pointerup`, `pointercancel` and Escape alike. Handling `pointerup` alone leaves the listeners behind when the browser cancels the pointer, and the next release anywhere acts on the stale press.
- **The owner going away** ends them too: combine the gesture's own signal with its owner's, `AbortSignal.any([ gesture.signal, owner.signal ])`.
- **A one-shot flag** — "swallow the click that ends this drag" — is a listener that removes itself after one event, and on the next `pointerdown` if that event never comes. A boolean field has no such exit and swallows some later, unrelated click.

## A promise from an event

Wait for the next occurrence with `await` instead of nesting callbacks.

```js
/**
 * @param   {EventTarget} target
 * @param   {string}      type
 * @param   {AbortSignal} [signal]
 * @returns {Promise<Event>}
 */
export function nextEvent(target, type, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)

    const onAbort = () => reject(signal.reason)
    const onEvent = event => {
      signal?.removeEventListener('abort', onAbort)
      resolve(event)
    }
    target.addEventListener(type, onEvent, { once: true, signal })
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

await nextEvent(dialog, 'close')
```

An already-aborted signal rejects at once, and the abort listener goes when the event arrives, so a long-lived signal does not collect one per call.

For a custom bus, see [`once` and `toPromise`](behavioral/event-bus.md#once-and-topromise).

## Undo history from sources

History does not need to know what it restores. Each source, when it changes, records an entry `{ undo, redo }` — two closures, one putting back the value from before the change and one applying the change again. History keeps the stacks and a limit.

```js
/**
 * @typedef {object} UndoEntry
 * @property {() => void} undo  puts the source back as it was before the change
 * @property {() => void} redo  applies the change again
 *
 * @typedef {object} UndoHistory
 * @property {(entry: UndoEntry) => void} record   called by a source after it changes
 * @property {() => void}                 undo
 * @property {() => void}                 redo
 * @property {boolean}                    canUndo
 * @property {boolean}                    canRedo
 */

/**
 * @param   {{ limit?: number }} [options]
 * @returns {UndoHistory}
 */
export function createUndoHistory({ limit = 100 } = {}) {
  /** @type {UndoEntry[]} */
  const past = []
  /** @type {UndoEntry[]} */
  const future = []

  return {
    record(entry) {
      past.push(entry)
      if (past.length > limit) past.shift()
      future.length = 0
    },
    undo() {
      const entry = past.pop()
      if (!entry) return

      entry.undo()
      future.push(entry)
    },
    redo() {
      const entry = future.pop()
      if (!entry) return

      entry.redo()
      past.push(entry)
    },
    get canUndo() { return past.length > 0 },
    get canRedo() { return future.length > 0 },
  }
}

const undoHistory = createUndoHistory()
let title = ''

function setTitle(next) {
  const previous = title
  title = next
  undoHistory.record({
    undo: () => {
      title = previous
    },
    redo: () => {
      title = next
    },
  })
}
```

Several stores can share one history. When actions have ids and triggers of their own, use a [command](behavioral/command.md) registry instead.

solid-primitives' `createUndoHistory` differs in two ways: each source returns a restore callback rather than recording an entry, and `canUndo` and `canRedo` are functions (signals), not getters.

## Storage-backed state

Persist a value to `localStorage`, falling back to memory where storage throws — private windows, blocked cookies, a full quota, server rendering.

```js
/**
 * @template T
 * @param    {string} key
 * @param    {T}      initial
 * @returns  {{ get(): T, set(value: T): void }}
 */
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
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {}
    },
  }
}
```

The in-memory copy is the source of truth for this page; storage is a best-effort mirror. Use it for preferences, not for data that must not be lost.

## Cross-tab sync

`BroadcastChannel` is an [event bus](behavioral/event-bus.md) across tabs of the same origin. A channel object does not receive its own messages; every other `BroadcastChannel` open on the same name does — in other tabs, and in this one.

```js
/**
 * @param   {string}              name
 * @param   {(data: any) => void} onMessage
 * @returns {{ post(data: any): void, dispose(): void }}
 */
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
