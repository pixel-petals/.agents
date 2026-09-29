# Mediator

One object owns how a group of components coordinate, so each component talks to the mediator instead of to its peers.

## Use when

- Components call each other directly and a change to one ripples through the rest.
- The coordination rules — "when the list selection changes, load the detail and enable the delete button" — are scattered across every participant.
- A component should be reusable in another screen, but its peer references tie it to this one.

## Not when

- Two components talk. A direct call or a callback is clearer.
- The participants only need to hear about something, with no rules deciding what happens next. Use an [event bus](event-bus.md).
- The mediator would just forward every call unchanged. It adds a hop and no decision.

## Shape

Participants report what happened; the mediator decides what follows.

```js
/**
 * @param {{ list: ListView, detail: DetailView, toolbar: Toolbar }} parts
 */
export function createEditorMediator({ list, detail, toolbar }) {
  function notify(event, payload) {
    switch (event) {
      case 'item-selected':
        detail.show(payload.id)
        toolbar.setEnabled('delete', true)
        break
      case 'item-deleted':
        detail.clear()
        toolbar.setEnabled('delete', false)
        list.refresh()
        break
    }
  }

  list.onSelect = id => notify('item-selected', { id })
  toolbar.onDelete = () => list.removeSelected().then(() => notify('item-deleted'))

  return { notify }
}
```

The list does not know the detail view exists. Swap the detail view and only the mediator changes.

## Watch for

- **The god object.** A mediator that grows every rule in the app is the tangle moved into one file. Keep one per screen or feature.

## Pairs with

- [Event bus](event-bus.md) — the transport; the mediator adds the rules.
- [Facade](../structural/facade.md) — a facade simplifies calls into a subsystem; a mediator coordinates peers that do not know each other.
- [Command](command.md) — mediator rules often end by running a command.
