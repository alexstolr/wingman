import { spawn, execSync } from "child_process";
import type { Automation, Session, SessionEvent } from "./types.js";
import { readStore, writeStore } from "./store.js";

const running = new Map<string, ReturnType<typeof spawn>>();

export function runAutomation(automation: Automation): Session {
  const cmd = buildCommand(automation);
  const session: Session = {
    id: crypto.randomUUID(),
    automationId: automation.id,
    automationName: automation.name,
    command: cmd,
    startedAt: new Date().toISOString(),
    status: "running",
    output: "",
    sync: automation.sync,
  };

  const sessions = readStore<Session[]>("sessions.json", []);
  sessions.unshift(session);
  writeStore("sessions.json", sessions);

  if (automation.sync) {
    runSync(cmd, session.id);
  } else {
    runAsync(cmd, session.id, automation.taskType);
  }

  return session;
}

// ── Command builders ──────────────────────────────────────────────────────────

function buildCommand(automation: Automation): string {
  const prompt = automation.command.replace(/"/g, '\\"');
  const cwd = automation.cwd?.trim();

  switch (automation.taskType) {
    case "claude":
      // stream-json gives us text blocks, tool calls, thinking, and cost
      return `claude -p "${prompt}" --output-format stream-json`;

    case "grok":
      return [
        `grok -p "${prompt}"`,
        "--yolo",
        "--output-format json",
        cwd ? `--cwd "${cwd}"` : "",
      ].filter(Boolean).join(" ");

    case "codex":
      return `codex -q "${prompt}"`;

    case "cursor":
      return `cursor "${prompt}"`;

    default:
      return `${automation.taskType} "${prompt}"`;
  }
}

// ── Event parsing ─────────────────────────────────────────────────────────────

type RawEvent = Record<string, unknown>;

function parseToSessionEvents(raw: RawEvent, ts: string, taskType: string): SessionEvent[] {
  const events: SessionEvent[] = [];

  if (taskType === "claude") {
    if (raw.type === "assistant") {
      const content = ((raw.message as RawEvent)?.content ?? []) as RawEvent[];
      for (const block of content) {
        if (block.type === "text" && block.text) {
          events.push({ type: "text", text: String(block.text), ts });
        } else if (block.type === "tool_use") {
          events.push({
            type: "tool_call",
            toolName: String(block.name ?? ""),
            toolInput: JSON.stringify(block.input, null, 2),
            ts,
          });
        } else if (block.type === "thinking") {
          events.push({ type: "thinking", text: String(block.thinking ?? ""), ts });
        }
      }
    } else if (raw.type === "user") {
      const content = ((raw.message as RawEvent)?.content ?? []) as RawEvent[];
      for (const block of content) {
        if (block.type === "tool_result") {
          const resultContent = Array.isArray(block.content)
            ? (block.content as RawEvent[]).map((c) => String(c.text ?? "")).join("\n")
            : String(block.content ?? "");
          events.push({
            type: "tool_result",
            toolResult: resultContent,
            isError: Boolean(block.is_error),
            ts,
          });
        }
      }
    } else if (raw.type === "result") {
      events.push({
        type: "result",
        text: String(raw.result ?? raw.error ?? ""),
        cost: typeof raw.cost_usd === "number" ? raw.cost_usd : undefined,
        durationMs: typeof raw.duration_ms === "number" ? raw.duration_ms : undefined,
        isError: Boolean(raw.is_error),
        ts,
      });
    }
    // Skip "system" events — just init noise
  } else if (taskType === "grok") {
    // Grok outputs a single JSON object: { text, thought, stopReason, sessionId, requestId }
    if (raw.thought) {
      events.push({ type: "thinking", text: String(raw.thought), ts });
    }
    if (raw.text) {
      events.push({ type: "text", text: String(raw.text), ts });
    }
    // Treat the whole object as a result summary
    events.push({
      type: "result",
      text: String(raw.stopReason ?? ""),
      ts,
    });
  }

  return events;
}

// ── Execution ─────────────────────────────────────────────────────────────────

function runSync(cmd: string, sessionId: string) {
  const escaped = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `osascript -e 'tell application "Terminal" to do script "${escaped}"'`;
  try {
    execSync(script);
    updateSession(sessionId, { status: "completed", endedAt: new Date().toISOString() });
  } catch (err) {
    updateSession(sessionId, { status: "failed", endedAt: new Date().toISOString(), output: String(err) });
  }
}

function runAsync(cmd: string, sessionId: string, taskType: string) {
  const child = spawn("bash", ["-c", cmd], { stdio: "pipe" });
  running.set(sessionId, child);
  updateSession(sessionId, { pid: child.pid });

  let output = "";
  let lineBuffer = "";
  let events: SessionEvent[] = [];
  const isStructured = taskType === "claude" || taskType === "grok";

  function applyEvents(newEvents: SessionEvent[]) {
    if (!newEvents.length) return;
    events = [...events, ...newEvents];
    const resultEvent = newEvents.find((e) => e.type === "result" && e.cost !== undefined);
    updateSession(sessionId, {
      events,
      ...(resultEvent?.cost !== undefined ? { cost: resultEvent.cost } : {}),
    });
  }

  // Called for each newline-delimited chunk (Claude stream-json)
  function processLine(line: string) {
    if (!isStructured || !line.trim()) return;
    try {
      applyEvents(parseToSessionEvents(JSON.parse(line) as RawEvent, new Date().toISOString(), taskType));
    } catch { /* not a complete JSON line */ }
  }

  // Called once at the end — handles tools that emit a single JSON blob (Grok)
  function processFullOutput() {
    if (!isStructured || events.length > 0) return; // already parsed incrementally
    const trimmed = output.trim();
    if (!trimmed) return;
    try {
      applyEvents(parseToSessionEvents(JSON.parse(trimmed) as RawEvent, new Date().toISOString(), taskType));
    } catch { /* not JSON, leave as raw */ }
  }

  child.stdout?.on("data", (data: Buffer) => {
    const chunk = data.toString();
    output += chunk;
    lineBuffer += chunk;
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop() ?? "";
    lines.forEach(processLine);
    updateSession(sessionId, { output });
  });

  child.stderr?.on("data", (data: Buffer) => {
    output += data.toString();
    updateSession(sessionId, { output });
  });

  child.on("close", (code: number | null) => {
    if (lineBuffer.trim()) processLine(lineBuffer);
    processFullOutput();
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
  updateSession(sessionId, { status: "stopped", endedAt: new Date().toISOString() });
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
