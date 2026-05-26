import cron from "node-cron";
import type { Automation, Session } from "./types.js";
import { readStore, writeStore } from "./store.js";
import { runAutomation } from "./runner.js";

const cronJobs = new Map<string, cron.ScheduledTask>();
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

export function initScheduler() {
  // Mark any sessions left in 'running' state from a previous server instance as stopped
  const sessions = readStore<Session[]>("sessions.json", []);
  const cleaned = sessions.map((s) =>
    s.status === "running"
      ? { ...s, status: "stopped" as const, endedAt: new Date().toISOString() }
      : s
  );
  writeStore("sessions.json", cleaned);

  // Re-register cron/scheduled jobs for all enabled automations
  const automations = readStore<Automation[]>("automations.json", []);
  for (const automation of automations) {
    if (automation.enabled) scheduleAutomation(automation);
  }

  console.log(`Scheduler initialized with ${automations.filter((a) => a.enabled).length} active automation(s).`);
}

export function scheduleAutomation(automation: Automation) {
  unscheduleAutomation(automation.id);
  if (!automation.enabled) return;

  if (automation.scheduleType === "cron") {
    if (!cron.validate(automation.schedule)) {
      console.warn(`Invalid cron expression for "${automation.name}": ${automation.schedule}`);
      return;
    }
    const job = cron.schedule(automation.schedule, () => runAutomation(automation));
    cronJobs.set(automation.id, job);
  } else {
    const delay = new Date(automation.schedule).getTime() - Date.now();
    if (delay <= 0) return;

    const timeout = setTimeout(() => {
      runAutomation(automation);
      // Disable one-time automation after it fires
      const automations = readStore<Automation[]>("automations.json", []);
      const idx = automations.findIndex((a) => a.id === automation.id);
      if (idx !== -1) {
        automations[idx].enabled = false;
        writeStore("automations.json", automations);
      }
      timeouts.delete(automation.id);
    }, delay);

    timeouts.set(automation.id, timeout);
  }
}

export function unscheduleAutomation(id: string) {
  cronJobs.get(id)?.destroy();
  cronJobs.delete(id);
  const t = timeouts.get(id);
  if (t !== undefined) {
    clearTimeout(t);
    timeouts.delete(id);
  }
}
