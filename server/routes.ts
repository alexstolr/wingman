import { Router } from "express";
import type { Request, Response } from "express";
import type { Automation, Session } from "./types.js";
import { readStore, writeStore } from "./store.js";
import { runAutomation, stopSession } from "./runner.js";
import { scheduleAutomation, unscheduleAutomation } from "./scheduler.js";
import { getWingmanStatus, activate, deactivate } from "./wingman.js";

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
