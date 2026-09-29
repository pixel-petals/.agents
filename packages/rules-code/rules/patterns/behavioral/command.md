# Command

An action as data: an object with an id and a `run`, dispatched through one function, so every trigger for it — and undo, redo, logging, replay — goes through the same path.

## Use when

- The same action starts from more than one place: a toolbar button, a keyboard shortcut, a context menu, a drag, a command palette.
- The user expects undo and redo.
- Actions must be queued, deferred, retried, logged, or replayed.
- Menus and toolbars should be rendered from data, with disabled state derived rather than hand-kept in sync.
- Several actions should run as one step that undoes as one step.

## Not when

- An action has one trigger and no undo. A plain function call is the command.
- The "command" only forwards to a single function with the same arguments. That is a rename, not a pattern — see [YAGNI](../../principles/YAGNI.md).

## Roles

| Role | What it is | In a UI |
| --- | --- | --- |
| Sender (invoker) | Starts the command; knows only its id | Button, key binding, menu item, drag handler, palette |
| Command | The request: id, label, `run`, optional `undo` and `canRun` | An entry in the registry |
| Receiver | Owns the state and does the work | The document model, a store, a service |
| Client | Creates commands and wires them to receivers | The module that builds the registry at startup |

Senders never call the receiver. A button, a key and a menu item all dispatch `'page.delete'`, so they cannot drift apart.

## Keep the receiver's logic out of the command

A command delegates. It gathers what the receiver needs, calls it, and keeps what undo needs — nothing more. If the command body grows the business rule itself, the rule is no longer reachable without the command, and two commands will soon disagree about it.

## Shape

A registry of plain objects and one dispatcher.

```js
/**
 * @typedef {object} Command
 * @property {string} id
 * @property {string} label
 * @property {(args?: any) => any} run      returns what `undo` needs, if anything
 * @property {(memo: any) => void} [undo]
 * @property {(args?: any) => boolean} [canRun]
 */

/** @param {Command[]} commands */
export function createCommands(commands) {
  const registry = new Map(commands.map(command => [command.id, command]))

  /** @type {{ command: Command, memo: any }[]} */
  const undoStack = []
  /** @type {{ command: Command, memo: any, args: any }[]} */
  const redoStack = []

  /** The single entry point every sender calls. */
  function runCommand(id, args) {
    const command = registry.get(id)
    if (!command) throw new Error(`Unknown command: ${id}`)
    if (command.canRun && !command.canRun(args)) return false

    const memo = command.run(args)
    if (command.undo) undoStack.push({ command, memo, args })
    redoStack.length = 0
    return true
  }

  function undo() {
    const entry = undoStack.pop()
    if (!entry) return

    entry.command.undo(entry.memo)
    redoStack.push(entry)
  }

  function redo() {
    const entry = redoStack.pop()
    if (!entry) return

    entry.memo = entry.command.run(entry.args)
    undoStack.push(entry)
  }

  return { registry, runCommand, undo, redo }
}
```

A command that delegates to its receiver:

```js
/** @param {DocumentModel} doc */
export const deleteBlock = doc => ({
  id: 'block.delete',
  label: 'Delete block',
  canRun: () => doc.selection() != null,
  run: () => {
    const id = doc.selection()
    return { index: doc.indexOf(id), block: doc.remove(id) }
  },
  undo: ({ index, block }) => doc.insert(block, index),
})
```

Senders share the id:

```js
button.addEventListener('click', () => runCommand('block.delete'))
keymap.set('Delete', 'block.delete')
menu.items.push({ command: 'block.delete' })
```

## Menus and toolbars from command data

Render menu items and toolbar buttons from the registry: `label` is the text, `canRun()` is the disabled state, and the key binding is looked up by id. Adding a command adds it everywhere it is listed; a disabled state can no longer disagree with what `runCommand` would do, because both ask `canRun`.

## Undo by inverse or by snapshot

| | Inverse operation | Snapshot ([memento](memento.md)) |
| --- | --- | --- |
| `run` keeps | Just enough to reverse it (index, removed block) | The receiver's state before the change |
| Memory | Small | Grows with state size |
| Risk | The inverse must be exactly right | Restoring may discard unrelated concurrent changes |
| Best for | Large documents, fine-grained edits | Small state, complex edits with no easy inverse |

Mixing both is fine: a command returns whatever its `undo` needs.

## Macro

A macro is a command built from commands ([composite](../structural/composite.md)). It runs its children in order and undoes them in reverse, so the user sees one step.

```js
/** @param {string} id @param {string} label @param {Command[]} steps */
export const macro = (id, label, steps) => ({
  id,
  label,
  canRun: args => steps.every(step => !step.canRun || step.canRun(args)),
  run: args => steps.map(step => step.run(args)),
  undo: memos => steps.map((step, i) => [step, memos[i]]).reverse()
    .forEach(([step, memo]) => step.undo?.(memo)),
})
```

## Queueing, logging and replay

Because a command is an id plus arguments, the dispatch is serialisable. Record `{ id, args }` inside `runCommand` and you have an audit log, a queue to flush when back online, a macro recorder, or a script that reproduces a bug. Replay needs commands that depend only on their arguments and receiver state — not on the clock or the selection at recording time, unless those are captured in `args`.

## Pairs with

- [Memento](memento.md) — snapshot-based undo.
- [Composite](../structural/composite.md) — macros.
- [Event bus](event-bus.md) — a command is a request (`save-page`); the event it causes is a fact (`page-saved`).
- [Chain of responsibility](chain-of-responsibility.md) — middleware around `runCommand` for logging, permission checks or confirmation.
- [Undo history](../primitives.md#undo-history-from-sources) — a lighter shape when undo is needed without a command registry.
