import { useState, useEffect } from "react";
import { Plus, Play, Trash2, X } from "lucide-react";
import cronstrue from "cronstrue";
import { CronExpressionParser } from "cron-parser";
import type { Automation } from "../types";

const TIMEZONES = [
  { value: "Asia/Jerusalem",      label: "Israel (Asia/Jerusalem)" },
  { value: "UTC",                 label: "UTC" },
  { value: "America/New_York",    label: "US Eastern" },
  { value: "America/Chicago",     label: "US Central" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "Europe/London",       label: "London" },
  { value: "Europe/Paris",        label: "Paris" },
  { value: "Europe/Berlin",       label: "Berlin" },
  { value: "Asia/Dubai",          label: "Dubai" },
  { value: "Asia/Tokyo",          label: "Tokyo" },
  { value: "Australia/Sydney",    label: "Sydney" },
];

function describeCron(expr: string, tz: string): { utc: string; local: string } | null {
  try {
    const utc = cronstrue.toString(expr, { use24HourTimeFormat: false, verbose: false });
    const next = CronExpressionParser.parse(expr, { tz: "UTC" }).next().toDate();
    const local = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(next);
    return { utc, local };
  } catch {
    return null;
  }
}

const AI_TOOLS = [
  { value: "claude", label: "Claude Code" },
  { value: "grok",   label: "Grok CLI" },
  { value: "cursor", label: "Cursor" },
  { value: "codex",  label: "Codex" },
] as const;

const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  AI_TOOLS.map(({ value, label }) => [value, label])
);

const EMPTY_FORM = {
  name: "",
  scheduleType: "cron" as const,
  schedule: "",
  taskType: "claude" as const,
  command: "",
  cwd: "",
  sync: false,
  enabled: true,
};

export default function Automations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Jerusalem");

  useEffect(() => {
    fetchAutomations();
  }, []);

  async function fetchAutomations() {
    const res = await fetch("/api/automations");
    setAutomations(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    setShowForm(false);
    setForm(EMPTY_FORM);
    fetchAutomations();
  }

  async function deleteAutomation(id: string) {
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    fetchAutomations();
  }

  async function toggleAutomation(id: string) {
    await fetch(`/api/automations/${id}/toggle`, { method: "PATCH" });
    fetchAutomations();
  }

  async function runAutomation(id: string) {
    await fetch(`/api/automations/${id}/run`, { method: "POST" });
  }

  return (
    <div className="px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Automations</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <p className="text-center py-20 text-sm text-gray-400">
          No automations yet. Create one to get started.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Schedule</th>
              <th className="pb-3 font-medium">Task</th>
              <th className="pb-3 font-medium">Working dir</th>
              <th className="pb-3 font-medium">Execution</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {automations.map((a) => (
              <tr key={a.id} className="group">
                <td className="py-3 font-medium text-gray-900">{a.name}</td>
                <td className="py-3 text-gray-500 capitalize">{a.scheduleType}</td>
                <td className="py-3 text-gray-500 font-mono text-xs">{a.schedule}</td>
                <td className="py-3 text-gray-500">{TOOL_LABELS[a.taskType] ?? a.taskType}</td>
                <td className="py-3 text-gray-400 font-mono text-xs max-w-[160px] truncate" title={a.cwd}>{a.cwd || "—"}</td>
                <td className="py-3 text-gray-500">{a.sync ? "Sync" : "Async"}</td>
                <td className="py-3">
                  <button
                    onClick={() => toggleAutomation(a.id)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      a.enabled
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {a.enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => runAutomation(a.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors"
                    >
                      <Play size={11} />
                      Run now
                    </button>
                    <button
                      onClick={() => deleteAutomation(a.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">New Automation</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Type
                </label>
                <div className="flex gap-2">
                  {(["cron", "scheduled"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, scheduleType: t, schedule: "" }))}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                        form.scheduleType === t
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.scheduleType === "cron" ? "Cron Expression" : "Run At"}
                </label>
                {form.scheduleType === "cron" ? (
                  <div className="space-y-2">
                    <input
                      required
                      value={form.schedule}
                      onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="0 9 * * *"
                    />
                    {form.schedule && (() => {
                      const desc = describeCron(form.schedule, timezone);
                      if (!desc) {
                        return (
                          <p className="text-xs text-red-500 pl-1">Invalid cron expression</p>
                        );
                      }
                      return (
                        <div className="pl-1 space-y-1">
                          <p className="text-xs text-gray-500">
                            {desc.utc}{" "}
                            <span className="text-gray-400 font-medium">· UTC</span>
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>= {desc.local} ·</span>
                            <select
                              value={timezone}
                              onChange={(e) => setTimezone(e.target.value)}
                              className="text-xs text-gray-600 border-0 bg-transparent focus:outline-none cursor-pointer hover:text-gray-900"
                            >
                              {TIMEZONES.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <input
                    required
                    type="datetime-local"
                    value={form.schedule}
                    onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Tool</label>
                <select
                  value={form.taskType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      taskType: e.target.value as typeof form.taskType,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  {AI_TOOLS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions / Prompt
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.command}
                  onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Summarize today's AI news and save a report to ~/reports/ai-news.md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working directory
                  {form.taskType === "grok" && (
                    <span className="ml-2 text-xs font-normal text-gray-400">passed as <code className="font-mono">--cwd</code></span>
                  )}
                </label>
                <input
                  value={form.cwd}
                  onChange={(e) => setForm((f) => ({ ...f, cwd: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="/Users/you/Workspace/my-repo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Execution</label>
                <div className="flex gap-2">
                  {(
                    [
                      [false, "Async — background"],
                      [true, "Sync — open terminal"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, sync: val }))}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        form.sync === val
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
