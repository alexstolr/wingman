import { existsSync, readdirSync, realpathSync } from "fs";
import { join, basename, extname, dirname } from "path";
import { homedir } from "os";
import { readStore } from "./store.js";

export type CapabilityType =
  | "rules" | "skills" | "tools" | "hooks" | "agents"
  | "conventions" | "workflows" | "prompts" | "souls" | "personas";

export interface Capability {
  id: string;
  name: string;
  type: CapabilityType;
  harness: string;
  scope: "global" | "repo";
  repo?: string;
  path: string;
}

const HARNESSES = ["cursor", "claude", "wingman", "codex", "grok", "copilot", "fleet"];
const HARNESS_SET = new Set(HARNESSES);

const TYPE_NAMES = new Set<CapabilityType>([
  "rules", "skills", "tools", "hooks", "agents",
  "conventions", "workflows", "prompts", "souls", "personas",
]);

const ALLOWED_EXTENSIONS = new Set([".md", ".mdc"]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", "__pycache__", ".venv", "venv", ".cache",
  // Cursor internal project state — not user capabilities
  "projects",
  // GitHub CI/CD — not AI capability workflows
  ".github",
  // Runtime session workspace snapshots — not capability definitions
  "sessions",
]);

const MAX_DEPTH = 6;

/**
 * Singular file names that are just type markers (AGENT.md, SKILL.md, etc.).
 * When matched, we use the parent folder name as the display name instead.
 */
const GENERIC_STEMS = new Set([
  "agent", "skill", "tool", "rule", "hook",
  "workflow", "prompt", "soul", "persona", "convention",
]);

function displayName(filePath: string): string {
  const stem = basename(filePath, extname(filePath));
  if (GENERIC_STEMS.has(stem.toLowerCase())) {
    return basename(dirname(filePath));
  }
  return stem;
}

/** Find a CapabilityType by looking through path parts, deepest first. */
function typeFromPath(filePath: string): CapabilityType | null {
  const parts = filePath.split("/");
  for (let i = parts.length - 2; i >= 0; i--) {
    if (TYPE_NAMES.has(parts[i].toLowerCase() as CapabilityType)) {
      return parts[i].toLowerCase() as CapabilityType;
    }
  }
  return null;
}

/** Find the harness name from path parts (.cursor → cursor, etc.). */
function harnessFromPath(filePath: string): string {
  const parts = filePath.split("/");
  for (const part of parts) {
    const name = part.startsWith(".") ? part.slice(1).toLowerCase() : part.toLowerCase();
    if (HARNESS_SET.has(name)) return name;
  }
  return "local";
}

function isIgnored(fileName: string, ignoreSet: Set<string>): boolean {
  if (ignoreSet.size === 0) return false;
  const stem = basename(fileName, extname(fileName)).toLowerCase();
  return ignoreSet.has(fileName.toLowerCase()) || ignoreSet.has(stem);
}

function walkDir(
  dir: string,
  scope: "global" | "repo",
  repo: string | undefined,
  depth: number,
  results: Capability[],
  ignoreSet: Set<string>
) {
  if (depth > MAX_DEPTH || !existsSync(dir)) return;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, scope, repo, depth + 1, results, ignoreSet);
    } else if (entry.isFile()) {
      if (entry.name === ".gitkeep") continue;
      if (!ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
      if (isIgnored(entry.name, ignoreSet)) continue;

      const type = typeFromPath(fullPath);
      if (!type) continue;

      results.push({
        id: fullPath,
        name: displayName(fullPath),
        type,
        harness: harnessFromPath(fullPath),
        scope,
        repo,
        path: fullPath,
      });
    }
  }
}

// Simple in-memory cache
let cache: { data: Capability[]; ts: number } | null = null;
const CACHE_TTL_MS = 10_000;

export function clearCache() { cache = null; }

export function scanCapabilities(force = false): Capability[] {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;

  const home = homedir();
  const all: Capability[] = [];

  const { workspacePaths = [], capabilityIgnoreNames = [] } =
    readStore<{ workspacePaths?: string[]; capabilityIgnoreNames?: string[] }>("settings.json", {});

  const ignoreSet = new Set(
    (capabilityIgnoreNames as string[]).map((n) => n.trim().toLowerCase()).filter(Boolean)
  );

  // Global harness folders: ~/.cursor, ~/.claude, etc.
  for (const harness of HARNESSES) {
    const dir = join(home, `.${harness}`);
    walkDir(dir, "global", undefined, 0, all, ignoreSet);
  }

  // Per-repo: scan each repo root (finds both harness folders and custom paths)
  for (const workspacePath of workspacePaths) {
    if (!existsSync(workspacePath)) continue;

    let repos;
    try {
      repos = readdirSync(workspacePath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const repo of repos) {
      if (!repo.isDirectory() || SKIP_DIRS.has(repo.name)) continue;
      walkDir(join(workspacePath, repo.name), "repo", repo.name, 0, all, ignoreSet);
    }
  }

  // Deduplicate by real (symlink-resolved) path so ~/.wingman and
  // {repo}/.wingman don't both appear when one is a symlink of the other.
  // Prefer the global entry (scope="global") over repo entries when both
  // resolve to the same file — so installed capabilities show as Global.
  const byRealPath = new Map<string, Capability>();
  for (const c of all) {
    let real: string;
    try { real = realpathSync(c.path); } catch { real = c.path; }
    const existing = byRealPath.get(real);
    if (!existing || (existing.scope === "repo" && c.scope === "global")) {
      byRealPath.set(real, c);
    }
  }
  const deduped = Array.from(byRealPath.values());

  cache = { data: deduped, ts: Date.now() };
  return deduped;
}
