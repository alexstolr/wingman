import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import VersionDiff from "../components/VersionDiff";
import MarkdownPreview from "../components/MarkdownPreview";
import type { CapabilityType } from "../types";

interface CatalogVersion {
  version: string;
  changelog: string;
  content: string;
}

interface MarketplaceEntry {
  id: string;
  name: string;
  type: CapabilityType;
  description: string;
  author: string;
  tags: string[];
  versions: CatalogVersion[];
  installed: boolean;
  installedVersion?: string;
}

interface PreviewModal {
  entry: MarketplaceEntry;
  viewMode: "preview" | "raw" | "diff";
}

const TYPE_FILTERS: { value: CapabilityType | "all"; label: string }[] = [
  { value: "all",         label: "All" },
  { value: "rules",       label: "Rules" },
  { value: "skills",      label: "Skills" },
  { value: "tools",       label: "Tools" },
  { value: "hooks",       label: "Hooks" },
  { value: "agents",      label: "Agents" },
  { value: "conventions", label: "Conventions" },
  { value: "workflows",   label: "Workflows" },
  { value: "prompts",     label: "Prompts" },
  { value: "souls",       label: "Souls" },
  { value: "personas",    label: "Personas" },
];

const TYPE_COLORS: Record<string, string> = {
  rules:       "bg-blue-50 text-blue-600",
  skills:      "bg-violet-50 text-violet-600",
  tools:       "bg-cyan-50 text-cyan-700",
  hooks:       "bg-yellow-50 text-yellow-700",
  agents:      "bg-orange-50 text-orange-600",
  conventions: "bg-pink-50 text-pink-600",
  workflows:   "bg-teal-50 text-teal-700",
  prompts:     "bg-indigo-50 text-indigo-600",
  souls:       "bg-rose-50 text-rose-600",
  personas:    "bg-emerald-50 text-emerald-700",
};

