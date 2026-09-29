# Factory

A function that decides what to create and returns it, so callers ask for a thing by intent and never name the concrete kind.

## Use when

- What to build is decided at runtime — from a `type` field, a config value, the environment.
- Creation needs setup callers should not repeat: defaults, wiring, validation.
- Related objects must come as a matching family — a light theme's colours, icons and charts together, never mixed with the dark theme's.
- Private state is wanted without a class: the factory's closure holds it.

## Not when

- There is one kind and a literal or a direct call builds it. `{ id, title }` needs no `createPage`.
- The "factory" only calls `new` with the same arguments. It adds a name and nothing else.

## Shape

The default way to make an object in this codebase is a `createX` function returning an object of functions; its closure is the private state.

```js
/** @param {{ start?: number }} [options] */
export function createCounter({ start = 0 } = {}) {
  let count = start
  return {
    increment: () => ++count,
    get value() { return count },
  }
}
```

Choosing the kind at runtime — a registry keyed by type, which fails loudly on an unknown one:

```js
/** @type {Record<string, (props: any) => HTMLElement>} */
const blocks = {
  heading: ({ text, level }) => Object.assign(document.createElement(`h${level}`), { textContent: text }),
  image: ({ src, alt }) => Object.assign(document.createElement('img'), { src, alt }),
}

export function createBlock(node) {
  const make = blocks[node.type]
  if (!make) throw new Error(`Unknown block type: ${node.type}`)
  return make(node.props)
}
```

A family — the abstract-factory form — is one object holding matching creators:

```js
export const themes = {
  light: { icon: name => lightIcons[name], chart: data => createChart(data, lightPalette) },
  dark: { icon: name => darkIcons[name], chart: data => createChart(data, darkPalette) },
}

const ui = themes[preference]
```

## Keep in mind

- Name factories `createX`. A reader then knows it returns a new thing each call.
- Throw on an unknown kind. A factory that returns `undefined` moves the failure somewhere harder to find.

## Pairs with

- [Builder](builder.md) — when creation takes many steps or options.
- [Prototype](prototype.md) — create by copying a configured instance.
- [Strategy](../behavioral/strategy.md) — factories often pick which strategy to return.
- [Singleton](singleton.md) — call a factory once at the composition root instead.
