import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { writeStore, readStore } from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, "../marketplace/catalog.json");
const WINGMAN_DIR = join(process.cwd(), ".wingman");

export interface CatalogVersion {
  version: string;
  changelog: string;
  content: string;
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
  path: string;
}

export interface MarketplaceEntry extends CatalogEntry {
  installed: boolean;
  installedVersion?: string;
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

  const typeDir = join(WINGMAN_DIR, entry.type);
  if (!existsSync(typeDir)) mkdirSync(typeDir, { recursive: true });

  const fileName = `${entry.name}.md`;
  const filePath = join(typeDir, fileName);
  writeFileSync(filePath, ver.content, "utf-8");

  const record: InstalledRecord = {
    version,
    installedAt: new Date().toISOString(),
    path: filePath,
  };

  const installed = loadInstalled();
  installed[id] = record;
  saveInstalled(installed);

  return record;
}

export function uninstallEntry(id: string): void {
  const installed = loadInstalled();
  const record = installed[id];
  if (!record) throw new Error(`Entry "${id}" is not installed.`);

  if (existsSync(record.path)) {
    try { unlinkSync(record.path); } catch { /* already gone */ }
  }

  delete installed[id];
  saveInstalled(installed);
}
