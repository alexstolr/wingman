import { existsSync, readdirSync } from "fs";
import { join, basename, extname } from "path";
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

const HARNESSES = ["cursor", "claude", "wingman", "codex", "grok", "copilot"];
const HARNESS_SET = new Set(HARNESSES);

const TYPE_NAMES = new Set<CapabilityType>([
  "rules", "skills", "tools", "hooks", "agents",
  "conventions", "workflows", "prompts", "souls", "personas",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".md", ".mdc", ".txt", ".sh", ".js", ".ts", ".py", ".yaml", ".yml", ".json",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", "__pycache__", ".venv", "venv", ".cache",
]);

const MAX_DEPTH = 6;

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

function walkDir(
  dir: string,
  scope: "global" | "repo",
  repo: string | undefined,
  depth: number,
  results: Capability[]
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
      walkDir(fullPath, scope, repo, depth + 1, results);
    } else if (entry.isFile()) {
      if (entry.name === ".gitkeep") continue;
      if (!ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;

      const type = typeFromPath(fullPath);
      if (!type) continue;

      results.push({
        id: fullPath,
        name: basename(entry.name, extname(entry.name)),
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

export function scanCapabilities(force = false): Capability[] {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;

  const home = homedir();
  const all: Capability[] = [];

  // Global harness folders: ~/.cursor, ~/.claude, etc.
  for (const harness of HARNESSES) {
    const dir = join(home, `.${harness}`);
    walkDir(dir, "global", undefined, 0, all);
  }

  // Per-repo: scan each repo root (finds both harness folders and custom paths)
  const { workspacePaths = [] } = readStore<{ workspacePaths?: string[] }>("settings.json", {});

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
      walkDir(join(workspacePath, repo.name), "repo", repo.name, 0, all);
    }
  }

  // Deduplicate by path (a file could theoretically be reached via a symlink twice)
  const seen = new Set<string>();
  const deduped = all.filter((c) => {
    if (seen.has(c.path)) return false;
    seen.add(c.path);
    return true;
  });

  cache = { data: deduped, ts: Date.now() };
  return deduped;
}
