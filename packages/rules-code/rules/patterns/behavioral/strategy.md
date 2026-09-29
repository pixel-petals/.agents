# Strategy

One job, several interchangeable ways to do it, each behind the same function signature and chosen by the caller.

## Use when

- A function has an `if`/`switch` that picks between whole algorithms — sort orders, pricing rules, export formats, image resizers.
- The choice is made at runtime or by configuration.
- A new variant should be addable without editing the code that uses it.

## Not when

- There is one algorithm and a hypothetical second. Wait for the second ([YAGNI](../../principles/YAGNI.md)).
- The variants differ by a parameter, not by logic. Pass the parameter.

## Shape

In JavaScript a strategy is a function. A record of them is the whole pattern.

```js
/** @typedef {(a: Page, b: Page) => number} SortStrategy */

/** @type {Record<string, SortStrategy>} */
export const sortBy = {
  title: (a, b) => a.title.localeCompare(b.title),
  updated: (a, b) => b.updatedAt - a.updatedAt,
  manual: (a, b) => a.order - b.order,
}

/** @param {Page[]} pages @param {SortStrategy} strategy */
export const sortPages = (pages, strategy) => [...pages].sort(strategy)

sortPages(pages, sortBy[settings.sort] ?? sortBy.title)
```

The caller picks; `sortPages` does not know how many strategies exist.

## Keep in mind

- All strategies take the same arguments and return the same shape. A strategy that needs extra context gets it through a closure when it is created, not through a special-case argument.
- Name the record for the job (`sortBy`, `exporters`), not `strategies`.

## Pairs with

- [State](state.md) — the same shape, but states pick their successor.
- [Template method](template-method.md) — swap one step of a procedure instead of the whole of it.
- [Factory](../creational/factory.md) — chooses which strategy to build from configuration.
- [Bridge](../structural/bridge.md) — a strategy held long-term as one side of a bridge.
