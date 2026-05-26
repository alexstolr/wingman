# Wingman

A local dashboard for managing your AI capabilities, workflows, and context. Wingman gives you a single place to discover and install capabilities across every AI harness on your machine, schedule and monitor AI automations, and maintain persistent notes, documents, and tasks that agents can read and write.

## Getting started

```bash
npm install
npm run dev:all
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

> `dev:all` starts both the Vite frontend (port 3002) and the Express backend (port 3001) concurrently.

## Features

| Tab | Purpose |
|-----|---------|
| **Home** | Activate Wingman (symlinks `~/.wingman`), configure workspace paths |
| **Capabilities** | Browse all capabilities scanned from every AI harness on your machine (`.cursor`, `.claude`, `.wingman`, `.grok`, `.codex`, `.copilot`) — global and per-repo |
| **Notes** | Free-form notes for the user and agent; persistent across sessions |
| **Documents** | Markdown and file documents organized in folders; persistent structured knowledge |
| **Tasks** | Task board with list and Kanban views, status, labels, assignee, and deadlines |
| **Sessions** | Live and historical view of automation runs — thinking blocks, text output, tool calls, cost |
| **Automations** | Schedule AI tasks (cron or one-shot) using Claude Code, Grok, Cursor, or Codex |
| **Marketplace** | Install, upgrade, and uninstall capabilities (rules, skills, hooks, agents, conventions, and more) into `~/.wingman` |

## How to use

1. **Enable Wingman on the Home page** — click the Enable button. This symlinks `~/.wingman` to the `.wingman` folder in this repo, making your capabilities globally available to every AI harness on your machine.

2. **Activate it in your harness** — open the AI tool you use (Cursor, Claude, Grok, Codex, etc.) and ensure it picks up the global config. It should sync automatically. If Cursor doesn't pick it up, go to Cursor Settings → Rules and make sure it's loading global rules from the root `~/.cursor` folder.

3. **Configure your workspace folders** — on the Home page, add the root directories where your repositories live. Wingman scans these to discover per-repo capabilities and merges them with your global ones.

4. **Install capabilities from the Marketplace** — browse and install rules, skills, hooks, agents, and more. Installed capabilities land in `~/.wingman` and apply globally across everything you work on.

5. **Add notes, tasks, and documents** — use these as persistent memory and context for your agents. When working with a harness, mention what's stored there — the agent will find it on its own. It can also update them, so your context stays in sync across sessions.

6. **Set up automations** — schedule AI tasks to run on a cron or one-shot basis. Requires Claude Code or Grok installed and accessible on your machine. Once running, head to the **Sessions** tab to watch the live output, inspect tool calls, and review cost.

> **Conventions and Index come pre-installed.** `~/.wingman/CONVENTIONS.md` ships with a baseline set of coding conventions that apply globally across every harness and repo. `INDEX.md` is predefined as a map of your Wingman setup so agents can orient themselves without scanning every file.

## Wingman activation

Activating Wingman creates a symlink from `~/.wingman` to the `.wingman` folder in this repo. Capabilities installed from the marketplace are written there and become available to every harness that reads `~/.wingman`.

```
~/.wingman/
├── CONVENTIONS.md   ← global convention file (applies everywhere)
├── rules/
├── skills/
├── tools/
├── hooks/
├── agents/
└── ...              ← one subfolder per capability type
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7 |
| Backend | Node.js, Express 5, `tsx` (TypeScript runtime) |
| Scheduling | `node-cron` |
| Markdown | `react-markdown`, `remark-gfm`, `@tailwindcss/typography` |
| Data | JSON files in `data/` (gitignored) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start frontend + backend together |
| `npm run dev` | Frontend only (Vite) |
| `npm run dev:server` | Backend only (`tsx watch`) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Data

All user data (notes, documents, tasks, sessions, automations, settings) is stored as JSON in the `data/` directory, which is gitignored.

## License

Copyright (c) 2026 Alex Stoliar. All Rights Reserved. See [LICENSE](./LICENSE) for details.

---

Built by [Alex Stoliar](https://alexstoliar.com) · [alexstoliar.com](https://alexstoliar.com)
