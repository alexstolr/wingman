import { useState, useEffect } from "react";
import { Plus, Play, Trash2, X, Pencil, Info, ChevronDown } from "lucide-react";
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

type ModelSpec = { value: string; label: string; tier: "fast" | "balanced" | "powerful"; cost: string; desc: string };

const MODELS_BY_PROVIDER: Partial<Record<string, ModelSpec[]>> = {
  claude: [
    { value: "",                   label: "Default",      tier: "balanced",  cost: "Sonnet pricing",   desc: "Uses whatever the Claude CLI defaults to (currently Sonnet 4.6). Safe choice if you're unsure." },
    { value: "claude-haiku-4-5",   label: "Haiku 4.5",   tier: "fast",      cost: "$0.80 / $4 per M", desc: "Fastest and cheapest Claude model. Best for simple, high-frequency tasks where cost matters." },
    { value: "claude-sonnet-4-6",  label: "Sonnet 4.6",  tier: "balanced",  cost: "$3 / $15 per M",   desc: "Balanced intelligence and speed. Good default for most automation tasks." },
    { value: "claude-opus-4-5",    label: "Opus 4.5",    tier: "powerful",  cost: "$15 / $75 per M",  desc: "Most intelligent Claude model. Best for complex, nuanced tasks requiring deep reasoning." },
  ],
  grok: [
    { value: "",          label: "Default",    tier: "balanced", cost: "Varies",            desc: "Uses the Grok CLI's current default model." },
    { value: "grok-3-mini", label: "Grok 3 Mini", tier: "fast",  cost: "$0.30 / $0.50 per M", desc: "Fast and affordable xAI model with thinking mode. Good for structured reasoning at low cost." },
    { value: "grok-3",    label: "Grok 3",     tier: "powerful", cost: "$3 / $15 per M",   desc: "xAI's flagship model. Strong at coding, math, and long-context analysis." },
  ],
};

const TIER_STYLE: Record<ModelSpec["tier"], string> = {
  fast:      "bg-green-50 border-green-200 text-green-800",
  balanced:  "bg-blue-50 border-blue-200 text-blue-800",
  powerful:  "bg-purple-50 border-purple-200 text-purple-800",
};

const EMPTY_FORM = {
  name: "",
  scheduleType: "cron" as const,
  schedule: "",
  taskType: "claude" as const,
  command: "",
  cwd: "",
  model: "claude-haiku-4-5",
  allowSubagents: false,
  sync: false,
  enabled: true,
};

export default function Automations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Jerusalem");

  useEffect(() => {
    fetchAutomations();
  }, []);

  async function fetchAutomations() {
    const res = await fetch("/api/automations");
    setAutomations(await res.json());
  }

  function openEdit(a: Automation) {
    setForm({
      name: a.name,
      scheduleType: a.scheduleType,
      schedule: a.schedule,
      taskType: a.taskType,
      command: a.command,
      cwd: a.cwd ?? "",
      model: a.model ?? "claude-haiku-4-5",
      allowSubagents: a.allowSubagents ?? false,
      sync: a.sync,
      enabled: a.enabled,
    });
    setEditingId(a.id);
    setShowForm(true);
    // Auto-expand settings if any non-default values are present
    setShowSettings(!!(a.model || a.cwd || a.sync || a.allowSubagents));
  }

  function closeForm() {
    setShowForm(false);
    setShowSettings(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (editingId) {
      await fetch(`/api/automations/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSubmitting(false);
    closeForm();
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
          onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}
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
                      onClick={() => openEdit(a)}
                      className="text-gray-300 hover:text-gray-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Automation" : "New Automation"}
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
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

              {/* ── Harness + collapsible settings ── */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Harness row — always visible */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50">
                  <label className="text-sm font-medium text-gray-700 flex-shrink-0">Harness</label>
                  <select
                    value={form.taskType}
                    onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value as typeof form.taskType }))}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  >
                    {AI_TOOLS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowSettings((v) => !v)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
                  >
                    Settings
                    <ChevronDown size={13} className={`transition-transform duration-200 ${showSettings ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* Collapsible settings */}
                {showSettings && (
                  <div className="px-3 py-3 space-y-4 border-t border-gray-200">
                    {/* Model */}
                    {MODELS_BY_PROVIDER[form.taskType] && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Model</label>
                        <div className="flex flex-wrap gap-2">
                          {MODELS_BY_PROVIDER[form.taskType]!.map((m) => {
                            const selected = form.model === m.value;
                            return (
                              <button
                                key={m.value || "__default__"}
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, model: m.value }))}
                                className={[
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors",
                                  selected
                                    ? `${TIER_STYLE[m.tier]} font-medium shadow-sm`
                                    : "border-gray-200 text-gray-600 hover:border-gray-400 bg-white",
                                ].join(" ")}
                              >
                                {m.label}
                                <div className="relative group">
                                  <Info size={12} className={selected ? "opacity-60" : "text-gray-400"} />
                                  <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 w-56 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl">
                                    <p className="font-semibold mb-1">{m.label}</p>
                                    <p className="text-gray-300 leading-relaxed mb-2">{m.desc}</p>
                                    <p className="text-gray-400 font-mono">{m.cost}</p>
                                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-gray-900 rotate-45" />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sub-agents */}
                    {form.taskType === "claude" && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.allowSubagents}
                          onClick={() => setForm((f) => ({ ...f, allowSubagents: !f.allowSubagents }))}
                          className={[
                            "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                            form.allowSubagents ? "bg-gray-900" : "bg-gray-200",
                          ].join(" ")}
                        >
                          <span className={[
                            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200",
                            form.allowSubagents ? "translate-x-4" : "translate-x-0",
                          ].join(" ")} />
                        </button>
                        <span className="text-sm text-gray-700">Sub-agents</span>
                        <div className="relative group">
                          <Info size={13} className="text-gray-400 cursor-help" />
                          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 w-64 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl">
                            <p className="font-semibold mb-1">Sub-agents (Task tool)</p>
                            <p className="text-gray-300 leading-relaxed mb-2">When enabled, Claude can spin up a second Claude instance for sub-tasks — better for complex prompts.</p>
                            <p className="text-gray-300 leading-relaxed">Disable for simple tasks to cut cost and avoid unnecessary delegation.</p>
                            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-gray-900 rotate-45" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Working directory */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Working directory
                        {form.taskType === "grok" && (
                          <span className="ml-2 normal-case font-normal text-gray-400">passed as <code className="font-mono">--cwd</code></span>
                        )}
                      </label>
                      <input
                        value={form.cwd}
                        onChange={(e) => setForm((f) => ({ ...f, cwd: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                        placeholder="/Users/you/Workspace/my-repo"
                      />
                    </div>

                    {/* Execution */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Execution</label>
                      <div className="flex gap-2">
                        {([
                          [false, "Async — background"],
                          [true, "Sync — open terminal"],
                        ] as const).map(([val, label]) => (
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
                  </div>
                )}
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

            </div>{/* end scroll area */}

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (editingId ? "Saving…" : "Creating…") : (editingId ? "Save" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
