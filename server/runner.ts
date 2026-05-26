import { spawn, execSync } from "child_process";
import type { Automation, Session } from "./types.js";
import { readStore, writeStore } from "./store.js";

const running = new Map<string, ReturnType<typeof spawn>>();

export function runAutomation(automation: Automation): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    automationId: automation.id,
    automationName: automation.name,
    startedAt: new Date().toISOString(),
    status: "running",
    output: "",
    sync: automation.sync,
  };

  const sessions = readStore<Session[]>("sessions.json", []);
  sessions.unshift(session);
  writeStore("sessions.json", sessions);

  if (automation.sync) {
    runSync(automation, session.id);
  } else {
    runAsync(automation, session.id);
  }

  return session;
}

const CLI: Record<Automation["taskType"], string> = {
  claude: "claude --print",
  grok: "grok",
  cursor: "cursor",
  codex: "codex",
};

function buildCommand(automation: Automation): string {
  const escaped = automation.command.replace(/"/g, '\\"');
  return `${CLI[automation.taskType]} "${escaped}"`;
}

function runSync(automation: Automation, sessionId: string) {
  const cmd = buildCommand(automation);
  const escaped = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `osascript -e 'tell application "Terminal" to do script "${escaped}"'`;

  try {
    execSync(script);
    updateSession(sessionId, {
      status: "completed",
      endedAt: new Date().toISOString(),
    });
  } catch (err) {
    updateSession(sessionId, {
      status: "failed",
      endedAt: new Date().toISOString(),
      output: String(err),
    });
  }
}

function runAsync(automation: Automation, sessionId: string) {
  const cmd = buildCommand(automation);
  const child = spawn("bash", ["-c", cmd], { stdio: "pipe" });

  running.set(sessionId, child);
  updateSession(sessionId, { pid: child.pid });

  let output = "";

  child.stdout?.on("data", (data: Buffer) => {
    output += data.toString();
    updateSession(sessionId, { output });
  });

  child.stderr?.on("data", (data: Buffer) => {
    output += data.toString();
    updateSession(sessionId, { output });
  });

  child.on("close", (code: number | null) => {
    running.delete(sessionId);
    updateSession(sessionId, {
      status: code === 0 ? "completed" : "failed",
      endedAt: new Date().toISOString(),
    });
  });
}

export function stopSession(sessionId: string): boolean {
  const proc = running.get(sessionId);
  if (!proc) return false;
  proc.kill("SIGTERM");
  running.delete(sessionId);
  updateSession(sessionId, {
    status: "stopped",
    endedAt: new Date().toISOString(),
  });
  return true;
}

function updateSession(id: string, updates: Partial<Session>) {
  const sessions = readStore<Session[]>("sessions.json", []);
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx !== -1) {
    sessions[idx] = { ...sessions[idx], ...updates };
    writeStore("sessions.json", sessions);
  }
}
