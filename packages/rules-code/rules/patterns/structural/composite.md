# Composite

A tree where a single node and a group of nodes share one interface, so code treats a leaf and a whole subtree the same way.

## Use when

- The data is a tree — a document of blocks, a menu of submenus, a file system, a scene graph.
- Operations should apply equally to one item or to a group: move, delete, render, measure.
- Groups nest to any depth.

## Not when

- The structure is flat. A list is a list.
- Leaves and groups need very different operations. Forcing one interface leaves half the methods meaningless on each side.

## Shape

In JavaScript the shared interface is usually a data shape plus functions that recurse, rather than a class per node kind.

```js
/**
 * @typedef {object} Node
 * @property {string} type
 * @property {Node[]} [children]   present on groups, absent on leaves
 */

/** @param {Node} node @returns {number} */
export const countNodes = node =>
  1 + (node.children ?? []).reduce((sum, child) => sum + countNodes(child), 0)

/** A document is a list of top-level nodes; count across it. */
export const countDocument = nodes => nodes.reduce((sum, node) => sum + countNodes(node), 0)
```

A composite of behaviour, not data — a group of commands that runs as one:

```js
export const group = (...items) => ({
  run: () => items.forEach(item => item.run()),
})

group(save, group(closePanel, clearSelection)).run()
```

## Keep in mind

- Leaves carry no `children`, or an empty array — pick one and keep to it; mixing `undefined` and `[]` makes every walker check both.
- Deep trees and recursion: past a few thousand levels, use an explicit stack.
- Keep parent references out of the data unless needed. They make cloning and serialising harder.

## Pairs with

- [Visitor](../behavioral/visitor.md) — many operations over the tree.
- [Iterator](../behavioral/iterator.md) — flatten the tree for a loop.
- [Command](../behavioral/command.md#macro) — a macro is a composite command.
- [Flyweight](flyweight.md) — share the immutable parts of many similar nodes.
- [Prototype](../creational/prototype.md) — clone a subtree.
