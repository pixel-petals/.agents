# Declarative > Imperative

Declarative code says *what*. Imperative code says *how*.

```text
// imperative — the reader must simulate state to learn the intent
out = []
for i = 0 to length(xs)
  if xs[i].active
    out.push(xs[i].name)

// declarative — the intent is the text
out = xs.filter(isActive).map(toName)
```

Both run a loop. Only one makes the reader write it out in their head.

## The Imperative Never Disappears

This is a spectrum, not a binary. Every declarative layer is imperative code underneath — `filter` is declarative to its caller and imperative in its body, and the same holds for every name you extract.

So the goal is never "remove the imperative code." The goal is to **push it down a layer and name it**, so that each layer reads as a description of intent and the mechanism lives one call away.

- A function is declarative when its body is a list of named intents.
- A function is imperative when its body is the mechanism those names would have described.
- Every codebase bottoms out in imperative kernels. That is correct. They just shouldn't be inlined into the narrative.

## Why Declarative Is Preferred

- **Legibility.** Named intent is read. Mechanism is simulated. Simulation is the expensive operation in code review.
- **Testability.** Extracting the mechanism gives it a name, a signature, and a seam to test against — see [pure-programming](pure-programming.md).
- **Diffability.** A description can be compared against another description. Effects cannot. This is why idempotency is nearly free declaratively and a recurring bug source imperatively.
- **Replaceability.** A named step can be swapped for a different implementation. An inlined loop is fused to its callers.
- **Reviewability.** A declarative body fails review on *intent*; an imperative body fails review on *transcription errors*, which are the ones that survive review.

## Heuristics — Detecting Over-Imperative Code

These mirror [Formatting](../code-formatting.md). The same triggers that mean "split this function" also mean "this is reading too imperatively" — it is one symptom with two names.

### The "and" Test

Already the split rule for functions and files. Applied to reading level: if describing the body needs "and", the body is a sequence of mechanisms that wants to be a sequence of names.

- "It **walks** the tree **and** collects matches **and** formats them" → three named calls, one declarative body.

### The Narration Test

Read the body aloud as intent. If the sentence contains loop bookkeeping, index math, accumulator mutation, or flag state, those words belong inside a named function, not in the narration.

- "For each index, if the flag is still unset, set it and break" is mechanism, not intent. The intent is `findFirstMatch`.

### The Comment Test

A comment explaining **what** a block does is a function name that was never written. Comments should carry *why* (see [Documentation](../code-documentation.md)); a *what* comment is a rename request in disguise.

```text
// filter to the active users     ← this is a function name
for u in users
  ...
```

### The Blank-Line Test

[Legibility](../code-legibility.md) says blank lines separate logical phases inside a function. Each such phase is a candidate extraction.

- **2–3 phases** — fine, if the phases are short and each reads as one step.
- **4+ phases** — the function is a narrative of mechanisms. Name the phases.

The blank lines have already identified the seams. Cut on the seam the code shows.

### The Nesting Test

Depth is the most reliable imperative smell, because depth *is* held state.

| Depth | Reading | Action |
| ----- | -------------------------------- | ---------------------------- |
| 1     | Declarative                      | Fine |
| 2     | One condition held in mind       | Fine |
| 3     | Reader is tracking state         | Extract the inner block |
| 4+    | Reader is executing the program  | Extract, always |

Guard clauses and early returns are the cheapest fix — they trade nesting for a flat list of preconditions.

### The Mutable-Variable Test

Count the local variables reassigned after declaration.

- **0–1** — declarative.
- **2** — borderline; usually one accumulator and one cursor that want to be a single named transform.
- **3+** — the function is a state machine. The reader must track every variable across every line simultaneously.

An accumulator whose whole life is `init → loop → push → return` is a named transform that hasn't been named yet.

### The Temporal-Coupling Test

If reordering two adjacent statements silently breaks the code, and nothing in their names says so, the ordering is invisible knowledge. Either make the dependency explicit by passing the result forward, or name the sequence as one step that owns the ordering.

## Applying the Fix

The refactor is nearly always the same shape: **name the phases, then delete the mechanism from view.**

1. Find the seams — blank lines, `what` comments, nesting, accumulators.
2. Give each seam a name that states intent, not steps.
3. Extract it, taking its state with it.
4. The remaining body should now read as a list of those names.
5. If the extracted pieces form a cluster of their own scope, they become their own file — see [Formatting → Collocation](../code-formatting.md#collocation).

## The Caveat

Do not chase zero imperative code. Two failure modes to watch for:

- **Naming the trivial.** A three-line loop extracted behind a name the reader must now go look up is worse than the loop. Extraction pays only when the name is more informative than the body.
- **Declarative theatre.** A chain of six combinators hiding six passes over the data is imperative cost with declarative syntax. Declarative reading is not a license to stop knowing what runs, and where the control flow *is* the requirement — algorithms, parsers, hot loops — the imperative form is the honest one. Name it, isolate it, and leave it imperative.

Per [KISS](KISS-keep-it-simple.md): the target is clear and understandable, not maximally abstract.
