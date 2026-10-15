# Adapter

A thin translation layer that gives an existing API the shape its caller expects, without changing either side.

## Use when

- A third-party library, legacy module or remote API returns data in a shape the rest of the code should not know about.
- Two implementations of one job — two storage backends, two payment providers — must look identical to the caller.
- A dependency may be replaced, and its quirks should be contained in one file.

## Not when

- You own both sides. Change one of them.
- The shapes already match. An adapter that renames nothing is a hop with no purpose.

## Shape

```js
/**
 * @typedef {object} Media
 * @property {string} id
 * @property {string} url
 * @property {number} width
 * @property {number} height
 */

/**
 * Adapts the CMS media record to the shape the site renders.
 *
 * @param   {any} record
 * @returns {Media}
 */
export const fromCmsMedia = record => ({
  id: record.id,
  url: record.file.publicUrl,
  width: record.meta?.dimensions?.[ 0 ] ?? 0,
  height: record.meta?.dimensions?.[ 1 ] ?? 0,
})
```

An adapter over a callback API, giving it the promise shape callers use everywhere else:

```js
/**
 * @param   {string} path
 * @returns {Promise<string>}
 */
export const readFile = path =>
  new Promise((resolve, reject) => legacyFs.read(path, (error, data) => error ? reject(error) : resolve(data)))
```

## Keep in mind

- Adapt at the boundary, once. Data that crosses in the foreign shape spreads that shape through every caller.
- An adapter translates; it does not add behaviour. Memoising, retries or logging belong in a [decorator](decorator.md); controlling access belongs in a [proxy](proxy.md).

## Pairs with

- [Facade](facade.md) — a facade simplifies a subsystem; an adapter reshapes one interface into another.
- [Decorator](decorator.md) — keeps the interface and adds behaviour.
- [Proxy](proxy.md) — keeps the interface and controls access.
- [Bridge](bridge.md) — designed up front; an adapter is fitted after the fact.
