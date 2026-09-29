# Iterator

Walk a collection one item at a time without the caller knowing how it is stored. In JavaScript: a generator, consumed with `for…of`.

## Use when

- A tree, graph or paged API should be walked with a plain loop.
- The walk can stop early, so building a full array first wastes work.
- The sequence is large, lazy or infinite — pages from an API, lines from a stream.
- Several walk orders exist over one structure (depth-first, breadth-first, visible-only).

## Not when

- The data is already an array and the caller wants an array. Use array methods.
- A single `map` or `filter` expresses it.

## Shape

```js
/**
 * @param   {Node} node
 * @returns {Generator<Node>}
 */
export function* walk(node) {
  yield node
  for (const child of node.children ?? []) yield* walk(child)
}

for (const node of walk(doc)) {
  if (node.type === 'image') images.push(node)
}
```

Async sources use an async generator:

```js
/**
 * @param   {{ list(query: { cursor?: string }): Promise<{ items: Entry[], next?: string }> }} api
 * @returns {AsyncGenerator<Entry>}
 */
export async function* entries(api) {
  let cursor
  do {
    const page = await api.list({ cursor })
    yield* page.items
    cursor = page.next
  } while (cursor)
}

for await (const entry of entries(api)) {
  if (entry.slug === wanted) break // later pages are never fetched
}
```

## Keep in mind

- A generator runs lazily. Side effects inside it happen when the consumer pulls, not when it is called.
- Iterator helpers (`.filter`, `.map`, `.take`) exist on sync iterators, generators included, and stay lazy. Async generators do not have them; loop with `for await` instead.
- Mutating the collection during a walk is undefined behaviour in practice. Collect first, then mutate.

## Pairs with

- [Composite](../structural/composite.md) — iterators flatten trees for a loop.
- [Visitor](visitor.md) — iterate to reach each node, visit to act on its type.
