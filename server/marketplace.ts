import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  rmSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { writeStore, readStore } from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, "../marketplace/catalog.json");
const PACKAGES_DIR = join(__dirname, "../marketplace/packages");
const WINGMAN_DIR = join(process.cwd(), ".wingman");

export interface CatalogVersion {
  version: string;
  changelog: string;
  content: string;
  /** Folder name under marketplace/packages/ — installs as a directory under ~/.wingman/{type}/ */
  package?: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  type: string;
  description: string;
  author: string;
  tags: string[];
  versions: CatalogVersion[];
}

export interface InstalledRecord {
  version: string;
  installedAt: string;
  /** Primary capability file (e.g. SKILL.md) for the scanner */
  path: string;
  /** Directory removed on uninstall for package installs */
  root?: string;
}

export interface MarketplaceEntry extends CatalogEntry {
  installed: boolean;
  installedVersion?: string;
}

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function installPackage(packageName: string, typeDir: string): { path: string; root: string } {
  const packageSrc = join(PACKAGES_DIR, packageName);
  if (!existsSync(packageSrc)) {
    throw new Error(`Package "${packageName}" not found in marketplace/packages/.`);
  }

  const installDir = join(typeDir, packageName);
  rmSync(installDir, { recursive: true, force: true });
  copyDirRecursive(packageSrc, installDir);

  const skillPath = join(installDir, "SKILL.md");
  if (!existsSync(skillPath)) {
    throw new Error(`Package "${packageName}" is missing SKILL.md.`);
  }

  return { path: skillPath, root: installDir };
}

function typeDirFor(entry: CatalogEntry): string {
  return entry.type === "conventions" ? WINGMAN_DIR : join(WINGMAN_DIR, entry.type);
}

/**
 * Called at server startup. For each catalog entry whose file already exists
 * on disk (pre-committed or manually placed), seed an installed.json record
 * so the marketplace shows it as installed without requiring a manual install.
 */
export function seedPreinstalledCapabilities(): void {
  const catalog = loadCatalog();
  const installed = loadInstalled();
  let changed = false;

  for (const entry of catalog) {
    if (installed[entry.id]) continue;

    const latestVersion = entry.versions[entry.versions.length - 1];
    const typeDir = typeDirFor(entry);

    if (latestVersion.package) {
      const skillPath = join(typeDir, latestVersion.package, "SKILL.md");
      if (existsSync(skillPath)) {
        installed[entry.id] = {
          version: latestVersion.version,
          installedAt: new Date().toISOString(),
          path: skillPath,
          root: join(typeDir, latestVersion.package),
        };
        changed = true;
      }
      continue;
    }

    const frontmatterFilename = parseFrontmatterFilename(latestVersion.content);
    const fileName = frontmatterFilename ?? `${entry.name}.md`;
    const filePath = join(typeDir, fileName);

    if (existsSync(filePath)) {
      installed[entry.id] = {
        version: latestVersion.version,
        installedAt: new Date().toISOString(),
        path: filePath,
      };
      changed = true;
    }
  }

  if (changed) saveInstalled(installed);
}

/** Extract `filename:` from YAML frontmatter, returns null if not present. */
function parseFrontmatterFilename(content: string): string | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return null;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = trimmed.slice(3, end);
  const match = block.match(/^filename:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function loadCatalog(): CatalogEntry[] {
  try {
    return JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as CatalogEntry[];
  } catch {
    return [];
  }
}

function loadInstalled(): Record<string, InstalledRecord> {
  return readStore<Record<string, InstalledRecord>>("installed.json", {});
}

function saveInstalled(data: Record<string, InstalledRecord>): void {
  writeStore("installed.json", data);
}

export function listMarketplace(): MarketplaceEntry[] {
  const catalog = loadCatalog();
  const installed = loadInstalled();
  return catalog.map((entry) => ({
    ...entry,
    installed: !!installed[entry.id],
    installedVersion: installed[entry.id]?.version,
  }));
}

export function installEntry(id: string, version: string): InstalledRecord {
  const catalog = loadCatalog();
  const entry = catalog.find((e) => e.id === id);
  if (!entry) throw new Error(`Entry "${id}" not found in catalog.`);

  const ver = entry.versions.find((v) => v.version === version);
  if (!ver) throw new Error(`Version "${version}" not found for "${id}".`);

  const typeDir = typeDirFor(entry);
  if (!existsSync(typeDir)) mkdirSync(typeDir, { recursive: true });

  let record: InstalledRecord;

  if (ver.package) {
    const { path, root } = installPackage(ver.package, typeDir);
    record = {
      version,
      installedAt: new Date().toISOString(),
      path,
      root,
    };
  } else {
    const frontmatterFilename = parseFrontmatterFilename(ver.content);
    const fileName = frontmatterFilename ?? `${entry.name}.md`;
    const filePath = join(typeDir, fileName);
    writeFileSync(filePath, ver.content, "utf-8");
    record = {
      version,
      installedAt: new Date().toISOString(),
      path: filePath,
    };
  }

  const installed = loadInstalled();
  installed[id] = record;
  saveInstalled(installed);

  return record;
}

export function uninstallEntry(id: string): void {
  const installed = loadInstalled();
  const record = installed[id];
  if (!record) throw new Error(`Entry "${id}" is not installed.`);

  if (record.root && existsSync(record.root)) {
    try {
      rmSync(record.root, { recursive: true, force: true });
    } catch {
      /* already gone */
    }
  } else if (existsSync(record.path)) {
    try {
      unlinkSync(record.path);
    } catch {
      /* already gone */
    }
  }

  delete installed[id];
  saveInstalled(installed);
}
