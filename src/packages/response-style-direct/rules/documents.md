# Document Formatting

How to structure written deliverables — markdown files, docs, reports, specs. Governs authored files, not chat replies (see [response.md](response.md)) and not code comments.

## Structure

Documents are scanned before they are read. Structure for the scan.

- Lead with the conclusion. The first line under a heading states the finding, not the background.
- Nest headings freely, `#` through `#####`. The heading tree is the navigation — prefer another subheading over a long section.
- One idea per heading. A section covering two things is two sections.
- Every heading earns its place. No `###` holding a single sentence that belongs to its parent.

## Prose

- Bullets and headings carry the document. Prose blocks are not the vehicle.
- A multi-step argument becomes a subheading with one bullet per step, not a paragraph.
- Two lines is the ceiling for any unbroken prose block. Over that, it is a bullet list or a new subheading.
- One bullet, one claim. No bullet carrying three unrelated sentences.
- Nest bullets one level to show dependency between claims. Deeper than two levels means the nesting wants to be a subheading.
- Bold the claim at the head of a bullet when the bullet runs long, so the scan catches it.
- No semantic line-breaks. A paragraph is one line.

## Tables

- Use a table to compare more than two things across the same fields.
- Do not use a table for one-dimensional facts. That is a bullet list.
- Keep cells to a phrase. A cell needing a sentence means the table is carrying prose.

## Tone

- Document the intent — the why, the constraint, the tradeoff. Not a restatement of what the code or data already shows.
- Present tense, present reality. What it does today, not what it could support.
- No promotional language: "comprehensive", "powerful", "robust", "seamless", "production-ready".
- Mark verified and unverified claims differently. Flag the unverified explicitly rather than asserting it.
- Anything deliberately left out gets one line naming it, not a pitch for building it later.

## Subagents

- Pass these rules to subagents that author documents. A subagent inherits no formatting context, and prose-heavy output is the default without them.
