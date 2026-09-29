---
name: docs
description: Where documentation lives in this repo and how it is written — readme.md at a folder's root, <file>.md beside the file it documents, .docs/ for assets, diagrams, and further docs, tests in .tests/. Use when writing, moving, or linking any markdown doc, adding a doc-block link to extended docs, or deciding where a folder's docs or tests go.
---

# Documentation

Docs live with the code they describe, not in a central tree that mirrors the source.

## Layout

Every folder follows the same shape, from the repo root down to a single cluster:

```text
parse/
  .docs/
    grammar.md       ← further docs about the folder
    pipeline.svg     ← diagram, image, or other asset
  .tests/
    parse.test.js
  index.js
  parse.js
  parse.md           ← docs specific to parse.js
  readme.md          ← entry point for the folder
```

| Doc                                                 | Location                          |
| --------------------------------------------------- | --------------------------------- |
| What a folder or package is, and how to use it      | `readme.md` at the folder's root  |
| Docs specific to one file, such as `parse.js`       | `parse.md` beside it              |
| Assets, diagrams, and further docs about the folder | `.docs/` in the folder            |

- **`readme.md`** is lowercase and is the folder's entry point.
- **`<file>.md`** shares its file's base name, so the two sort next to each other. When a doc block needs more than a line or two, write the rest there and link to it: `/** Resolves a label template. See parse.md. */`.
- **`.docs/`** holds whatever isn't a readme and isn't about a single file: images, diagrams, and docs that span several files.
- **`.tests/`** holds the folder's tests. The [javascript](../javascript/SKILL.md) skill covers how they're written.

The `.` prefix sorts `.docs/` and `.tests/` to the top of the folder listing, above the code, and keeps them out of barrels and globs that skip dot-prefixed folders.

The repo root follows the same rule: `readme.md` at the root, and repo-wide docs in `.docs/` once there is something to put there.

## Placement

- Put a doc in the deepest folder it applies to. A doc about one package belongs in that package, not in the root `.docs/`.
- If a doc about one file grows to cover several, move it to `.docs/<topic>.md` and link to it from each file's doc.
- Create `.docs/` only when a folder has something to put in it. Don't add empty doc folders.
- When code moves, move its `readme.md`, `<file>.md` and `.docs/` with it.

## Writing

- Document the intent: why the code is shaped this way, what was rejected, and which constraints aren't visible in the code. Don't restate what the code does.
- Don't use semantic line breaks. Each paragraph is one line.
- Link with relative paths, so the links work on GitHub and in the editor.
- Don't record the context of a task or fix ("added for #123"). That belongs in the commit or PR.
