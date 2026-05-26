import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative inline-flex group/tip">
      <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[10px] font-medium flex items-center justify-center cursor-default select-none hover:border-gray-400 hover:text-gray-600 transition-colors">
        i
      </span>
      <div className="pointer-events-none absolute left-0 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover/tip:opacity-100 transition-opacity z-20 leading-relaxed whitespace-normal">
        {text}
        <div className="absolute left-3 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
      </div>
    </div>
  );
}

interface WingmanStatus {
  active: boolean;
  symlinkTarget?: string;
  expectedTarget: string;
  warning?: string;
}

interface Settings {
  workspacePaths: string[];
}

export default function Home() {
  const [status, setStatus] = useState<WingmanStatus | null>(null);
  const [workspacePaths, setWorkspacePaths] = useState<string[]>([]);
  const [addingNew, setAddingNew] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [actionError, setActionError] = useState("");
  const [serverDown, setServerDown] = useState(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (addingNew) newInputRef.current?.focus();
  }, [addingNew]);

  async function fetchAll() {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        fetch("/api/wingman/status"),
        fetch("/api/settings"),
      ]);
      const s = await statusRes.json();
      const cfg: Settings = await settingsRes.json();
      setStatus(s);
      setWorkspacePaths(cfg.workspacePaths ?? []);
      setServerDown(false);
    } catch {
      setServerDown(true);
    }
  }

  async function savePaths(paths: string[]) {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspacePaths: paths }),
      });
      setWorkspacePaths(paths);
    } catch {
      // silently ignore, paths stay as-is
    }
  }

  function commitNewPath() {
    const trimmed = newPath.trim();
    if (trimmed && !workspacePaths.includes(trimmed)) {
      savePaths([...workspacePaths, trimmed]);
    }
    setAddingNew(false);
    setNewPath("");
  }

  function removePath(path: string) {
    savePaths(workspacePaths.filter((p) => p !== path));
  }

  async function handleActivate() {
    setActionError("");
    try {
      const res = await fetch("/api/wingman/activate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setActionError(data.error);
      else setStatus(data);
    } catch {
      setActionError("Server unreachable.");
    }
  }

  async function handleDeactivate() {
    setActionError("");
    try {
      const res = await fetch("/api/wingman/deactivate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setActionError(data.error);
      else setStatus(data);
    } catch {
      setActionError("Server unreachable.");
    }
  }

  return (
    <div className="px-6 py-10 max-w-2xl space-y-10">

      {serverDown && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <span className="font-medium">Backend server is not running.</span> Start it with{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">npm run dev:server</code>{" "}
          in a separate terminal, then{" "}
          <button onClick={fetchAll} className="underline hover:no-underline">retry</button>.
        </div>
      )}

      {/* Wingman Status */}
      <section>
        <div className="flex items-center gap-1.5 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Wingman
          </h2>
          <InfoTooltip text="Activating creates a symlink from ~/.wingman to this repo's .wingman folder, making your capabilities available globally alongside .cursor and .claude." />
        </div>
        <div className="inline-flex items-center gap-3 border border-gray-100 rounded-xl px-5 py-4">
          {status === null ? (
            <p className="text-sm text-gray-400">{serverDown ? "Unavailable" : "Loading…"}</p>
          ) : (
            <>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.active ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="text-sm text-gray-600">
                {status.active ? "Active" : "Inactive"}
              </span>

              {status.warning && (
                <AlertTriangle size={15} className="text-amber-400" title={status.warning} />
              )}
              {actionError && (
                <span className="text-xs text-red-500">{actionError}</span>
              )}

              {status.active ? (
                <button
                  onClick={handleDeactivate}
                  className="px-4 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={handleActivate}
                  disabled={!!status.warning}
                  className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Activate
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Workspaces */}
      <section>
        <div className="flex items-center gap-1.5 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Workspaces
          </h2>
          <InfoTooltip text="Folders on your computer that contain repos. Wingman will scan each for capabilities in .cursor, .claude, .wingman and other harness folders." />
        </div>

        <div className="space-y-2">
          {workspacePaths.map((path) => (
            <div key={path} className="flex items-center gap-2 group/row">
              <span className="flex-1 text-sm font-mono text-gray-700 border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
                {path}
              </span>
              <button
                onClick={() => removePath(path)}
                className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover/row:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {addingNew && (
            <div className="flex items-center gap-2">
              <input
                ref={newInputRef}
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onBlur={commitNewPath}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNewPath();
                  if (e.key === "Escape") { setAddingNew(false); setNewPath(""); }
                }}
                placeholder="/Users/you/Workspace"
                className="flex-1 text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          )}

          <button
            onClick={() => setAddingNew(true)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </section>

    </div>
  );
}
