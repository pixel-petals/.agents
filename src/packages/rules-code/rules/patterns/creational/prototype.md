# Prototype

Make a new object by copying a configured one, rather than rebuilding it from scratch.

## Use when

- An object takes real work to configure and many near-copies are needed — block presets, page templates, default settings.
- The caller has an object but not the knowledge of how it was built — duplicate the selected block.
- Variants are defined by example: "like this one, but red".

## Not when

- Building from scratch is one literal. Write the literal.
- The object holds live resources — listeners, sockets, timers. Copying those gives two owners of one resource.

## Shape

Plain data copies with `structuredClone` (deep) or spread (shallow). Give new copies new identities.

```js
/**
 * @template {{ id: string }} T
 * @param    {T}          source
 * @param    {Partial<T>} [overrides]
 * @returns  {T}
 */
export function duplicate(source, overrides = {}) {
  const copy = structuredClone(source)
  reassignIds(copy)

  return { ...copy, ...overrides }
}

function reassignIds(node) {
  node.id = crypto.randomUUID()
  node.children?.forEach(reassignIds)
}

const heroPreset = { id: 'preset', type: 'hero', props: { align: 'center', overlay: 0.4 } }
const hero = duplicate(heroPreset, { props: { ...heroPreset.props, overlay: 0.6 } })
```

The preset is a leaf, so it carries no `children` — see [composite](../structural/composite.md).

An object that is more than data — with closures or private state — owns its copy logic:

```js
/**
 * @param   {string[]} [ids]
 * @returns {{ has(id: string): boolean, add(id: string): void, clone(): ReturnType<typeof createSelection> }}
 */
export function createSelection(ids = []) {
  const selected = new Set(ids)

  return {
    has: id => selected.has(id),
    add: id => {
      selected.add(id)
    },
    clone: () => createSelection([ ...selected ]),
  }
}
```

## Keep in mind

- Shallow copies share nested objects. Spread is only safe when the nested parts are never mutated.
- `structuredClone` throws on functions, DOM nodes and symbols, and drops class prototypes — a class instance comes back as a plain object. Use it for data.
- Copying an id is almost always a bug. Decide what identity the copy gets.

## Pairs with

- [Memento](../behavioral/memento.md) — also copies state, to go back rather than forward.
- [Factory](factory.md) — a factory can create by cloning a registered prototype.
- [Composite](../structural/composite.md) — duplicating a subtree is a deep clone.
