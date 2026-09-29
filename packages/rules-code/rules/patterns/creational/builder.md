# Builder

Assemble an object in named steps, then produce it with a final call, instead of passing a long argument list or a half-valid object around.

## Use when

- An object has many optional parts, and most callers set only a few.
- Construction happens in stages, possibly across functions, and the result must not be used until it is complete.
- The same steps should produce different outputs — a query builder that emits SQL or a URL.

## Not when

- An options object with defaults says it. `createClient({ retries: 3 })` is already readable; a builder would add a method per key.
- All parts are required. Pass them.

## Shape

In JavaScript an options object with defaults covers most cases. Reach for a builder when steps are conditional, repeatable, or spread across code.

```js
export function queryBuilder(table) {
  const wheres = []
  const params = []
  let order = ''
  let max = null

  const builder = {
    where(column, value) {
      wheres.push(`${column} = ?`)
      params.push(value)
      return builder
    },
    orderBy(column, direction = 'asc') {
      order = ` ORDER BY ${column} ${direction.toUpperCase()}`
      return builder
    },
    limit(count) {
      max = count
      return builder
    },
    build() {
      const where = wheres.length ? ` WHERE ${wheres.join(' AND ')}` : ''
      const limit = max == null ? '' : ` LIMIT ${max}`
      return { sql: `SELECT * FROM ${table}${where}${order}${limit}`, params }
    },
  }
  return builder
}

const query = queryBuilder('pages').where('status', 'published')
if (locale) query.where('locale', locale)
const { sql, params } = query.orderBy('updated_at', 'desc').limit(20).build()
```

Conditional steps read as plain `if`s, and nothing sees the query before `build()`.

## Keep in mind

- `build()` validates. A builder that returns something invalid has only moved the problem.
- Decide whether a builder is reusable after `build()`. If not, say so or make later calls throw.

## Pairs with

- [Factory](factory.md) — one call; a builder is many.
- [Composite](../structural/composite.md) — builders often assemble trees.
- [Prototype](prototype.md) — start a builder from a copied template.
