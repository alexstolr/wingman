import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, BookOpen, ChevronRight, ChevronDown, Folder as FolderIcon, FileText } from "lucide-react";
import MarkdownPreview from "../components/MarkdownPreview";
import type { Document, Folder } from "../types";

type SaveState = "saved" | "saving" | "unsaved";

interface MenuPos { x: number; y: number }
interface CreateMenu extends MenuPos { folderId: string | null }
interface ContextMenu extends MenuPos { type: "doc" | "folder"; id: string }

// ── Tree ─────────────────────────────────────────────────────────────────────

interface TreeProps {
  folders: Folder[];
  docs: Document[];
  parentId: string | null;
  depth: number;
  selectedId: string | null;
  expandedFolders: Set<string>;
  renamingId: string | null;
  renameValue: string;
  renameRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, type: "doc" | "folder", id: string) => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
}

function Tree({
  folders, docs, parentId, depth,
  selectedId, expandedFolders,
  renamingId, renameValue, renameRef,
  onSelect, onToggle, onContextMenu, onRenameChange, onRenameCommit, onRenameCancel,
}: TreeProps) {
  const indent = depth * 14 + 8;
  const childFolders = folders.filter((f) => f.parentId === parentId);
  const childDocs = docs.filter((d) => (d.folderId ?? null) === parentId);

  return (
    <>
      {childFolders.map((folder) => {
        const isOpen = expandedFolders.has(folder.id);
        return (
          <div key={folder.id}>
            <div
              style={{ paddingLeft: indent }}
              className="flex items-center gap-1 py-1.5 pr-2 cursor-pointer hover:bg-gray-100 rounded-md mx-1 group select-none"
              onClick={() => onToggle(folder.id)}
              onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, "folder", folder.id); }}
            >
              {isOpen
                ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                : <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />}
              <FolderIcon size={13} className="text-amber-400 flex-shrink-0" />
              {renamingId === folder.id ? (
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onBlur={onRenameCommit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRenameCommit();
                    if (e.key === "Escape") onRenameCancel();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 text-xs text-gray-900 bg-white border border-blue-300 rounded px-1 focus:outline-none"
                />
              ) : (
                <span className="text-xs text-gray-700 truncate flex-1">{folder.name}</span>
              )}
            </div>
            {isOpen && (
              <Tree
                folders={folders} docs={docs} parentId={folder.id} depth={depth + 1}
                selectedId={selectedId} expandedFolders={expandedFolders}
                renamingId={renamingId} renameValue={renameValue} renameRef={renameRef}
                onSelect={onSelect} onToggle={onToggle} onContextMenu={onContextMenu}
                onRenameChange={onRenameChange} onRenameCommit={onRenameCommit} onRenameCancel={onRenameCancel}
              />
            )}
          </div>
        );
      })}

      {childDocs.map((doc) => (
        <div
          key={doc.id}
          style={{ paddingLeft: indent + 18 }}
          className={[
            "flex items-center gap-1.5 py-1.5 pr-2 mx-1 rounded-md cursor-pointer transition-colors select-none",
            selectedId === doc.id ? "bg-gray-200 text-gray-900" : "hover:bg-gray-100 text-gray-500",
          ].join(" ")}
          onClick={() => onSelect(doc.id)}
          onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, "doc", doc.id); }}
        >
          <FileText size={12} className="flex-shrink-0 text-gray-400" />
          <span className="text-xs truncate">{doc.title || "Untitled"}</span>
        </div>
      ))}
    </>
  );
}

// ── Menu ─────────────────────────────────────────────────────────────────────

