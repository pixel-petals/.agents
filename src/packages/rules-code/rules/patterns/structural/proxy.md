# Proxy

A stand-in with the same interface as the real object, which controls access to it — deferring creation, checking permission, or forwarding to something remote.

## Use when

- The real object is expensive to create and often not needed: load it on first use.
- Access should be checked or recorded without the caller or the real object knowing.
- The real object lives elsewhere — a worker, an iframe, a server — and callers should use it as if it were local.
- Reads or writes should be observed, as reactive stores do.

## Not when

- Nothing about access needs controlling. Use the object.
- The behaviour being added is not about access — logging, retries, memoising results. That is a [decorator](decorator.md). Memoising a function's results is a decorator; standing in for an object and guarding access to it is a proxy.

## Shape

A lazy proxy — the real module loads the first time any method is called:

```js
/**
 * @template T
 * @typedef {{ [ K in keyof T ]: T[ K ] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never }} Async
 */

/**
 * @template T
 * @param    {() => Promise<T>} load
 * @returns  {Async<T>}  T with its methods made async
 */
export function lazy(load) {
  let loading

  return /** @type {Async<T>} */ (new Proxy({}, {
    get: (_, key) => {
      // Not a thenable, so `await` on the proxy itself does not try to call `then`.
      if (key === 'then') return undefined

      return async (...args) => (await real())[ key ](...args)
    },
  }))

  // a failed load is forgotten, so the next call tries again rather than failing forever
  function real() {
    loading ??= load().catch((error) => {
      loading = undefined
      throw error
    })

    return loading
  }
}

const editor = lazy(() => import('./editor.js').then(m => m.createEditor()))
await editor.open(pageId) // editor.js is fetched here, not at startup
```

The promise is cached, not the result, so calls made while the module is still loading share one load. A load that fails is dropped, as `memoize` drops a rejection.

A write-observing proxy, the core of many reactive stores:

```js
/**
 * @template {object} T
 * @param    {T}                                                   target
 * @param    {(key: PropertyKey, value: any, previous: any) => void} onChange
 * @returns  {T}
 */
export function observable(target, onChange) {
  return new Proxy(target, {
    set(object, key, value) {
      const previous = object[ key ]
      object[ key ] = value
      if (previous !== value) onChange(key, value, previous)

      return true
    },
  })
}
```

A proxy need not use `Proxy`. An object with the same methods that forwards to the real one is the same pattern and easier to type.

## Keep in mind

- `Proxy` traps are invisible at the call site. Name the factory for what it does (`lazy`, `observable`, `readonly`).
- Identity changes: `proxy !== target`, and private `#fields` on the target throw when accessed through a `Proxy`.

## Pairs with

- [Decorator](decorator.md) — same shape, different purpose.
- [Adapter](adapter.md) — changes the interface; a proxy keeps it.
- [Flyweight](flyweight.md) — a lazy proxy can hand out flyweights from a shared pool.
