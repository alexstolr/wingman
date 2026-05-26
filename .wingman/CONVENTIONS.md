---
name: Table of Contents Convention
description: Convention for maintaining a navigable table of contents across every folder via INDEX.md files.
filename: CONVENTIONS.md
---

# Project Structure and File Mapping — INDEX.md Convention

Rules and patterns for maintaining a traversable knowledge graph across every folder an AI accesses. Every folder gets an `INDEX.md` — a table of contents that lets an agent navigate in depth and breadth without reading every file upfront.

## In This File

| Section | Description |
|---|---|
| [Folder Structure](#folder-structure) | How folders and files are organized |
| [CONVENTIONS.md](#conventionsmd) | The single global rule file |
| [INDEX.md Pattern](#indexmd-pattern) | What every INDEX.md must contain |
| [File Pattern](#file-pattern) | Standard layout for every content file |
| [Naming Rules](#naming-rules) | File and folder naming conventions |
| [Content Rules](#content-rules) | What goes in content files |
| [Adding a New Subfolder](#adding-a-new-subfolder) | Step-by-step checklist |
| [Adding a New File](#adding-a-new-file) | Step-by-step checklist |
| [Wingman Persistent Context](#wingman-persistent-context) | Notes, Documents, and Tasks available as agent memory |

---

## Folder Structure

```
{any-folder}/
├── INDEX.md              ← Lists direct subfolders and direct files only (not nested)
└── {topic}/              ← One subfolder per major system/feature
    ├── INDEX.md          ← Subfolder index (same pattern, recursively)
    ├── 00-*.md
    ├── 01-*.md
    └── ...
```

Every folder has an `INDEX.md`. Every subfolder follows the same pattern recursively.

---

## CONVENTIONS.md

There is exactly **one** `CONVENTIONS.md`, located directly at `~/.wingman/CONVENTIONS.md`. It is the only file that sits at the root of `~/.wingman/` rather than inside a capability subfolder. It contains mandatory rules and instructions that apply globally — to every folder, repo, and file the agent accesses.

---

## INDEX.md Pattern

Every `INDEX.md` has two jobs:

1. **"In This Section" table** — lists **only** the subfolders and files directly in that folder (never contents of nested subfolders)
2. **Short description** — one-liner explaining what this folder covers

Template:

```markdown
# {Folder Name} — Index

{One-line description of what this folder covers.}

## In This Section

| File | Description | Key Terms |
|---|---|---|
| [{topic}/INDEX.md]({topic}/INDEX.md) | Short description of the subfolder | key, terms |
| [filename.md](filename.md) | Short description | key, terms |
```

Rules:
- List subfolders by linking to their `INDEX.md`
- List files that live directly in this folder
- **Key Terms** column lets agents find relevant files without reading them
- Files are listed in reading order (numbered prefix determines order)

---

## File Pattern

Every content file uses YAML frontmatter for metadata, matching the convention used across AI harnesses:

```markdown
---
title: {Title}
sources:
  - src/path/to/main.ts
  - src/path/to/supporting.ts
---

## In This File

| Section | Description |
|---|---|
| [Section Name](#section-name) | What this section covers |

---

## {First content section}

...
```

Rules:
- **Frontmatter** — `title` and `sources` (relative paths from project root to relevant source files)
- **"In This File" table** — mandatory TOC of every section in this file, with anchor links
- **Horizontal rule** (`---`) — separates the TOC from the content
- **Content sections** — the actual documentation

---

## Naming Rules

| Element | Convention | Example |
|---|---|---|
| Subfolder | `kebab-case`, topic name | `receipt-processing/` |
| Index file | Always `INDEX.md` (uppercase) | `knowledge/INDEX.md` |
| Content file | `{NN}-{kebab-case-name}.md` | `03-receipt-parsing.md` |
| Number prefix | 2-digit, zero-padded, reading order | `00-`, `01-`, `02-` |
| Overview file | Always `00-overview.md` in each subfolder | `00-overview.md` |

---

## Content Rules

> **Core principle:** This system is optimized for **AI/LLM context windows**. Every token matters. Be maximally information-dense — no filler, no repetition, no prose where a table or bullet will do.

- Use **code** as the source of truth — not phase documents or roadmaps
- Include **function signatures**, **config values**, and **interface definitions** where relevant
- Reference source files using relative paths from project root
- **Prefer tables and bullet points** over paragraphs — agents parse structured content faster
- **One fact, one place** — link to another file instead of restating information
- Keep every sentence load-bearing — if removing a line loses no information, remove it
- Update the parent folder's `INDEX.md` whenever a file or subfolder is added
- Document only what exists in code today — not aspirational or planned features
- Use short snippets, signatures, or pseudocode instead of full source code

---

## Adding a New Subfolder

1. Create the folder: `{folder}/{topic}/`
2. Create `{folder}/{topic}/INDEX.md` following the [INDEX.md Pattern](#indexmd-pattern)
3. Add numbered content files for each subtopic
4. Update `{folder}/INDEX.md` — add a row for the new subfolder to "In This Section"

---

## Adding a New File

1. Create the file with the next available number prefix
2. Add YAML frontmatter and an "In This File" table following the [File Pattern](#file-pattern)
3. Update the parent folder's `INDEX.md` — add a row to "In This Section"

---

## Wingman Persistent Context

Wingman provides three surfaces that serve as persistent memory and context shared between the user and the agent. The agent can read, create, and modify them — either when explicitly asked or when it derives that doing so serves the user's request.

| Surface | Purpose |
|---|---|
| **Notes** | Free-form content (not necessarily markdown). Observations, research, quick thoughts, and anything the user or agent wants preserved across sessions. |
| **Documents** | Content organized in folders. Can be markdown, plain text, or uploaded files of any type. Use for reference material, conventions, long-form content, and structured knowledge. |
| **Tasks** | Structured task list with status, labels, assignee, and deadline. Tracks what the user wants done, what is in progress, and what is complete. |

When starting a session, the agent should check these surfaces to understand current user intent, open tasks, and accumulated context before proceeding.
