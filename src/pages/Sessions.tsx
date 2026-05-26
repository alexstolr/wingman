import { useState, useEffect, useRef } from "react";
import { Square, Terminal } from "lucide-react";
import type { Session } from "../types";

const STATUS_STYLES: Record<Session["status"], { badge: string; dot: string }> = {
  running:   { badge: "bg-blue-50 text-blue-700",   dot: "bg-blue-500 animate-pulse" },
  completed: { badge: "bg-green-50 text-green-700", dot: "bg-green-500" },
  failed:    { badge: "bg-red-50 text-red-700",     dot: "bg-red-500" },
  stopped:   { badge: "bg-gray-100 text-gray-500",  dot: "bg-gray-400" },
};

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

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const hasRunning = sessions.some((s) => s.status === "running");

  // Poll faster when something is running
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, hasRunning ? 1500 : 5000);
    return () => clearInterval(interval);
  }, [hasRunning]);

  // Auto-scroll output when selected session is running
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sessions, selectedId]);

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    const data: Session[] = await res.json();
    setSessions(data);
    // Auto-select first if none selected
    setSelectedId((prev) => prev ?? data[0]?.id ?? null);
  }

  async function killSession(id: string) {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    fetchSessions();
  }

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar — session list */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Sessions</span>
          {hasRunning && (
            <span className="ml-2 text-xs text-blue-500">{sessions.filter(s => s.status === "running").length} running</span>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 px-4">
              No sessions yet.<br />Run an automation to start one.
            </p>
          ) : (
            sessions.map((session) => {
              const { dot, badge } = STATUS_STYLES[session.status];
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${badge}`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 pl-3.5">
                    <span>{formatDate(session.startedAt)}</span>
                    <span>·</span>
                    <span>{formatDuration(session.startedAt, session.endedAt)}</span>
                    <span>·</span>
                    <span>{session.sync ? "sync" : "async"}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Detail panel */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">{selected.automationName}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span>{formatDate(selected.startedAt)}</span>
                <span>·</span>
                <span>{formatDuration(selected.startedAt, selected.endedAt)}</span>
                <span>·</span>
                <span>{selected.sync ? "sync" : "async"}</span>
                {selected.pid && <><span>·</span><span>pid {selected.pid}</span></>}
              </div>
            </div>

            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[selected.status].badge}`}>
              {selected.status}
            </span>

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

          {/* Output */}
          <div className="flex-1 bg-gray-950 overflow-hidden flex flex-col">
            {selected.sync ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Sync session — output was shown in terminal.
              </div>
            ) : selected.output ? (
              <pre
                ref={outputRef}
                className="flex-1 overflow-y-auto text-xs text-gray-200 font-mono leading-relaxed p-5 whitespace-pre-wrap"
              >
                {selected.output}
                {selected.status === "running" && (
                  <span className="inline-block w-2 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                )}
              </pre>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                {selected.status === "running" ? "Waiting for output…" : "No output captured."}
              </div>
            )}
          </div>
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
