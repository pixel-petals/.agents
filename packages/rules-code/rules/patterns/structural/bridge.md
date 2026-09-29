# Bridge

Split something that varies in two independent directions into two parts, one holding the other, so each direction grows without multiplying the combinations.

## Use when

- Subclassing or file-per-variant is heading for a grid: `PngExportForPages`, `PdfExportForPages`, `PngExportForEntries`, …
- One side is "what" (the abstraction a caller uses) and the other is "how" (a platform, a backend, a renderer), and both have several variants.
- The "how" should be chosen at runtime.

## Not when

- Only one direction varies. That is a [strategy](../behavioral/strategy.md).
- There are two variants in total. Two functions are clearer than two layers.

## Shape

The abstraction takes its implementation as an argument and talks to it through a small interface.

```js
/**
 * @typedef {object} Storage   the "how"
 * @property {(key: string) => Promise<string | null>} read
 * @property {(key: string, value: string) => Promise<void>} write
 */

/** @type {Storage} */
export const localStore = {
  read: async key => localStorage.getItem(key),
  write: async (key, value) => localStorage.setItem(key, value),
}

/** @type {Storage} */
export const remoteStore = {
  read: key => fetch(`/api/kv/${ key }`).then(r => r.ok ? r.text() : null),
  write: (key, value) => fetch(`/api/kv/${ key }`, { method: 'PUT', body: value }).then(() => {}),
}

/**
 * The "what": drafts over any storage.
 *
 * @param   {Storage} storage
 * @returns {{ load(id: string): Promise<any>, save(id: string, draft: any): Promise<void> }}
 */
export const createDrafts = storage => ({
  load: id => storage.read(`draft:${ id }`).then(text => text && JSON.parse(text)),
  save: (id, draft) => storage.write(`draft:${ id }`, JSON.stringify(draft)),
})

/**
 * @param   {Storage} storage
 * @returns {{ get(name: string): Promise<string | null> }}
 */
export const createSettings = storage => ({
  get: name => storage.read(`setting:${ name }`),
})

const drafts = createDrafts(navigator.onLine ? remoteStore : localStore)
```

Two abstractions and two storages give four combinations from four small pieces, not four modules.

## Keep in mind

- Keep the interface between the two sides narrow. Every method added to it must be written for every implementation.

## Pairs with

- [Strategy](../behavioral/strategy.md) — one side of a bridge is often a strategy.
- [Adapter](adapter.md) — used to make an existing library fit the "how" interface.
- [Factory](../creational/factory.md) — picks the implementation to hand in.
