import { useState, useEffect } from "react";
import { Square, ChevronDown, ChevronRight } from "lucide-react";
import type { Session } from "../types";

const STATUS_STYLES: Record<Session["status"], string> = {
  running: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  stopped: "bg-gray-100 text-gray-500",
};

function formatDuration(startedAt: string, endedAt?: string): string {
  const end = endedAt ? new Date(endedAt) : new Date();
  const diff = end.getTime() - new Date(startedAt).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    setSessions(await res.json());
  }

  async function stopSession(id: string) {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    fetchSessions();
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Sessions</h1>

      {sessions.length === 0 ? (
        <p className="text-center py-20 text-sm text-gray-400">
          No sessions yet. Run an automation to see sessions here.
        </p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {sessions.map((session) => (
            <div key={session.id}>
              <div className="flex items-center gap-4 px-4 py-3 text-sm bg-white hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => toggleExpanded(session.id)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  {expanded.has(session.id) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>

                <span className="font-medium text-gray-900 flex-1 truncate">
                  {session.automationName}
                </span>

                <span className="text-gray-400 text-xs flex-shrink-0">
                  {new Date(session.startedAt).toLocaleString()}
                </span>

                <span className="text-gray-400 text-xs w-12 text-right flex-shrink-0">
                  {formatDuration(session.startedAt, session.endedAt)}
                </span>

                <span className="text-gray-400 text-xs flex-shrink-0">
                  {session.sync ? "sync" : "async"}
                </span>

                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${STATUS_STYLES[session.status]}`}
                >
                  {session.status}
                </span>

                {session.status === "running" && !session.sync ? (
                  <button
                    onClick={() => stopSession(session.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Stop session"
                  >
                    <Square size={13} />
                  </button>
                ) : (
                  <div className="w-[13px] flex-shrink-0" />
                )}
              </div>

              {expanded.has(session.id) && (
                <div className="border-t border-gray-100 bg-gray-950 px-4 py-3">
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                    {session.output ||
                      (session.sync ? "(ran in terminal — no output captured)" : "(no output)")}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
