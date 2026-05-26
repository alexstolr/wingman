import { useState, useEffect } from "react";
import { Download, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import VersionDiff from "../components/VersionDiff";
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
  const [expandedChangelog, setExpandedChangelog] = useState<Set<string>>(new Set());
  const [expandedDiff, setExpandedDiff] = useState<Set<string>>(new Set());
  const [pendingVersions, setPendingVersions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchEntries(); }, []);

  async function fetchEntries() {
    try {
      const res = await fetch("/api/marketplace");
      const data: MarketplaceEntry[] = await res.json();
      setEntries(data);
      // Default pending version to latest for each entry
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

  function toggleChangelog(id: string) {
    setExpandedChangelog((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDiff(key: string) {
    setExpandedDiff((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const visible = filter === "all" ? entries : entries.filter((e) => e.type === filter);

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
          const latest = entry.versions[entry.versions.length - 1];
          const selectedVersion = pendingVersions[entry.id] ?? latest.version;
          const isInstalled = entry.installed;
          const installedVersion = entry.installedVersion;
          const canUpgrade = isInstalled && installedVersion !== selectedVersion;
          const changelogOpen = expandedChangelog.has(entry.id);
          const hasMultipleVersions = entry.versions.length > 1;
          const busy = loading[entry.id];

          return (
            <div key={entry.id} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-start gap-4 px-5 py-4">
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

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Version picker */}
                  <select
                    value={selectedVersion}
                    onChange={(e) => setPendingVersions((p) => ({ ...p, [entry.id]: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  >
                    {entry.versions.map((v) => (
                      <option key={v.version} value={v.version}>
                        v{v.version}
                      </option>
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
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Uninstall"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}

                  {hasMultipleVersions && (
                    <button
                      onClick={() => toggleChangelog(entry.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                      title="Changelog"
                    >
                      {changelogOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Changelog + diffs */}
              {changelogOpen && hasMultipleVersions && (
                <div className="border-t border-gray-50 px-5 py-4 space-y-3 bg-gray-50">
                  {entry.versions.map((ver, idx) => {
                    const diffKey = `${entry.id}-${ver.version}`;
                    const hasPrev = idx > 0;
                    const diffOpen = expandedDiff.has(diffKey);

                    return (
                      <div key={ver.version} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-700">v{ver.version}</span>
                          <span className="text-xs text-gray-400 flex-1">{ver.changelog}</span>
                          {hasPrev && (
                            <button
                              onClick={() => toggleDiff(diffKey)}
                              className="text-[10px] text-gray-400 hover:text-gray-700 underline transition-colors"
                            >
                              {diffOpen ? "Hide diff" : "Show diff"}
                            </button>
                          )}
                        </div>
                        {hasPrev && diffOpen && (
                          <VersionDiff
                            oldContent={entry.versions[idx - 1].content}
                            newContent={ver.content}
                            oldLabel={`v${entry.versions[idx - 1].version}`}
                            newLabel={`v${ver.version}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
