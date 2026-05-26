import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import MarkdownPreview from "../components/MarkdownPreview";
import type { Note } from "../types";

type SaveState = "saved" | "saving" | "unsaved";

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => { fetchNotes(); }, []);

  async function fetchNotes() {
    const res = await fetch("/api/notes");
    const data: Note[] = await res.json();
    setNotes(data);
    // Auto-select the first note if none selected
    if (data.length > 0) {
      setSelectedId((prev) => prev ?? data[0].id);
    }
  }

  // Populate editor when selection changes
  useEffect(() => {
    if (!selected) { setTitle(""); setContent(""); return; }
    setTitle(selected.title);
    setContent(selected.content);
    setSaveState("saved");
  }, [selectedId, notes.map((n) => n.id).join(",")]);

  // Auto-save with 800ms debounce
  const scheduleSave = useCallback((newTitle: string, newContent: string) => {
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!selectedId) return;
      setSaveState("saving");
      fetch(`/api/notes/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      })
        .then((r) => r.json())
        .then((updated: Note) => {
          setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
          setSaveState("saved");
        });
    }, 800);
  }, [selectedId]);

  function handleTitleChange(val: string) {
    setTitle(val);
    scheduleSave(val, content);
  }

  function handleContentChange(val: string) {
    setContent(val);
    scheduleSave(title, val);
  }

  async function createNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", content: "" }),
    });
    const note: Note = await res.json();
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
    setViewMode("edit");
    // Focus title after render
    setTimeout(() => titleRef.current?.select(), 50);
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  const titleRef = useRef<HTMLInputElement>(null);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Notes</span>
          <button
            onClick={createNote}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
            title="New note"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {notes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 px-4">No notes yet.<br />Click + to create one.</p>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={[
                  "w-full text-left px-4 py-3 border-b border-gray-100 transition-colors",
                  selectedId === note.id
                    ? "bg-white border-l-2 border-l-gray-900"
                    : "hover:bg-gray-100 border-l-2 border-l-transparent",
                ].join(" ")}
              >
                <p className="text-sm font-medium text-gray-900 truncate">{note.title || "Untitled"}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {formatDate(note.updatedAt)} · {note.content.slice(0, 40) || "No content"}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Editor */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor toolbar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 text-lg font-semibold text-gray-900 bg-transparent focus:outline-none placeholder-gray-300"
              placeholder="Untitled"
            />
            <span className={`text-xs flex-shrink-0 ${saveState === "unsaved" ? "text-amber-400" : saveState === "saving" ? "text-gray-400" : "text-gray-300"}`}>
              {saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved" : "Saved"}
            </span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
              {(["edit", "preview"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    viewMode === mode ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              onClick={() => deleteNote(selected.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              title="Delete note"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {viewMode === "edit" ? (
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full px-6 py-5 text-sm text-gray-800 font-mono leading-relaxed resize-none focus:outline-none bg-white placeholder-gray-300"
                placeholder="Start writing in Markdown…"
              />
            ) : (
              <div className="px-8 py-6 max-w-3xl">
                {content ? (
                  <MarkdownPreview content={content} />
                ) : (
                  <p className="text-gray-300 text-sm">Nothing to preview.</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
          <FileText size={40} strokeWidth={1} />
          <p className="text-sm">Select a note or create a new one</p>
          <button
            onClick={createNote}
            className="mt-1 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors"
          >
            New note
          </button>
        </div>
      )}
    </div>
  );
}
