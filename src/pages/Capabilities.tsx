import { useState, useEffect, useRef } from "react";
import { RefreshCw, X, Filter } from "lucide-react";
import MarkdownPreview from "../components/MarkdownPreview";
import type { Capability, CapabilityType } from "../types";

const TABS: { type: CapabilityType; label: string }[] = [
  { type: "rules",       label: "Rules" },
  { type: "skills",      label: "Skills" },
  { type: "tools",       label: "Tools" },
  { type: "hooks",       label: "Hooks" },
  { type: "agents",      label: "Agents" },
  { type: "conventions", label: "Conventions" },
  { type: "workflows",   label: "Workflows" },
  { type: "prompts",     label: "Prompts" },
  { type: "souls",       label: "Souls" },
  { type: "personas",    label: "Personas" },
];

const HARNESS_COLORS: Record<string, string> = {
  cursor:  "bg-blue-50 text-blue-600",
  claude:  "bg-orange-50 text-orange-600",
  wingman: "bg-purple-50 text-purple-600",
  codex:   "bg-green-50 text-green-700",
  grok:    "bg-gray-100 text-gray-600",
  copilot: "bg-sky-50 text-sky-600",
  fleet:   "bg-teal-50 text-teal-700",
};

interface FileModal {
  cap: Capability;
  content: string | null;
  error: string | null;
  viewMode: "preview" | "raw";
}

