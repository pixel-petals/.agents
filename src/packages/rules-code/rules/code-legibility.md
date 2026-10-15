# Code Legibility Conventions

---

## Summary

| Situation                                                                                            | Convention                                 |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [Between any two functions](#between-functions--always-one-blank-line)                               | One blank line                             |
| [Guard clause vs. main body](#inside-functions--blank-lines-separate-logical-phases)                 | One blank line                             |
| [Multi-part guard condition](#naming-inline-guard-conditions)                                        | Name it with a `const`                     |
| [Logical phases inside a function](#inside-functions--blank-lines-separate-logical-phases)           | One blank line                             |
| [Semantic groups inside an object literal](#inside-object-literals--blank-lines-group-semantic-keys) | One blank line                             |
| [Import groups](#imports--blank-lines-separate-import-groups-by-layer)                               | One blank line between groups              |
| [Last line before a closing keyword](#no-trailing-blank-inside-a-block)                              | No blank                                   |
| [Named file sections](#section-headers--ascii-underline)                                             | Label + `■■■` underline                    |
| [Inline why/disambiguation](#inline-explanatory-comments)                                            | Intent-focused; not a restatement          |
| [Debug prints](#commented-out-debug-prints)                                                          | Commented out, not deleted                 |
| [Dead code](#dead-code--block-comment)                                                               | Block comment                              |
| [TODOs](#todo-markers--lowercase-inline)                                                             | `todo ...` inline, lowercase               |
| [Doc blocks](#doc-block-comments)                                                                    | Function headers + type annotations        |
| [Index-tracking loops](#compact-loop-syntax)                                                         | Counter on loop boundary line              |

---

## Blank Lines

### Between functions — always one blank line

Every function boundary gets exactly one blank line above it. No double-blanks, no exceptions.

```text
end

function nextThing()
```

### Inside functions — blank lines separate logical phases

A blank line inside a function marks a shift in what the code is doing, not just a visual rest. The phases that earn a separator:

1. **Guard clauses / early returns** — followed by a blank before the main body begins.
2. **Setup / reads** — followed by a blank before mutations or output.
3. **Logical sub-steps** — each distinct operation gets its own paragraph.

```text
function onContent(content)
  reset()
  if childCount(content) == 0: return    // guard

  reformat(content)                      // ← blank separates guard from work

  numGroups = childCount(nodes.groups)   // reads together
  numVisible = top.numGroupsVisible
  numBuffered = top.numGroupsBuffered

  for i = numGroups to numVisible + numBuffered   // ← blank before loop
    createGroup()
  end

  drawContent()                          // ← blank before output phase

  getFocusedGroup().isFocused = true
  ...
end
```

### Inside object literals — blank lines group semantic keys

Related keys sit together; unrelated ones get a blank between them.

```text
event = formatEventData(EventType.PAGE_VIEW, {
  events: { view: true }

  app: getAppInfo()
  user: getUser()
  view: getPageInfo(event)
})
```

### Imports — blank lines separate import groups by layer

```text
import "grid.get"
import "grid.set"
import "grid.utils"

import "grid.animate"
import "grid.keypress"
```

No hard rule on what constitutes a group, but the groupings track concern (data vs. behaviour vs. event handling).

### No trailing blank inside a block

The last line before a closing keyword (`end`, `}`, etc.) is never blank.

---

## Guard Conditions

### Naming inline guard conditions

An add-on to [When to Split a Function](code-formatting.md#when-to-split-a-function), for guards that stay inline because extracting a predicate function would be overkill. It is not an alternative to extraction: if several named conditions all answer the same question, that is the scope trigger firing, and the answer is a function.

For a guard that stays, assign the condition to a `const` named for **why it matters**, then branch on the name.

```ts
const alreadyBound = Object.prototype.hasOwnProperty.call(instance, name)
if (alreadyBound) continue
```

Name the intent, not the call. `alreadyBound` says why we skip; `hasProp` just restates `hasOwnProperty` and earns nothing. If the name is a synonym for the expression, drop it — the expression was already clear, and `if (!items.length) return` needs no help.

The payoff scales with the condition, so this matters most when it has several parts. Name each part, and name the whole when the combination itself has a meaning:

```ts
const isExpired = Date.now() > token.expiresAt
const isRevoked = token.status === "revoked"
const isUnusable = isExpired || isRevoked

if (isUnusable) return null
```

The reader picks up the vocabulary — expired, revoked, unusable — instead of re-deriving it from operators. Where the combination has no natural name, `if (isExpired || isRevoked)` is finished; inventing `shouldSkip` adds a line and no meaning.

**Use `const`.** TypeScript narrows through a `const` boolean alias, including a compound one. With `let` it gives up, and the use site fails with "possibly null".

**Preserve short-circuiting.** Hoisting turns `&&` into unconditional evaluation, so never hoist a clause that is expensive, side-effecting, or only safe once an earlier guard has passed:

```ts
const isMissing = user == null
const isAdmin = user.role === "admin"   // throws when user is null
if (isMissing || !isAdmin) return
```

When a later clause depends on an earlier one, leave it in the guard or split into sequential guards, so the dependency is enforced by control flow.

---

## Comments

### Section headers — ASCII underline

Used to divide a file into named regions, always two lines: a label then a filled underline of `■` matching the label's length exactly (no padding, not full-width).

```text
// Focus Group
// ■■■■■■■■■■■

function moveFocusedGroup(...)
```

Used sparingly — only when a file contains multiple distinct named concepts that would otherwise blur together.

### Inline explanatory comments

Inline comments are good. Keep them focused on intent — the _why_, a constraint, or a disambiguation — not a restatement of what the code does.

```text
runner = singleton("runner", "Worker.Runner")
// get or create from global scope
```

```text
title.text = content.title // "On Now: "
```

The second form annotates what a value looks like at runtime — a sample string, a rejected label, an example output.

### Commented-out debug prints

Debug print statements are left commented out rather than deleted during development. This signals "intentionally off" vs. "never existed."

```text
// ? `${functionName}() returns ${promise.id}`
```

### Dead code — block comment

Large bodies of removed or superseded code are kept as block comments rather than deleted. The dead code is treated as reference while the replacement is being validated. Use whatever block comment syntax the language provides (`/* */`, `#= =#`, etc.); in languages without block comments, prefix each line individually.

### TODO markers — lowercase, inline

```text
// todo call unobserveField
```

Lowercase, no ticket number, placed at the callsite.

### Doc-block comments

JSDoc-style `/** */` blocks are used on function headers and for type annotations. A description is welcome; keep it to the intent, not a restatement of the signature.

For anything beyond a one-liner — extended rationale, examples, edge cases — create a markdown file with the same name as the code file and link to it from the doc-block.

For type annotations where the type cannot be inferred, prefer a named `@import` or `@typedef` over an inline type expression — inline expressions grow long and hurt readability.

```text
/** Resolves a label template against a matched file's context. See label.md. */
export function resolveLabel(template: string, ctx: LabelContext): string { ... }

/** @import { User, AdminConfig } from "./types" */

/** @type {User} */
const primaryAdmin = getAdmin();
```

---

## Compact loop syntax

Short loops that need an index counter keep the counter init and increment on the same line as the loop boundary, so the body remains uncluttered:

```text
r = 0; for row in grid:
  i = 0; for node in row:
    ...
  i += 1; end
r += 1; end
```

The body remains indented normally — only the boundary lines are compacted.
