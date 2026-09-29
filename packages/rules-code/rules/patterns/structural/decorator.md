# Decorator

Wrap a function or object to add behaviour around it — logging, caching, retries, timing — while keeping the same interface, so the wrapped and unwrapped versions are interchangeable.

## Use when

- A concern cuts across many functions and does not belong inside any of them.
- The extra behaviour should be optional or combinable: cached, or retried, or both.
- The original cannot be edited — library code, generated code.

## Not when

- Only one function needs it, once. Put the line inside the function.
- Several wrappers stack so deep that a stack trace no longer shows where the work happens. Reconsider the design.

## Shape

A higher-order function: takes a function, returns one with the same signature.

```js
/**
 * @template {(...args: any[]) => Promise<any>} F
 * @param {F} fn
 * @param {{ attempts?: number, delay?: number }} [options]
 * @returns {F}
 */
export function withRetry(fn, { attempts = 3, delay = 200 } = {}) {
  return /** @type {F} */ (async (...args) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn(...args)
      } catch (error) {
        if (attempt >= attempts) throw error
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
  })
}

/** @template {(key: string) => any} F @param {F} fn @returns {F} */
export function memoize(fn) {
  const cache = new Map()
  return /** @type {F} */ (key => {
    if (!cache.has(key)) cache.set(key, fn(key))
    return cache.get(key)
  })
}

export const fetchPage = memoize(withRetry(fetchPageFromCms))
```

Each wrapper is testable alone and the composition reads right to left.

## Keep in mind

- Preserve the contract: same arguments, same return type, same errors (or a documented subset).
- Name wrappers `withX` so the added behaviour is visible at the call site.
- Order matters. `memoize(withRetry(fn))` caches the retried result; `withRetry(memoize(fn))` caches the first rejected promise, so every retry — and every later call — gets the same failure.

## Pairs with

- [Proxy](proxy.md) — same shape; a proxy controls access, a decorator adds behaviour.
- [Chain of responsibility](../behavioral/chain-of-responsibility.md) — a configurable list of decorators.
- [Adapter](adapter.md) — changes the interface instead of keeping it.
- [Primitives](../primitives.md#debounce-and-throttle) — debounce and throttle are decorators.
