# Proxy

A stand-in with the same interface as the real object, which controls access to it — deferring creation, caching, checking permission, or forwarding to something remote.

## Use when

- The real object is expensive to create and often not needed: load it on first use.
- Access should be checked or recorded without the caller or the real object knowing.
- The real object lives elsewhere — a worker, an iframe, a server — and callers should use it as if it were local.
- Reads or writes should be observed, as reactive stores do.

## Not when

- Nothing about access needs controlling. Use the object.
- The behaviour being added is not about access — logging, retries. That is a [decorator](decorator.md).

## Shape

A lazy proxy — the real module loads the first time any method is called:

```js
/** @template T @param {() => Promise<T>} load @returns {T} */
export function lazy(load) {
  let real
  return new Proxy({}, {
    get: (_, key) => async (...args) => {
      real ??= await load()
      return real[key](...args)
    },
  })
}

const editor = lazy(() => import('./editor.js').then(m => m.createEditor()))
await editor.open(pageId) // editor.js is fetched here, not at startup
```

A write-observing proxy, the core of many reactive stores:

```js
export function observable(target, onChange) {
  return new Proxy(target, {
    set(object, key, value) {
      const previous = object[key]
      object[key] = value
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
- [Flyweight](flyweight.md) — a caching proxy often hands out flyweights.
