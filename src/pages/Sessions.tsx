import { useState, useEffect, useRef } from "react";
import {
  Square, Terminal, CheckCircle, XCircle, CircleDot, StopCircle,
  Bot, Wrench, ChevronDown, ChevronRight, Brain, DollarSign, Code,
} from "lucide-react";
import type { Session, SessionEvent } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(startedAt: string, endedAt?: string): string {
  const diff = (endedAt ? new Date(endedAt) : new Date()).getTime() - new Date(startedAt).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const STATUS_META: Record<Session["status"], {
  label: string; dot: string; banner: string;
  Icon: React.ElementType; iconClass: string;
}> = {
  running:   { label: "Running",   dot: "bg-blue-500 animate-pulse",  banner: "bg-blue-50 border-blue-100",   Icon: CircleDot,   iconClass: "text-blue-500 animate-pulse" },
  completed: { label: "Completed", dot: "bg-green-500",               banner: "bg-green-50 border-green-100", Icon: CheckCircle, iconClass: "text-green-600" },
  failed:    { label: "Failed",    dot: "bg-red-500",                  banner: "bg-red-50 border-red-100",     Icon: XCircle,     iconClass: "text-red-500" },
  stopped:   { label: "Stopped",   dot: "bg-gray-400",                 banner: "bg-gray-50 border-gray-200",   Icon: StopCircle,  iconClass: "text-gray-400" },
};

// ── Event renderers ───────────────────────────────────────────────────────────

function Collapsible({ label, children, defaultOpen = false }: {
  label: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors mb-1">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {label}
      </button>
      {open && children}
    </div>
  );
}

function EventRow({ event, index }: { event: SessionEvent; index: number }) {
  switch (event.type) {
    case "text":
      return (
        <div key={index} className="flex gap-3 py-3">
          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bot size={11} className="text-purple-600" />
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap flex-1">{event.text}</p>
        </div>
      );

    case "thinking":
      return (
        <div key={index} className="flex gap-3 py-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Brain size={11} className="text-gray-500" />
          </div>
          <div className="flex-1">
            <Collapsible label={<span className="italic">Thinking…</span>}>
              <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded p-2 border border-gray-100">{event.text}</p>
            </Collapsible>
          </div>
        </div>
      );

    case "tool_call":
      return (
        <div key={index} className="flex gap-3 py-2">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Wrench size={11} className="text-amber-600" />
          </div>
          <div className="flex-1 border border-amber-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200">
              <Code size={11} className="text-amber-700" />
              <span className="text-xs font-mono font-semibold text-amber-800">{event.toolName}</span>
            </div>
            {event.toolInput && (
              <Collapsible label="Input">
                <pre className="text-xs text-gray-700 px-3 py-2 font-mono overflow-x-auto whitespace-pre-wrap bg-white max-h-48 overflow-y-auto">{event.toolInput}</pre>
              </Collapsible>
            )}
          </div>
        </div>
      );

    case "tool_result":
      return (
        <div key={index} className="flex gap-3 py-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${event.isError ? "bg-red-100" : "bg-green-100"}`}>
            {event.isError
              ? <XCircle size={11} className="text-red-500" />
              : <CheckCircle size={11} className="text-green-600" />}
          </div>
          <div className={`flex-1 border rounded-lg overflow-hidden ${event.isError ? "border-red-200" : "border-green-200"}`}>
            <div className={`px-3 py-1.5 border-b text-xs font-medium ${event.isError ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
              {event.isError ? "Error" : "Result"}
            </div>
            <Collapsible label="Output" defaultOpen={!!(event.toolResult && event.toolResult.length < 300)}>
              <pre className="text-xs text-gray-700 px-3 py-2 font-mono whitespace-pre-wrap overflow-x-auto bg-white max-h-48 overflow-y-auto">{event.toolResult || "(empty)"}</pre>
            </Collapsible>
          </div>
        </div>
      );

    case "result":
      return (
        <div key={index} className={`flex gap-3 py-3 mt-2 border-t border-gray-100`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${event.isError ? "bg-red-100" : "bg-green-100"}`}>
            {event.isError ? <XCircle size={11} className="text-red-500" /> : <CheckCircle size={11} className="text-green-600" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-semibold text-gray-600">{event.isError ? "Failed" : "Finished"}</span>
              {event.cost !== undefined && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <DollarSign size={10} />
                  ${event.cost.toFixed(4)} USD
                </span>
              )}
              {event.durationMs !== undefined && (
                <span className="text-xs text-gray-400">{(event.durationMs / 1000).toFixed(1)}s</span>
              )}
            </div>
            {event.text && <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.text}</p>}
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rawView, setRawView] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasRunning = sessions.some((s) => s.status === "running");

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, hasRunning ? 1500 : 5000);
    return () => clearInterval(interval);
  }, [hasRunning]);

  // Auto-scroll when new output arrives for running sessions
  useEffect(() => {
    if (rawView) outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
    else bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, selectedId, rawView]);

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    const data: Session[] = await res.json();
    setSessions(data);
    setSelectedId((prev) => prev ?? data[0]?.id ?? null);
  }

  async function killSession(id: string) {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    fetchSessions();
  }

  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  const runningCount = sessions.filter((s) => s.status === "running").length;
  const hasEvents = (selected?.events?.length ?? 0) > 0;
  const hasOutput = hasEvents || !!selected?.output;
  const cost = selected?.cost ?? selected?.events?.find((e) => e.type === "result" && e.cost !== undefined)?.cost;

  return (
    <div className="flex h-full">
      {/* ── Sidebar ── */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Sessions</span>
          {runningCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
              {runningCount} running
            </span>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 px-4">No sessions yet.<br />Run an automation to start one.</p>
          ) : sessions.map((session) => {
            const { dot, label } = STATUS_META[session.status];
            return (
              <button
                key={session.id}
                onClick={() => setSelectedId(session.id)}
                className={[
                  "w-full text-left px-4 py-3 border-b border-gray-100 transition-colors",
                  selectedId === session.id
                    ? "bg-white border-l-2 border-l-gray-900"
                    : "hover:bg-gray-100 border-l-2 border-l-transparent",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                  <span className="text-sm font-medium text-gray-900 truncate flex-1">{session.automationName}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 pl-3.5">
                  <span>{formatDate(session.startedAt)}</span>
                  <span>·</span>
                  <span>{formatDuration(session.startedAt, session.endedAt)}</span>
                  {session.cost !== undefined && (
                    <><span>·</span><span>${session.cost.toFixed(4)}</span></>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Detail ── */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Status banner */}
          {(() => {
            const { banner, Icon, iconClass, label } = STATUS_META[selected.status];
            return (
              <div className={`flex items-center gap-3 px-5 py-3 border-b ${banner}`}>
                <Icon size={18} className={iconClass} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{selected.automationName}</span>
                    <span className="text-sm text-gray-500">{label}</span>
                    {cost !== undefined && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-full border border-gray-200">
                        <DollarSign size={10} />{cost.toFixed(4)} USD
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>Started {formatDate(selected.startedAt)}</span>
                    {selected.endedAt && <><span>·</span><span>Finished {formatDate(selected.endedAt)}</span></>}
                    <span>·</span>
                    <span>{formatDuration(selected.startedAt, selected.endedAt)}</span>
                    {selected.pid && <><span>·</span><span>pid {selected.pid}</span></>}
                  </div>
                </div>
                {/* View toggle — always shown when there's any output */}
                {!selected.sync && hasOutput && (
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0 bg-white">
                    <button onClick={() => setRawView(false)} className={`px-2.5 py-1 transition-colors ${!rawView ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"}`}>Events</button>
                    <button onClick={() => setRawView(true)}  className={`px-2.5 py-1 transition-colors ${rawView  ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"}`}>Raw</button>
                  </div>
                )}
                {selected.status === "running" && !selected.sync && (
                  <button
                    onClick={() => killSession(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
                  >
                    <Square size={11} fill="white" />
                    Kill session
                  </button>
                )}
              </div>
            );
          })()}

          {/* Command */}
          {selected.command && (
            <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex items-start gap-2">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-0.5 flex-shrink-0">CMD</span>
              <code className="text-xs text-gray-600 font-mono break-all">{selected.command}</code>
            </div>
          )}

          {/* Content */}
          {selected.sync ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Sync session — output was shown directly in your terminal.
            </div>
          ) : !rawView && !hasEvents ? (
            /* ── No events yet ── */
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Bot size={32} strokeWidth={1} />
              <p className="text-sm">No structured events captured.</p>
              <p className="text-xs text-gray-300">Events are parsed from Claude and Grok sessions.<br />Switch to Raw to see the plain output.</p>
            </div>
          ) : !rawView && hasEvents ? (
            /* ── Structured event timeline ── */
            <div className="flex-1 overflow-y-auto px-5 py-4 divide-y divide-gray-50">
              {selected.events!.map((event, i) => (
                <EventRow key={i} event={event} index={i} />
              ))}
              {selected.status === "running" && (
                <div className="flex items-center gap-2 py-3 text-xs text-blue-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Running…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            /* ── Raw terminal output ── */
            <>
              <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-2">
                <Terminal size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Raw output</span>
                {selected.status === "running" && (
                  <span className="ml-auto text-xs text-blue-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                    Live
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden bg-gray-950 mx-4 my-3 rounded-xl">
                <pre
                  ref={outputRef}
                  className="h-full overflow-y-auto text-xs text-gray-200 font-mono leading-relaxed p-4 whitespace-pre-wrap"
                >
                  {selected.output || (
                    <span className="text-gray-600">
                      {selected.status === "running" ? "Waiting for output…" : "No output captured."}
                    </span>
                  )}
                  {selected.status === "running" && selected.output && (
                    <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </pre>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
          <Terminal size={40} strokeWidth={1} />
          <p className="text-sm">Select a session to view its output</p>
        </div>
      )}
    </div>
  );
}
