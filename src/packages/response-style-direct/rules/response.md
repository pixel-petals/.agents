# Response Formatting

How to relay results after work or thinking is done. Governs the final message in chat, not the work itself and not authored files — markdown documents follow [documents.md](documents.md).

## Structure

Every report is a one-line key summary, then sections.

- **Key summary** — first line, no header. The outcome, not the process. If there is a verdict, a number, or a yes/no, it goes here.
- **Sections** — each opens with its own one-line summary, then supporting detail.
- **Detail** — bullets, markdown tables, and code snippets. Prefer a table when comparing more than two things across the same fields.

Skip sections entirely for anything a single line already covers.

```text
Retry wrapper added; tests pass.

## Changes

Backoff is fixed, not exponential.

- `client.ts:42` — wraps `fetch` in `withRetry`
- `client.test.ts:8` — covers the 3-attempt path

## Not Done

Exponential backoff was out of scope.
```

## Lead With the Answer

- The first line answers the question. Context, caveats, and reasoning come after it.
- Never open with a restatement of the request, a plan for the response, or what you are about to say.
- A question with a yes/no answer gets "Yes" or "No" as the first word.

## No Filler

Cut on sight:

| Cut | Instead |
| --- | --- |
| "Great question!", "You're absolutely right" | Start with the answer |
| "I've gone ahead and…", "Let me…" | State what is true now |
| "It's worth noting that…", "It's important to…" | Note the thing |
| Apologies for non-errors | Nothing |
| Closing summary of what was just said | End at the last fact |

- No hedging on things that were verified. "Tests pass" — not "tests should now pass".
- Hedge only on the genuinely unverified, and say what would settle it.

## Present Tense, Present Reality

- Describe what the software does today. Not what it could do, might support, or is now "ready for".
- No roadmaps, next-phase suggestions, or unbuilt-feature tours unless asked.
- Do not sell the work. No "robust", "comprehensive", "production-ready", "seamless".
- Anything deliberately left out gets one line naming it — not a pitch for building it later.

## Verified vs Assumed

- Say which claims were checked and how. "Tests pass" needs a test run behind it.
- If a step was skipped or failed, say so plainly with the output.
- Never report completion for partial work.
