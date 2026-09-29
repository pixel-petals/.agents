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

Following solid-primitives' `state-machine`: each state is a function that receives its input and a `to` transitioner and returns the state's value. Allowed transitions are declared beside it.

```js
/**
 * @typedef {'idle' | 'loading' | 'loaded' | 'failed'} Status
 */

const states = {
  idle: { to: ['loading'], value: () => ({ busy: false }) },

  loading: {
    to: ['loaded', 'failed'],
    value: (url, to) => {
      fetch(url).then(r => r.json()).then(to.loaded, to.failed)
      return { busy: true }
    },
  },

  loaded: { to: ['loading'], value: data => ({ busy: false, data }) },
  failed: { to: ['loading'], value: error => ({ busy: false, error }) },
}

export function createMachine(definition, initial) {
  let name = initial
  let value = enter(initial)

  function enter(next, input) {
    const allowed = Object.fromEntries(definition[next].to.map(target => [target, arg => transition(target, arg)]))
    return definition[next].value(input, allowed)
  }

  function transition(next, input) {
    if (!definition[name].to.includes(next)) throw new Error(`${name} → ${next} is not allowed`)
    name = next
    value = enter(next, input)
  }

  return {
    get state() { return name },
    get value() { return value },
    to: new Proxy({}, { get: (_, next) => input => transition(next, input) }),
  }
}

const request = createMachine(states, 'idle')
request.to.loading('/api/pages')
```

An illegal transition throws where it happens, rather than surfacing later as an impossible combination of flags.

A lighter form is a discriminated union — `{ status: 'failed', error }` — with a `switch` in one function. Move to the machine when the switch is copied.

## Pairs with

- [Strategy](strategy.md) — each state is a strategy; the difference is that states choose the next one.
- [Proxy](../structural/proxy.md) — the `to` object above is one.
- [Command](command.md) — `canRun` often reads the current state.
