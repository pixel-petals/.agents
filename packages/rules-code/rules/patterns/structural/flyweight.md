# Flyweight

Share the immutable part of many similar objects, and keep only what differs on each one.

## Use when

- Tens of thousands of objects repeat the same heavy data — glyph metrics, sprite images, style objects, parsed icons.
- Memory or garbage-collection time is a measured problem.
- The shared part never changes after creation.

## Not when

- The count is in the hundreds. The saving will not show up in a profile.
- The "shared" part is mutated per object. Sharing mutable state is a bug factory.
- Nothing has been measured. Optimise after a profile, not before ([YAGNI](../../principles/YAGNI.md)).

## Shape

A cache keyed by the intrinsic state, handing out frozen shared objects. Each instance keeps a reference plus its own extrinsic state.

```js
/** @type {Map<string, Readonly<Style>>} */
const styles = new Map()

/** Returns the one shared instance for this combination. */
export function style(font, size, colour) {
  const key = `${font}|${size}|${colour}`
  if (!styles.has(key)) styles.set(key, Object.freeze({ font, size, colour, metrics: measure(font, size) }))
  return styles.get(key)
}

/** Each character: its own position and code, a shared style. */
export const glyph = (char, x, y, font, size, colour) => ({ char, x, y, style: style(font, size, colour) })
```

A million glyphs in three styles hold three style objects.

## Keep in mind

- Freeze the shared object, so an accidental write fails instead of changing every user.
- An unbounded cache is a leak. If keys are open-ended, cap it or use a `WeakRef` cache.
- Interned strings and `Symbol.for` are flyweights the runtime already provides.

## Pairs with

- [Factory](../creational/factory.md) — the lookup function is a factory that reuses.
- [Composite](composite.md) — trees of many similar nodes are the usual place for flyweights.
- [Proxy](proxy.md) — a caching proxy can hand out flyweights.
