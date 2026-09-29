# Pixel Petals — Agent Plugins

A plugin monorepo for AI coding agents. Each package is an installable plugin that contributes rules or agent definitions at session start, or skills that load when a task calls for them.

## Packages

| Plugin | Description |
| --- | --- |
| [`rules-code`](packages/rules-code/) | Code formatting, legibility, principles, design patterns, planning, documentation, and testing rules |
| [`rules-git`](packages/rules-git/) | Git commit and pull request conventions |
| [`response-style-direct`](packages/response-style-direct/) | How Claude formats its replies: lead with the answer, no filler, present tense |
| [`skills-monorepo`](packages/skills-monorepo/) | Skills for repos made from `.template`: `monorepo-conventions`, `javascript`, `docs`, `github-ci`, `vscode-sync` |

## Installation

### Claude Code

Add this repo as a marketplace source, then install individual plugins:

```bash
/plugin marketplace add git@github.com:pixel-petals/agent.git
/plugin install rules-code@pixel-petals
/plugin install rules-git@pixel-petals
/plugin install response-style-direct@pixel-petals
/plugin install skills-monorepo@pixel-petals
```

Or install directly from a local clone:

```bash
claude plugin install ./packages/rules-code
claude plugin install ./packages/rules-git
claude plugin install ./packages/response-style-direct
claude plugin install ./packages/skills-monorepo
```

### In a repository

A repository turns plugins on for everyone who works in it through its committed `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "rules-code@pixel-petals": true,
    "rules-git@pixel-petals": true,
    "skills-monorepo@pixel-petals": true
  },
  "extraKnownMarketplaces": {
    "pixel-petals": {
      "source": { "source": "git", "url": "git@github.com:pixel-petals/.agents.git" }
    }
  }
}
```

## Structure

```text
.claude-plugin/marketplace.json   ← marketplace catalog
packages/
  <plugin>/
    .claude-plugin/plugin.json    ← installable manifest
    hooks/hooks.json              ← SessionStart hook (emits rules to context)
    rules/                        ← rule content
    skills/<name>/SKILL.md        ← skills, loaded on demand
```

A rules plugin's `SessionStart` hook cats its rules into context, injecting them at the beginning of every session. A skills plugin has no hook: Claude Code lists each skill's `description` and loads the `SKILL.md` when a task matches it. Plugin skills are namespaced by plugin, e.g. `skills-monorepo:javascript`.
