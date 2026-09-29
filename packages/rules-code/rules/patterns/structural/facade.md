# Facade

One small entry point in front of a subsystem, covering the common case so callers do not have to learn every part.

## Use when

- The common task needs several modules called in the right order — fetch, resolve references, expand, render.
- Callers keep repeating the same setup, and getting it wrong.
- A subsystem should be swappable behind a stable surface.

## Not when

- The subsystem is already simple to use. A facade over one function is a rename.
- Callers routinely need the details the facade hides. They will reach around it, and now there are two ways in.

## Shape

```js
import { fetchPage } from './fetch.js'
import { expandReusable } from './reusable.js'
import { resolveMedia } from './resolve.js'
import { publish } from './publish.js'

/** Everything a route needs to turn a slug into HTML. */
export async function renderPage(slug, { loadEntries } = {}) {
  const page = await fetchPage(slug)
  if (!page) return null

  const expanded = await expandReusable(page.document)
  const resolved = await resolveMedia(expanded)

  return publish(resolved, { loadEntries })
}
```

The parts stay exported. A caller with an unusual need uses them directly; everyone else calls `renderPage`.

## Keep in mind

- A facade covers the common path, not every path. Do not grow an option for each rare case — let those callers use the parts.
- A facade holds no logic of its own beyond ordering and wiring. Rules belong in the subsystem.

## Pairs with

- [Adapter](adapter.md) — reshapes one interface; a facade simplifies many.
- [Mediator](../behavioral/mediator.md) — coordinates peers; a facade is called from outside.
- [Singleton](../creational/singleton.md) — a facade is often the one shared entry point; export it from a module instead.
