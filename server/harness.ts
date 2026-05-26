import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export type HarnessName = "cursor" | "claude" | "codex";

export interface HarnessStatus {
  name: HarnessName;
  label: string;
  active: boolean;
  description: string;
}

const home = homedir();

const MARKER_START = "<!-- wingman-start -->";
const MARKER_END = "<!-- wingman-end -->";

const RULE_CONTENT = `---
description: Wingman AI capabilities — always active
alwaysApply: true
---

Wingman is your persistent AI capability store. Before every task, read \`~/.wingman/INDEX.md\` for orientation, then apply the most appropriate capabilities — rules, skills, tools, hooks, agents, personas, prompts, souls, conventions, and workflows — from \`~/.wingman/\`. Conventions are mandatory and must be strictly followed at all times. Choose the best capability for the task at hand, from Wingman or from the harness, and combine them when useful.
`;

const MD_SECTION = `\n${MARKER_START}\n## Wingman\n\nWingman is your persistent AI capability store. Before every task, read \`~/.wingman/INDEX.md\` for orientation, then apply the most appropriate capabilities — rules, skills, tools, hooks, agents, personas, prompts, souls, conventions, and workflows — from \`~/.wingman/\`. Conventions are mandatory and must be strictly followed at all times. Choose the best capability for the task at hand, from Wingman or from the harness, and combine them when useful.\n${MARKER_END}\n`;

function removeSection(content: string): string {
  const start = content.indexOf(MARKER_START);
  if (start === -1) return content;
  const end = content.indexOf(MARKER_END);
  const tail = end === -1 ? content.length : end + MARKER_END.length;
  const before = content.slice(0, start).trimEnd();
  const after = content.slice(tail);
  return before + (after.trim() ? "\n" + after.trimStart() : "");
}

// ── Cursor ────────────────────────────────────────────────────────────────────
// Creates ~/.cursor/rules/wingman.mdc with alwaysApply: true

const CURSOR_RULE_PATH = join(home, ".cursor", "rules", "wingman.mdc");

function cursorActive() { return existsSync(CURSOR_RULE_PATH); }

function cursorActivate() {
  const dir = join(home, ".cursor", "rules");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CURSOR_RULE_PATH, RULE_CONTENT, "utf-8");
}

function cursorDeactivate() {
  if (existsSync(CURSOR_RULE_PATH)) unlinkSync(CURSOR_RULE_PATH);
}

// ── Claude ────────────────────────────────────────────────────────────────────
// Appends a marked section to ~/.claude/CLAUDE.md

const CLAUDE_MD_PATH = join(home, ".claude", "CLAUDE.md");

function claudeActive() {
  return existsSync(CLAUDE_MD_PATH) && readFileSync(CLAUDE_MD_PATH, "utf-8").includes(MARKER_START);
}

function claudeActivate() {
  const dir = join(home, ".claude");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const existing = existsSync(CLAUDE_MD_PATH) ? readFileSync(CLAUDE_MD_PATH, "utf-8") : "";
  if (existing.includes(MARKER_START)) return;
  writeFileSync(CLAUDE_MD_PATH, existing + MD_SECTION, "utf-8");
}

function claudeDeactivate() {
  if (!existsSync(CLAUDE_MD_PATH)) return;
  writeFileSync(CLAUDE_MD_PATH, removeSection(readFileSync(CLAUDE_MD_PATH, "utf-8")), "utf-8");
}

// ── Codex ─────────────────────────────────────────────────────────────────────
// Appends a marked section to ~/AGENTS.md

const CODEX_AGENTS_PATH = join(home, "AGENTS.md");

function codexActive() {
  return existsSync(CODEX_AGENTS_PATH) && readFileSync(CODEX_AGENTS_PATH, "utf-8").includes(MARKER_START);
}

function codexActivate() {
  const existing = existsSync(CODEX_AGENTS_PATH) ? readFileSync(CODEX_AGENTS_PATH, "utf-8") : "";
  if (existing.includes(MARKER_START)) return;
  writeFileSync(CODEX_AGENTS_PATH, existing + MD_SECTION, "utf-8");
}

function codexDeactivate() {
  if (!existsSync(CODEX_AGENTS_PATH)) return;
  writeFileSync(CODEX_AGENTS_PATH, removeSection(readFileSync(CODEX_AGENTS_PATH, "utf-8")), "utf-8");
}

// ── Public API ────────────────────────────────────────────────────────────────

const HARNESSES: { name: HarnessName; label: string; description: string }[] = [
  { name: "cursor", label: "Cursor",  description: "~/.cursor/rules/wingman.mdc · alwaysApply" },
  { name: "claude", label: "Claude",  description: "~/.claude/CLAUDE.md · appended section"    },
  { name: "codex",  label: "Codex",   description: "~/AGENTS.md · appended section"             },
];

export function getHarnessStatuses(): HarnessStatus[] {
  return HARNESSES.map(({ name, label, description }) => ({
    name, label, description,
    active: name === "cursor" ? cursorActive()
          : name === "claude" ? claudeActive()
          : codexActive(),
  }));
}

export function activateHarness(name: HarnessName): void {
  if (name === "cursor") cursorActivate();
  else if (name === "claude") claudeActivate();
  else if (name === "codex") codexActivate();
  else throw new Error(`Unknown harness: ${name}`);
}

export function deactivateHarness(name: HarnessName): void {
  if (name === "cursor") cursorDeactivate();
  else if (name === "claude") claudeDeactivate();
  else if (name === "codex") codexDeactivate();
  else throw new Error(`Unknown harness: ${name}`);
}
