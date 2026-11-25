# claude-mods

Ben's Claude Code plugin marketplace: `ben` (Prompt Master) and `prompt-bar`.

## Plugins

- **Prompt Master**: a ✨ button above the prompt box (and `/prompt-master`). Type a rough draft, click it, and the draft is rewritten in place into a clearer prompt. ↶ puts your original back. Nothing is sent until you send it. (plugin `ben`)
- **Prompt bar**: one row above the prompt box. Rings for how full the context window is and how much of the 5-hour and 7-day usage limits is used; the prompt cache as `warm Nm` (1 hour from the last request) or `cold`; and a **Master prompt** button that rewrites the draft in the box into a stronger, more ambitious prompt and puts it back for you to read before sending. The bar makes no model calls; only a press of Master prompt does. Works in the terminal and the Desktop app. (plugin `prompt-bar`)

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install ben --marketplace benisbetter/claude-mods
/plugin install prompt-bar --marketplace benisbetter/claude-mods
```

From a shell:

```
claude plugin install ben --marketplace benisbetter/claude-mods
claude plugin install prompt-bar --marketplace benisbetter/claude-mods
```

Answer `y` to add the marketplace, then pick the user scope. This repository is private, so the machine needs a git credential for github.com first (`gh auth login`, then `gh auth setup-git`).

## Adding a mod

A plugin takes one hooks module and hooks each event (and each `ui.render` component) once, so a mod that hooks events another mod already uses goes in its own plugin: `plugins/<mod>/` with `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.tsx` and `types/index.d.ts`, plus an entry in `.claude-plugin/marketplace.json`. Then run `claude plugin validate plugins/<mod>` and `claude plugin test plugins/<mod>`.
