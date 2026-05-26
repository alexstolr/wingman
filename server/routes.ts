import { Router } from "express";
import type { Request, Response } from "express";
import type { Automation, Session } from "./types.js";
import { readStore, writeStore } from "./store.js";
import { runAutomation, stopSession } from "./runner.js";
import { scheduleAutomation, unscheduleAutomation } from "./scheduler.js";
import { getWingmanStatus, activate, deactivate } from "./wingman.js";
import { scanCapabilities, clearCache } from "./scanner.js";
import { readFileSync, existsSync, unlinkSync, realpathSync } from "fs";
import { listMarketplace, installEntry, uninstallEntry } from "./marketplace.js";

export const router = Router();

// ── Settings ─────────────────────────────────────────────────────────────────

router.get("/settings", (_req: Request, res: Response) => {
  res.json(readStore("settings.json", { workspacePath: "" }));
});

router.post("/settings", (req: Request, res: Response) => {
  const current = readStore("settings.json", { workspacePath: "" });
  const updated = { ...current, ...req.body };
  writeStore("settings.json", updated);
  res.json(updated);
});

// ── Wingman activation ────────────────────────────────────────────────────────

router.get("/wingman/status", (_req: Request, res: Response) => {
  res.json(getWingmanStatus());
});

router.post("/wingman/activate", (_req: Request, res: Response) => {
  try {
    activate();
    res.json(getWingmanStatus());
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/wingman/deactivate", (_req: Request, res: Response) => {
  try {
    deactivate();
    res.json(getWingmanStatus());
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── Capabilities ─────────────────────────────────────────────────────────────

router.get("/capabilities", (_req: Request, res: Response) => {
  const force = _req.query.refresh === "true";
  res.json(scanCapabilities(force));
});

router.get("/capabilities/content", (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "Missing path query param." });
    return;
  }
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File not found." });
    return;
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/capabilities", (req: Request, res: Response) => {
  const filePath = req.body?.path as string;
  if (!filePath) { res.status(400).json({ error: "Missing path." }); return; }
  if (!filePath.includes(".wingman")) {
    res.status(403).json({ error: "Only managed (.wingman) capabilities can be deleted." });
    return;
  }
  if (!existsSync(filePath)) { res.status(404).json({ error: "File not found." }); return; }

  // Resolve real path BEFORE deleting — realpathSync fails on missing files.
  let realDeleted: string;
  try { realDeleted = realpathSync(filePath); } catch { realDeleted = filePath; }

  try {
    unlinkSync(filePath);
  } catch (err) {
    res.status(500).json({ error: String(err) }); return;
  }

  // Clean up installed.json if this file was installed from the marketplace.
  // Compare resolved paths because the UI path (~/.wingman/…) differs from
  // the stored physical path ({repo}/.wingman/…) even though they're the same file.
  type InstalledRecord = { version: string; installedAt: string; path: string };
  const installed = readStore<Record<string, InstalledRecord>>("installed.json", {});
  const id = Object.keys(installed).find((k) => {
    let realStored: string;
    try { realStored = realpathSync(installed[k].path); } catch { realStored = installed[k].path; }
    return realStored === realDeleted;
  });
  if (id) {
    delete installed[id];
    writeStore("installed.json", installed);
  }

  clearCache();
  res.json({ ok: true });
});

// ── Marketplace ──────────────────────────────────────────────────────────────

router.get("/marketplace", (_req: Request, res: Response) => {
  res.json(listMarketplace());
});

router.post("/marketplace/:id/install", (req: Request, res: Response) => {
  try {
    const record = installEntry(req.params.id, req.body.version);
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/marketplace/:id/upgrade", (req: Request, res: Response) => {
  try {
    const record = installEntry(req.params.id, req.body.version);
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/marketplace/:id", (req: Request, res: Response) => {
  try {
    uninstallEntry(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── Automations ──────────────────────────────────────────────────────────────

router.get("/automations", (_req: Request, res: Response) => {
  res.json(readStore<Automation[]>("automations.json", []));
});

router.post("/automations", (req: Request, res: Response) => {
  const automations = readStore<Automation[]>("automations.json", []);
  const automation: Automation = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  automations.unshift(automation);
  writeStore("automations.json", automations);
  scheduleAutomation(automation);
  res.status(201).json(automation);
});

router.delete("/automations/:id", (req: Request, res: Response) => {
  const automations = readStore<Automation[]>("automations.json", []);
  writeStore(
    "automations.json",
    automations.filter((a) => a.id !== req.params.id)
  );
  unscheduleAutomation(req.params.id);
  res.status(204).end();
});

router.patch("/automations/:id/toggle", (req: Request, res: Response) => {
  const automations = readStore<Automation[]>("automations.json", []);
  const idx = automations.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  automations[idx].enabled = !automations[idx].enabled;
  writeStore("automations.json", automations);
  if (automations[idx].enabled) {
    scheduleAutomation(automations[idx]);
  } else {
    unscheduleAutomation(req.params.id);
  }
  res.json(automations[idx]);
});

router.post("/automations/:id/run", (req: Request, res: Response) => {
  const automations = readStore<Automation[]>("automations.json", []);
  const automation = automations.find((a) => a.id === req.params.id);
  if (!automation) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const session = runAutomation(automation);
  res.status(201).json(session);
});

// ── Sessions ─────────────────────────────────────────────────────────────────

router.get("/sessions", (_req: Request, res: Response) => {
  res.json(readStore<Session[]>("sessions.json", []));
});

router.get("/sessions/:id", (req: Request, res: Response) => {
  const sessions = readStore<Session[]>("sessions.json", []);
  const session = sessions.find((s) => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(session);
});

router.delete("/sessions/:id", (req: Request, res: Response) => {
  const stopped = stopSession(req.params.id);
  if (!stopped) {
    const sessions = readStore<Session[]>("sessions.json", []);
    const session = sessions.find((s) => s.id === req.params.id);
    if (!session) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (session.status !== "running") {
      res.status(400).json({ error: "Session is not running" });
      return;
    }
  }
  res.status(204).end();
});