export default function Marketplace() {
  const [entries, setEntries] = useState<MarketplaceEntry[]>([]);
  const [filter, setFilter] = useState<CapabilityType | "all">("all");
  const [pendingVersions, setPendingVersions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<PreviewModal | null>(null);

  useEffect(() => { fetchEntries(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setModal(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch("/api/marketplace");
      const data: MarketplaceEntry[] = await res.json();
      setEntries(data);
      const defaults: Record<string, string> = {};
      for (const e of data) {
        defaults[e.id] = e.versions[e.versions.length - 1].version;
      }
      setPendingVersions(defaults);
    } catch { /* server down */ }
  }

  async function install(id: string) {
    setLoading((l) => ({ ...l, [id]: true }));
    try {
      await fetch(`/api/marketplace/${id}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: pendingVersions[id] }),
      });
      await fetchEntries();
    } finally {
      setLoading((l) => ({ ...l, [id]: false }));
    }
  }

  async function upgrade(id: string) {
    setLoading((l) => ({ ...l, [id]: true }));
    try {
      await fetch(`/api/marketplace/${id}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: pendingVersions[id] }),
      });
      await fetchEntries();
    } finally {
      setLoading((l) => ({ ...l, [id]: false }));
    }
  }

  async function uninstall(id: string) {
    setLoading((l) => ({ ...l, [id]: true }));
    try {
      await fetch(`/api/marketplace/${id}`, { method: "DELETE" });
      await fetchEntries();
    } finally {
      setLoading((l) => ({ ...l, [id]: false }));
    }
  }

  function openModal(entry: MarketplaceEntry) {
    setModal({ entry, viewMode: "preview" });
  }

  // When entries refresh (after install/uninstall), keep modal entry in sync
  useEffect(() => {
    if (!modal) return;
    const updated = entries.find((e) => e.id === modal.entry.id);
    if (updated) setModal((m) => m ? { ...m, entry: updated } : m);
  }, [entries]);

  const visible = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  const modalVersion = modal
    ? (modal.entry.versions.find((v) => v.version === (pendingVersions[modal.entry.id] ?? modal.entry.versions[modal.entry.versions.length - 1].version)) ?? modal.entry.versions[modal.entry.versions.length - 1])
    : null;

  const modalVersionIndex = modal && modalVersion
    ? modal.entry.versions.findIndex((v) => v.version === modalVersion.version)
    : -1;

  const modalPrevVersion = modal && modalVersionIndex > 0
    ? modal.entry.versions[modalVersionIndex - 1]
    : null;

  return (
    <div className="px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Marketplace</h1>

      {/* Filter bar */}
      <div className="flex items-center gap-1 mb-8 flex-wrap">
        {TYPE_FILTERS.map(({ value, label }) => {
          const count = value === "all" ? entries.length : entries.filter((e) => e.type === value).length;
          if (count === 0 && value !== "all") return null;
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filter === value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${filter === value ? "text-gray-300" : "text-gray-400"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {visible.map((entry) => {
          const selectedVersion = pendingVersions[entry.id] ?? entry.versions[entry.versions.length - 1].version;
          const isInstalled = entry.installed;
          const installedVersion = entry.installedVersion;
          const canUpgrade = isInstalled && installedVersion !== selectedVersion;
          const busy = loading[entry.id];

          return (
            <div
              key={entry.id}
              onClick={() => openModal(entry)}
              className="border border-gray-100 rounded-xl px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">{entry.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${TYPE_COLORS[entry.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {entry.type}
                  </span>
                  {isInstalled && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                      v{installedVersion}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{entry.description}</p>
                {entry.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions — stop propagation so clicks here don't open modal */}
              <div
                className="flex items-center gap-2 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <select
                  value={selectedVersion}
                  onChange={(e) => setPendingVersions((p) => ({ ...p, [entry.id]: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  {entry.versions.map((v) => (
                    <option key={v.version} value={v.version}>v{v.version}</option>
                  ))}
                </select>

                {!isInstalled ? (
                  <button
                    onClick={() => install(entry.id)}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    <Download size={12} />
                    Install
                  </button>
                ) : (
                  <>
                    {canUpgrade && (
                      <button
                        onClick={() => upgrade(entry.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                      >
                        <Download size={12} />
                        {selectedVersion > installedVersion! ? "Upgrade" : "Downgrade"}
                      </button>
                    )}
                      <button
                        onClick={() => uninstall(entry.id)}
                        disabled={busy}
                        className="px-2.5 py-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg transition-colors disabled:opacity-40"
                      >
                        Uninstall
                      </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview modal */}
      {modal && modalVersion && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
            style={{ maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{modal.entry.name}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${TYPE_COLORS[modal.entry.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {modal.entry.type}
                  </span>
                  <span className="text-xs text-gray-400">v{modalVersion.version}</span>
                </div>
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                {(["preview", "raw", "diff"] as const).map((mode) => {
                  const disabled = mode === "diff" && !modalPrevVersion;
                  return (
                    <button
                      key={mode}
                      onClick={() => !disabled && setModal((m) => m ? { ...m, viewMode: mode } : m)}
                      disabled={disabled}
                      title={disabled ? "No previous version to diff against" : undefined}
                      className={`px-3 py-1.5 capitalize transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        modal.viewMode === mode ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className={`overflow-y-auto flex-1 ${modal.viewMode === "raw" ? "bg-gray-950" : "bg-white"}`}>
              {modal.viewMode === "raw" ? (
                <pre className="px-5 py-4 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {modalVersion.content}
                </pre>
              ) : modal.viewMode === "diff" && modalPrevVersion ? (
                <div className="p-4">
                  <VersionDiff
                    oldContent={modalPrevVersion.content}
                    newContent={modalVersion.content}
                    oldLabel={`v${modalPrevVersion.version}`}
                    newLabel={`v${modalVersion.version}`}
                  />
                </div>
              ) : (
                <div className="px-6 py-5">
                  <MarkdownPreview content={modalVersion.content} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
