# State

Behaviour that depends on a mode lives in one place per mode, and moving between modes goes through declared transitions.

## Use when

- The same `if (status === …)` switch appears in several functions.
- Some transitions are illegal — a request cannot go from `idle` to `done` — and nothing currently stops them.
- Each mode carries its own data: `error` has a message, `loaded` has a result, `loading` has neither.

## Not when

- There are two states. A boolean is a state machine; `isOpen` needs no framework.
- The modes share almost all behaviour and differ in one value. A lookup table is enough.

## Shape

Adapted from solid-primitives' `state-machine`. There, `createMachine({ initial, states })` takes each state as a function `(input, to) => value`, exposes `.type`, `.value` and `.to`, and checks transitions only in the types. Here each state is an object that also declares where it may go next, and the machine checks every transition at runtime.

```js
/**
 * @typedef {'idle' | 'loading' | 'loaded' | 'failed'} Status
 *
 * @typedef {object} State
 * @property {Status[]}                                                    to     the states it may move to
 * @property {(input: any, to: Record<string, (input?: any) => void>) => any} value
 */

/** @type {Record<Status, State>} */
const states = {
  idle: { to: [ 'loading' ], value: () => ({ busy: false }) },

  loading: {
    to: [ 'loaded', 'failed' ],
    value: (url, to) => {
      fetch(url).then(r => r.json()).then(to.loaded, to.failed)

      return { busy: true }
    },
  },

  loaded: { to: [ 'loading' ], value: data => ({ busy: false, data }) },
  failed: { to: [ 'loading' ], value: error => ({ busy: false, error }) },
}

/**
 * @param   {{ initial: string, states: Record<string, State> }} definition
 * @returns {{ readonly type: string, readonly value: any, to: Record<string, (input?: any) => void> }}
 */
export function createMachine({ initial, states }) {
  let type = initial
  let value

  function enter(next, input) {
    const allowed = Object.fromEntries(states[ next ].to.map(target => [ target, arg => transition(target, arg) ]))

    return states[ next ].value(input, allowed)
  }

  function transition(next, input) {
    if (!states[ type ].to.includes(next)) throw new Error(`${ type } → ${ next } is not allowed`)
    type = next
    value = enter(next, input)
  }

  const to = Object.fromEntries(Object.keys(states).map(next => [ next, input => transition(next, input) ]))
  value = enter(initial)

  return {
    get type() { return type },
    get value() { return value },
    to,
  }
}

const request = createMachine({ initial: 'idle', states })
request.to.loading('/api/pages')
```

An illegal transition throws where it happens, rather than surfacing later as an impossible combination of flags.

A lighter form is a discriminated union — `{ status: 'failed', error }` — with a `switch` in one function. Move to the machine when the switch is copied.

## Pairs with

- [Strategy](strategy.md) — each state is a strategy; the difference is that states choose the next one.
- [Command](command.md) — `canRun` often reads the current state.
