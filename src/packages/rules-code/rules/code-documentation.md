# Code Documentation

Governs prose written into the codebase — READMEs, doc blocks, comments. For comment placement and syntax, see [@code-legibility.md](code-legibility.md).

## Structure

- Lead with the point. First sentence states what the thing is or does; caveats and rationale follow.
- Headings and bullets over paragraphs. A paragraph is for something that genuinely does not decompose.
- Prefer a table when comparing more than two things across the same fields.
- Do not use semantic line-breaks in paragraphs.

## Document the Intent

- Document the WHY. The code and its identifiers already say the what.
- Comments are simple and concise. Not paragraphs.
- Explain a constraint, a trade-off, or a non-obvious reason. Skip anything self-evident from naming.
- Beyond a one-liner, write a markdown file beside the code and link to it from the doc block.

## No Filler

Cut on sight:

| Cut | Instead |
| --- | --- |
| "This function simply…", "Basically…" | State what it does |
| "It's important to note that…" | Note the thing |
| Restating the signature in prose | Nothing — the signature is right there |
| A closing summary of the section above | End at the last fact |

- No selling. Drop "robust", "comprehensive", "powerful", "seamless", "production-ready".
- Say what is true, not what is impressive.

## Present Reality

- Describe what the code does today. Not what it will support, could be extended to, or is "ready for".
- No roadmaps or unbuilt-feature tours.
- No task context — "added for issue #123", "per the refactor" — that belongs in commits and PRs.

## Keep It Close

- Documentation lives next to what it describes, and is updated in the same change.
- Avoid restating implementation details that rot as the code evolves.
