# Visitor

Many operations over a fixed set of node types, each operation written as one object with a handler per type, instead of spreading every operation across every node.

## Use when

- A tree of typed nodes — a document, an AST, a block list — needs several unrelated passes: render, count, validate, collect media ids, export.
- New operations arrive more often than new node types.
- The operation should live in one file, not as a method on every node type.

## Not when

- The node types change often. Every new type means updating every visitor.
- There is one operation. Write a recursive function with a `switch`.

## Shape

In JavaScript, double dispatch collapses to a lookup on the node's `type`.

```js
/**
 * @template R
 * @typedef {{ [type: string]: (node: Node, visit: (node: Node) => R) => R }} Visitor
 */

/**
 * @template R
 * @param    {Visitor<R>} visitor
 * @param    {R}          [fallback]
 * @returns  {(node: Node) => R}
 */
export function createVisit(visitor, fallback) {
  const visit = node => {
    // Own keys only, so a node typed `constructor` or `toString` is not "handled" by the prototype.
    const handler = Object.hasOwn(visitor, node.type) ? visitor[ node.type ] : undefined
    if (!handler && fallback === undefined) throw new Error(`No handler for ${ node.type }`)

    return handler ? handler(node, visit) : fallback
  }

  return visit
}

const countWords = createVisit({
  text: node => node.value.split(/\s+/).filter(Boolean).length,
  group: (node, visit) => node.children.reduce((sum, child) => sum + visit(child), 0),
  image: () => 0,
})

countWords(doc)
```

Each visitor chooses whether and how to recurse, so a pass can skip subtrees or change the traversal order.

## Keep in mind

- Throw on an unknown type unless a fallback is deliberate. A silent skip hides a node type that was added and never handled.
- Keep visitors pure where possible — return a value rather than mutating a shared accumulator.

## Pairs with

- [Composite](../structural/composite.md) — the tree a visitor walks.
- [Iterator](iterator.md) — when every node gets the same treatment and only reaching them matters.
- [Strategy](strategy.md) — a visitor is a record of strategies keyed by node type.
