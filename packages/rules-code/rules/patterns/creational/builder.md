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
/**
 * @typedef {object} QueryBuilder
 * @property {(column: string, value: unknown) => QueryBuilder}             where
 * @property {(column: string, direction?: 'asc' | 'desc') => QueryBuilder} orderBy
 * @property {(count: number) => QueryBuilder}                              limit
 * @property {() => { sql: string, params: unknown[] }}                     build
 */

const DIRECTIONS = [ 'asc', 'desc' ]

/**
 * Table and column names cannot be bound as parameters, so `build()` checks each
 * against `schema`, the allowlist written in code. Only values go in `params`.
 *
 * @param   {Record<string, string[]>} schema  the columns each table allows
 * @param   {string}                   table
 * @returns {QueryBuilder}
 */
export function createQueryBuilder(schema, table) {
  const wheres = []
  const params = []
  let order = null
  let max = null

  /** Throws unless every identifier is in the schema and every option is valid. */
  function validate() {
    const columns = Object.hasOwn(schema, table) ? schema[ table ] : null
    if (!columns) throw new Error(`Unknown table: ${ table }`)

    for (const column of [ ...wheres, ...(order ? [ order.column ] : []) ]) {
      if (!columns.includes(column)) throw new Error(`Unknown column: ${ column }`)
    }
    if (order && !DIRECTIONS.includes(order.direction)) throw new Error(`Unknown direction: ${ order.direction }`)
    if (max != null && !(Number.isInteger(max) && max > 0)) throw new Error(`Limit must be a positive integer: ${ max }`)
  }

  const builder = {
    where(column, value) {
      wheres.push(column)
      params.push(value)

      return builder
    },
    orderBy(column, direction = 'asc') {
      order = { column, direction }

      return builder
    },
    limit(count) {
      max = count

      return builder
    },
    build() {
      validate()
      const where = wheres.length ? ` WHERE ${ wheres.map(column => `${ column } = ?`).join(' AND ') }` : ''
      const orderBy = order ? ` ORDER BY ${ order.column } ${ order.direction.toUpperCase() }` : ''
      const limit = max == null ? '' : ` LIMIT ${ max }`

      return { sql: `SELECT * FROM ${ table }${ where }${ orderBy }${ limit }`, params: [ ...params ] }
    },
  }

  return builder
}

const schema = { pages: [ 'status', 'locale', 'updated_at' ] }

const query = createQueryBuilder(schema, 'pages').where('status', 'published')
if (locale) query.where('locale', locale)
const { sql, params } = query.orderBy('updated_at', 'desc').limit(20).build()
```

Conditional steps read as plain `if`s, and nothing sees the query before `build()`.

## Keep in mind

- `build()` validates. A builder that returns something invalid has only moved the problem.
- Identifiers — table and column names, sort direction — come from code, never from input. They are spliced into the SQL, so `build()` rejects any that the allowlist does not name; only values travel as parameters.
- `build()` returns copies (`[ ...params ]`), so a later step cannot change a query already built.
- Decide whether a builder is reusable after `build()`. If not, say so or make later calls throw.

## Pairs with

- [Factory](factory.md) — one call; a builder is many.
- [Composite](../structural/composite.md) — builders often assemble trees.
- [Prototype](prototype.md) — start a builder from a copied template.
