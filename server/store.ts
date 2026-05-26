import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export function readStore<T>(file: string, fallback: T): T {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(file: string, data: T): void {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf-8");
}
