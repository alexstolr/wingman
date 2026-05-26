import { existsSync, lstatSync, symlinkSync, unlinkSync, readlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const REPO_WINGMAN = join(process.cwd(), ".wingman");
const GLOBAL_WINGMAN = join(homedir(), ".wingman");

export interface WingmanStatus {
  active: boolean;
  symlinkTarget?: string;
  expectedTarget: string;
  warning?: string;
}

export function getWingmanStatus(): WingmanStatus {
  const base = { expectedTarget: REPO_WINGMAN };

  if (!existsSync(GLOBAL_WINGMAN)) {
    return { ...base, active: false };
  }

  try {
    const stat = lstatSync(GLOBAL_WINGMAN);
    if (!stat.isSymbolicLink()) {
      return { ...base, active: false, warning: "~/.wingman exists but is not a symlink — remove it manually to activate." };
    }
    const target = readlinkSync(GLOBAL_WINGMAN);
    return { ...base, active: target === REPO_WINGMAN, symlinkTarget: target };
  } catch {
    return { ...base, active: false };
  }
}

export function activate(): void {
  // Ensure the repo's .wingman folder exists
  if (!existsSync(REPO_WINGMAN)) mkdirSync(REPO_WINGMAN, { recursive: true });

  if (existsSync(GLOBAL_WINGMAN)) {
    const stat = lstatSync(GLOBAL_WINGMAN);
    if (!stat.isSymbolicLink()) {
      throw new Error("~/.wingman already exists and is not a symlink. Remove it manually first.");
    }
    unlinkSync(GLOBAL_WINGMAN);
  }

  symlinkSync(REPO_WINGMAN, GLOBAL_WINGMAN);
}

export function deactivate(): void {
  if (!existsSync(GLOBAL_WINGMAN)) return;

  const stat = lstatSync(GLOBAL_WINGMAN);
  if (!stat.isSymbolicLink()) {
    throw new Error("~/.wingman is not a symlink — not removing it.");
  }
  unlinkSync(GLOBAL_WINGMAN);
}