function Menu({ pos, children }: { pos: MenuPos; children: React.ReactNode }) {
  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48"
      style={{ top: pos.y, left: pos.x }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function MenuItem({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${danger ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
    >
      {children}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Documents() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [createMenu, setCreateMenu] = useState<CreateMenu | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);

  const selected = docs.find((d) => d.id === selectedId) ?? null;

  // Close menus on outside click
  useEffect(() => {
    function onDown() { setCreateMenu(null); setContextMenu(null); }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [fRes, dRes] = await Promise.all([fetch("/api/folders"), fetch("/api/documents")]);
    const fData: Folder[] = await fRes.json();
    const dData: Document[] = await dRes.json();
    setFolders(fData);
    setDocs(dData);
    if (dData.length > 0) setSelectedId((prev) => prev ?? dData[0].id);
  }

  useEffect(() => {
    if (!selected) { setTitle(""); setContent(""); return; }
    setTitle(selected.title);
    setContent(selected.content);
    setSaveState("saved");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, docs.map((d) => d.id).join(",")]);

  useEffect(() => {
    if (renamingId) renameRef.current?.select();
  }, [renamingId]);

  const scheduleSave = useCallback((newTitle: string, newContent: string) => {
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!selectedId) return;
      setSaveState("saving");
      fetch(`/api/documents/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      })
        .then((r) => r.json())
        .then((updated: Document) => {
          setDocs((prev) => prev.map((d) => d.id === updated.id ? updated : d));
          setSaveState("saved");
        });
    }, 800);
  }, [selectedId]);

  function handleTitleChange(val: string) { setTitle(val); scheduleSave(val, content); }
  function handleContentChange(val: string) { setContent(val); scheduleSave(title, val); }

  async function createDoc(folderId: string | null) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled document", content: "", folderId }),
    });
    const doc: Document = await res.json();
    setDocs((prev) => [doc, ...prev]);
    setSelectedId(doc.id);
    setViewMode("edit");
    if (folderId) setExpandedFolders((prev) => new Set([...prev, folderId]));
    setCreateMenu(null);
    setContextMenu(null);
    setTimeout(() => titleRef.current?.select(), 50);
  }

  async function createFolder(parentId: string | null) {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New folder", parentId }),
    });
    const folder: Folder = await res.json();
    setFolders((prev) => [...prev, folder]);
    if (parentId) setExpandedFolders((prev) => new Set([...prev, parentId]));
    setCreateMenu(null);
    setContextMenu(null);
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  }

  async function deleteDoc(id: string) {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
    setContextMenu(null);
  }

  async function deleteFolder(id: string) {
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    await fetchAll();
    setContextMenu(null);
  }

  async function commitRename() {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      await fetch(`/api/folders/${renamingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      setFolders((prev) => prev.map((f) => f.id === renamingId ? { ...f, name: trimmed } : f));
    }
    setRenamingId(null);
  }

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openPlusMenu(e: React.MouseEvent) {
    e.stopPropagation();
    const r = plusRef.current?.getBoundingClientRect();
    if (r) setCreateMenu({ x: r.right - 192, y: r.bottom + 4, folderId: null });
    setContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent, type: "doc" | "folder", id: string) {
    setContextMenu({ x: e.clientX, y: e.clientY, type, id });
    setCreateMenu(null);
  }

  const isEmpty = folders.length === 0 && docs.length === 0;
  const ctxFolder = contextMenu?.type === "folder" ? folders.find((f) => f.id === contextMenu.id) : null;

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Documents</span>
          <button
            ref={plusRef}
            onClick={openPlusMenu}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
            title="New…"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 py-1">
          {isEmpty ? (
            <p className="text-xs text-gray-400 text-center py-8 px-4">No documents yet.<br />Click + to create one.</p>
          ) : (
            <Tree
              folders={folders} docs={docs} parentId={null} depth={0}
              selectedId={selectedId} expandedFolders={expandedFolders}
              renamingId={renamingId} renameValue={renameValue} renameRef={renameRef}
              onSelect={setSelectedId} onToggle={toggleFolder} onContextMenu={handleContextMenu}
              onRenameChange={setRenameValue} onRenameCommit={commitRename} onRenameCancel={() => setRenamingId(null)}
            />
          )}
        </div>
      </aside>

      {/* Editor */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 text-lg font-semibold text-gray-900 bg-transparent focus:outline-none placeholder-gray-300"
              placeholder="Untitled document"
            />
            <span className={`text-xs flex-shrink-0 ${saveState === "unsaved" ? "text-amber-400" : saveState === "saving" ? "text-gray-400" : "text-gray-300"}`}>
              {saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved" : "Saved"}
            </span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
              {(["edit", "preview"] as const).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 capitalize transition-colors ${viewMode === mode ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"}`}>
                  {mode}
                </button>
              ))}
            </div>
            <button onClick={() => deleteDoc(selected.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Delete document">
              <Trash2 size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {viewMode === "edit" ? (
              <textarea value={content} onChange={(e) => handleContentChange(e.target.value)} className="w-full h-full px-6 py-5 text-sm text-gray-800 font-mono leading-relaxed resize-none focus:outline-none bg-white placeholder-gray-300" placeholder="Start writing in Markdown…" />
            ) : (
              <div className="px-8 py-6 max-w-3xl">
                {content ? <MarkdownPreview content={content} /> : <p className="text-gray-300 text-sm">Nothing to preview.</p>}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
          <BookOpen size={40} strokeWidth={1} />
          <p className="text-sm">Select a document or create a new one</p>
          <button onClick={() => createDoc(null)} className="mt-1 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors">
            New document
          </button>
        </div>
      )}

      {/* + dropdown menu */}
      {createMenu && (
        <Menu pos={createMenu}>
          <MenuItem onClick={() => createDoc(createMenu.folderId)}>
            <FileText size={14} className="text-gray-400" /> New document
          </MenuItem>
          <MenuItem onClick={() => createFolder(createMenu.folderId)}>
            <FolderIcon size={14} className="text-amber-400" /> New folder
          </MenuItem>
        </Menu>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <Menu pos={contextMenu}>
          {contextMenu.type === "folder" ? (
            <>
              <MenuItem onClick={() => createDoc(contextMenu.id)}>
                <FileText size={14} className="text-gray-400" /> New document here
              </MenuItem>
              <MenuItem onClick={() => createFolder(contextMenu.id)}>
                <FolderIcon size={14} className="text-amber-400" /> New folder here
              </MenuItem>
              <MenuItem onClick={() => { setRenamingId(contextMenu.id); setRenameValue(ctxFolder?.name ?? ""); setContextMenu(null); }}>
                Rename
              </MenuItem>
              <div className="border-t border-gray-100 my-1" />
              <MenuItem danger onClick={() => deleteFolder(contextMenu.id)}>
                Delete folder
              </MenuItem>
            </>
          ) : (
            <MenuItem danger onClick={() => deleteDoc(contextMenu.id)}>
              Delete document
            </MenuItem>
          )}
        </Menu>
      )}
    </div>
  );
}