export default function Capabilities() {
  const [all, setAll] = useState<Capability[]>([]);
  const [activeTab, setActiveTab] = useState<CapabilityType | "all">("all");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<FileModal | null>(null);

  const [ignoreInput, setIgnoreInput] = useState("");
  const [ignoreOpen, setIgnoreOpen] = useState(false);
  const [ignoreSaving, setIgnoreSaving] = useState(false);
  const ignoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchCapabilities(); }, []);

  // Load saved ignore list from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        const names: string[] = s.capabilityIgnoreNames ?? [];
        setIgnoreInput(names.join(", "));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (ignoreOpen) ignoreRef.current?.focus();
  }, [ignoreOpen]);

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function fetchCapabilities(refresh = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/capabilities${refresh ? "?refresh=true" : ""}`);
      setAll(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function saveIgnoreList() {
    setIgnoreSaving(true);
    const names = ignoreInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilityIgnoreNames: names }),
      });
      await fetchCapabilities(true);
      setIgnoreOpen(false);
    } finally {
      setIgnoreSaving(false);
    }
  }

  async function openFile(cap: Capability) {
    setModal({ cap, content: null, error: null, viewMode: "preview" });
    try {
      const res = await fetch(`/api/capabilities/content?path=${encodeURIComponent(cap.path)}`);
      const data = await res.json();
      if (!res.ok) {
        setModal({ cap, content: null, error: data.error ?? "Unknown error", viewMode: "preview" });
      } else {
        setModal({ cap, content: data.content, error: null, viewMode: "preview" });
      }
    } catch (err) {
      setModal({ cap, content: null, error: String(err), viewMode: "preview" });
    }
  }

  function isManaged(cap: Capability) {
    return cap.path.includes("/.wingman/") || cap.path.includes("\\.wingman\\");
  }

  async function uninstallCap(cap: Capability) {
    await fetch("/api/capabilities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: cap.path }),
    });
    setModal(null);
    await fetchCapabilities(true);
  }

  const visible = activeTab === "all" ? all : all.filter((c) => c.type === activeTab);
  const countFor = (t: CapabilityType) => all.filter((c) => c.type === t).length;

  return (
    <div className="px-6 py-10 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Capabilities</h1>
        <div className="flex items-center gap-3">
          {/* Ignore list toggle */}
          <div className="relative">
            <button
              onClick={() => setIgnoreOpen((o) => !o)}
              className={[
                "flex items-center gap-1.5 text-sm transition-colors",
                ignoreOpen ? "text-gray-700" : "text-gray-400 hover:text-gray-700",
              ].join(" ")}
            >
              <Filter size={14} />
              Ignore list
            </button>

            {ignoreOpen && (
              <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-80">
                <p className="text-xs text-gray-500 mb-2">
                  Comma-separated file names to exclude (with or without extension).
                </p>
                <input
                  ref={ignoreRef}
                  type="text"
                  value={ignoreInput}
                  onChange={(e) => setIgnoreInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveIgnoreList(); if (e.key === "Escape") setIgnoreOpen(false); }}
                  placeholder="INDEX, CONVENTIONS.md, 00-overview"
                  className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 mb-2"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIgnoreOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveIgnoreList}
                    disabled={ignoreSaving}
                    className="text-xs bg-gray-900 text-white rounded px-3 py-1 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    {ignoreSaving ? "Saving…" : "Save & Refresh"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => fetchCapabilities(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-0.5 border-b border-gray-100 mb-6 overflow-x-auto">
        {/* All tab */}
        <button
          onClick={() => setActiveTab("all")}
          className={[
            "relative flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
            activeTab === "all"
              ? "text-gray-900 font-medium after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-gray-900 after:rounded-t"
              : "text-gray-500 hover:text-gray-800",
          ].join(" ")}
        >
          All
          {all.length > 0 && (
            <span className="text-[10px] font-medium bg-gray-100 text-gray-500 rounded px-1 py-0.5 leading-none">
              {all.length}
            </span>
          )}
        </button>

        {TABS.map(({ type, label }) => {
          const count = countFor(type);
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={[
                "relative flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                activeTab === type
                  ? "text-gray-900 font-medium after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-gray-900 after:rounded-t"
                  : "text-gray-500 hover:text-gray-800",
              ].join(" ")}
            >
              {label}
              {count > 0 && (
                <span className="text-[10px] font-medium bg-gray-100 text-gray-500 rounded px-1 py-0.5 leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <p className="text-sm text-gray-400 py-16 text-center">
          {activeTab === "all"
            ? "No capabilities found in any harness folder."
            : `No ${activeTab} found in any harness folder.`}
        </p>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-50">
          {visible.map((cap) => (
            <div
              key={cap.id}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
            >
              {/* Clickable name area */}
              <button
                onClick={() => openFile(cap)}
                className="font-medium text-gray-900 flex-1 text-left"
              >
                {cap.name}
              </button>
              {activeTab === "all" && (
                <span className="px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0 bg-gray-50 text-gray-500">
                  {cap.type}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0 ${HARNESS_COLORS[cap.harness] ?? "bg-gray-100 text-gray-600"}`}>
                {cap.harness}
              </span>
              <span className="text-gray-400 text-xs flex-shrink-0">
                {cap.scope === "global" ? "Global" : cap.repo}
              </span>
              <span className="text-gray-300 text-xs font-mono truncate max-w-xs flex-shrink-0 hidden lg:block">
                {cap.path}
              </span>
              {isManaged(cap) && (
                <button
                  onClick={() => uninstallCap(cap)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                >
                  Uninstall
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File viewer modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
            style={{ maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{modal.cap.name}</p>
                <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{modal.cap.path}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0 ${HARNESS_COLORS[modal.cap.harness] ?? "bg-gray-100 text-gray-600"}`}>
                {modal.cap.harness}
              </span>
              {isManaged(modal.cap) && (
                <button
                  onClick={() => uninstallCap(modal.cap)}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded px-2.5 py-1 transition-colors flex-shrink-0"
                >
                  Uninstall
                </button>
              )}
              {/* View toggle */}
              {modal.content && !modal.error && (
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                  {(["preview", "raw"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setModal((m) => m ? { ...m, viewMode: mode } : m)}
                      className={`px-3 py-1.5 capitalize transition-colors ${
                        modal.viewMode === mode
                          ? "bg-gray-900 text-white"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setModal(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className={`overflow-y-auto flex-1 ${modal.viewMode === "preview" ? "bg-white" : "bg-gray-950"}`}>
              {modal.error ? (
                <div className="px-5 py-4">
                  <p className="text-xs text-red-500 font-mono">{modal.error}</p>
                </div>
              ) : modal.content === null ? (
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-400">Loading…</p>
                </div>
              ) : modal.viewMode === "raw" ? (
                <pre className="px-5 py-4 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {modal.content}
                </pre>
              ) : (
                <div className="px-6 py-5">
                  <MarkdownPreview content={modal.content} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
