# Chain of responsibility

A request passes through an ordered list of handlers; each can handle it, change it and pass it on, or stop it. In JavaScript this is middleware.

## Use when

- A request needs several independent checks or transforms — auth, validation, logging, caching — before or around the real work.
- Which steps run should be configurable per route, per command or per environment.
- Several handlers might answer, and the first that can should win — key bindings resolved from the focused element up to the document.

## Not when

- The steps are fixed and always run in the same order. Call them in sequence.
- There is one handler. A chain of one is a function call.

## Shape

Each handler receives the context and a `next` to continue. Not calling `next` stops the chain.

```js
/**
 * @template C
 * @typedef {(context: C, next: () => Promise<any>) => Promise<any>} Handler
 */

/** @template C @param {Handler<C>[]} handlers */
export function chain(handlers) {
  return context => {
    const run = index => {
      const handler = handlers[index]
      return handler ? handler(context, () => run(index + 1)) : Promise.resolve()
    }
    return run(0)
  }
}

const requireAuth = async (ctx, next) => {
  if (!ctx.user) return new Response('Unauthorised', { status: 401 })
  return next()
}

const timed = async (ctx, next) => {
  const start = performance.now()
  const result = await next()
  console.debug(ctx.url, performance.now() - start)
  return result
}

const handle = chain([timed, requireAuth, ctx => renderPage(ctx)])
```

Code after `await next()` runs on the way back out, so one handler can wrap the rest.

## Keep in mind

- Order is part of the contract. Build the list in one place where it can be read top to bottom.
- A request that no handler takes should fail loudly, not vanish.

## Pairs with

- [Decorator](../structural/decorator.md) — a chain is a list of decorators applied in order.
- [Command](command.md) — middleware around `runCommand` for permission checks, logging or confirmation.
- [Composite](../structural/composite.md) — DOM event bubbling is a chain along a composite tree.
