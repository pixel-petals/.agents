# Template method

A procedure with a fixed skeleton and a few steps left open, supplied by the caller as hooks.

## Use when

- Several procedures copy the same outline — open, validate, transform, write, report — and differ in one or two steps.
- The order of steps must be enforced; callers should not be able to skip validation.
- A library needs extension points without handing over the whole flow.

## Not when

- The procedures differ in most steps. Write them separately; a skeleton with ten hooks is a harder read than two functions.
- Only one step ever varies. Pass that one function — it is a [strategy](strategy.md).

## Shape

The textbook uses an abstract base class. The functional form takes the hooks as an object, with defaults for the optional ones.

```js
/**
 * @template T
 * @typedef {object} ImportHooks
 * @property {(raw: string) => T[]} parse
 * @property {(row: T) => string | null} [validate]  returns an error, or null
 * @property {(rows: T[]) => Promise<void>} save
 */

/** @template T @param {ImportHooks<T>} hooks */
export function createImporter({ parse, validate = () => null, save }) {
  return async function importFile(file) {
    const rows = parse(await file.text())

    const errors = rows.map(validate).filter(Boolean)
    if (errors.length) return { ok: false, errors }

    await save(rows)
    return { ok: true, count: rows.length }
  }
}

export const importCsv = createImporter({ parse: parseCsv, save: saveEntries })
export const importJson = createImporter({ parse: JSON.parse, validate: checkSlug, save: saveEntries })
```

Reading, the error path and the return shape are written once; each importer supplies only what differs.

## Keep in mind

- Keep hooks few and named for what they decide. If a hook needs to know where in the skeleton it is, the skeleton is wrong.
- Lifecycle callbacks — `connectedCallback`, `beforeEach` — are template methods owned by a framework.

## Pairs with

- [Strategy](strategy.md) — replaces the whole algorithm; a template replaces steps.
- [Factory](../creational/factory.md) — `createImporter` is one.
- [Chain of responsibility](chain-of-responsibility.md) — when the steps themselves should be configurable.
