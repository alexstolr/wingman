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
| **Capabilities** | Browse all capabilities scanned from every AI harness on your machine (`.cursor`, `.claude`, `.wingman`, `.grok`, `.codex`, `.copilot`, `.fleet`) — global and per-repo |
| **Notes** | Free-form notes for the user and agent; persistent across sessions |
| **Documents** | Markdown and file documents organized in folders; persistent structured knowledge |
| **Tasks** | Task board with list and Kanban views, status, labels, assignee, and deadlines |
| **Sessions** | Live and historical view of automation runs — thinking blocks, text output, tool calls, cost |
| **Automations** | Schedule AI tasks (cron or one-shot) using Claude Code, Grok, Cursor, or Codex |
| **Marketplace** | Install, upgrade, and uninstall capabilities (rules, skills, hooks, agents, conventions, and more) into `~/.wingman` |

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
