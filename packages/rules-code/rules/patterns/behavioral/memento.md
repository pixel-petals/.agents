# Memento

A snapshot of an object's state, taken by the object itself and handed back later to restore it exactly — without the caller reading or depending on what is inside.

## Use when

- An edit must be undone and there is no simple inverse operation.
- A dialog or form needs "cancel" that puts everything back.
- A multi-step operation must roll back if a later step fails.

## Not when

- The inverse is cheap and exact — reinsert the removed block at its index. Record that instead; see [command](command.md#undo-by-inverse-or-by-snapshot).
- The state is large and changes often. Snapshots per keystroke will cost more memory than the feature is worth; snapshot at coarser boundaries or store diffs.

## Shape

The owner produces and consumes the snapshot. Callers hold it but do not look inside.

```js
/** @returns {{ type(input: string): void, snapshot(): object, restore(memento: object): void }} */
export function createEditor() {
  let text = ''
  let cursor = 0

  return {
    type(input) {
      text = text.slice(0, cursor) + input + text.slice(cursor)
      cursor += input.length
    },

    /** Opaque to callers — only `restore` reads it. */
    snapshot: () => Object.freeze({ text, cursor }),

    restore(memento) {
      ({ text, cursor } = memento)
    },
  }
}

const editor = createEditor()
const before = editor.snapshot()
editor.type('hello')
editor.restore(before)
```

`structuredClone(state)` makes a deep snapshot of plain data in one call. Frozen or immutable state can be kept by reference — the cheapest snapshot is the one you do not copy.

## Keep in mind

- Snapshot at the boundary the user thinks in — one per command, not one per property write.
- Cap the history. An unbounded undo stack is a slow leak.
- Restoring a snapshot overwrites everything in it, including changes made since by someone else. With shared or concurrent state, prefer inverse operations.

## Pairs with

- [Command](command.md) — the command takes the snapshot in `run` and restores it in `undo`.
- [Prototype](../creational/prototype.md) — both copy state; a memento is for going back, a prototype for going forward.
- [Undo history](../primitives.md#undo-history-from-sources) — each source records an `{ undo, redo }` entry; its `undo` closure holds the value from before the change, which is a memento in closure form.
