# claude-mods

Ben's Claude Code plugin marketplace. It has one plugin, `ben`, and every mod lives inside it (`plugins/ben/hooks/`, one module per mod, each listed in `plugins/ben/hooks/hooks.json`).

## Mods in `ben`

- **Prompt Master**: a ✨ button above the prompt box (and `/prompt-master`). Type a rough draft, click it, and the draft is rewritten in place into a clearer prompt. ↶ puts your original back. Nothing is sent until you send it.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install ben --marketplace benisbetter/claude-mods
```

From a shell:

```
claude plugin install ben --marketplace benisbetter/claude-mods
```

Answer `y` to add the marketplace, then pick the user scope. This repository is private, so the machine needs a git credential for github.com first (`gh auth login`, then `gh auth setup-git`).

## Adding a mod

Add `plugins/ben/hooks/<mod>.tsx`, list it in `plugins/ben/hooks/hooks.json`, declare its state keys (prefixed) under `ben` in `plugins/ben/types/index.d.ts`, bump `version` in `plugins/ben/.claude-plugin/plugin.json`, then run `claude plugin validate plugins/ben` and `claude plugin test plugins/ben`.
