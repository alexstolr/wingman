import { useState, useEffect, useRef } from "react";
import { Plus, Search, X, List, LayoutDashboard } from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "../types";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUSES: { value: TaskStatus; label: string; color: string; dot: string }[] = [
  { value: "backlog",    label: "Backlog",     color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400" },
  { value: "todo",       label: "Todo",        color: "bg-blue-50 text-blue-600",     dot: "bg-blue-500" },
  { value: "in-progress",label: "In Progress", color: "bg-amber-50 text-amber-700",   dot: "bg-amber-500" },
  { value: "monitoring", label: "Monitoring",  color: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  { value: "blocked",    label: "Blocked",     color: "bg-red-50 text-red-700",       dot: "bg-red-500" },
  { value: "done",       label: "Done",        color: "bg-green-50 text-green-700",   dot: "bg-green-500" },
];

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low",    label: "Low",    color: "bg-gray-100 text-gray-500" },
  { value: "medium", label: "Medium", color: "bg-blue-50 text-blue-600" },
  { value: "high",   label: "High",   color: "bg-orange-50 text-orange-600" },
  { value: "urgent", label: "Urgent", color: "bg-red-50 text-red-600" },
];

const statusOf = (v: TaskStatus) => STATUSES.find((s) => s.value === v)!;
const priorityOf = (v: TaskPriority) => PRIORITIES.find((p) => p.value === v)!;

// ── Modal ────────────────────────────────────────────────────────────────────

interface TaskModalProps {
  task: Partial<Task> | null;
  onSave: (data: Partial<Task>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function TaskModal({ task, onSave, onDelete, onClose }: TaskModalProps) {
  const isNew = !task?.id;
  const [form, setForm] = useState<Partial<Task>>({
    title: "", description: "", status: "backlog", priority: "medium",
    assignee: "", labels: [], deadline: null, ...task,
  });
  const [labelInput, setLabelInput] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set<K extends keyof Task>(key: K, val: Task[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addLabel(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    setForm((f) => ({ ...f, labels: [...(f.labels ?? []), tag].filter((v, i, a) => a.indexOf(v) === i) }));
    setLabelInput("");
  }

  function removeLabel(tag: string) {
    setForm((f) => ({ ...f, labels: (f.labels ?? []).filter((l) => l !== tag) }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{isNew ? "New task" : "Edit task"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Title */}
          <input
            ref={titleRef}
            value={form.title ?? ""}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Task title"
            className="w-full text-base font-medium text-gray-900 placeholder-gray-300 focus:outline-none"
          />

          {/* Description */}
          <textarea
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Add a description…"
            rows={3}
            className="w-full text-sm text-gray-600 placeholder-gray-300 resize-none focus:outline-none border border-gray-100 rounded-lg px-3 py-2"
          />

          {/* Row: Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white"
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as TaskPriority)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white"
              >
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Assignee + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Assignee</label>
              <input
                value={form.assignee ?? ""}
                onChange={(e) => set("assignee", e.target.value)}
                placeholder="Name"
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Deadline</label>
              <input
                type="date"
                value={form.deadline ?? ""}
                onChange={(e) => set("deadline", e.target.value || null)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Labels</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {(form.labels ?? []).map((l) => (
                <span key={l} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                  {l}
                  <button onClick={() => removeLabel(l)} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                </span>
              ))}
            </div>
            <input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addLabel(labelInput); } }}
              placeholder="Add label, press Enter"
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <div>
            {!isNew && onDelete && (
              <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete task</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 transition-colors">Cancel</button>
            <button
              onClick={() => onSave(form)}
              className="text-xs bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {isNew ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── List View ────────────────────────────────────────────────────────────────

function formatDeadline(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const diff = (date.getTime() - now.getTime()) / 86400000;
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diff < 0) return { label, cls: "text-red-500" };
  if (diff < 3) return { label, cls: "text-orange-500" };
  return { label, cls: "text-gray-400" };
}

interface ListViewProps {
  tasks: Task[];
  onEdit: (t: Task) => void;
}

function ListView({ tasks, onEdit }: ListViewProps) {
  if (tasks.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-16">No tasks match your filters.</p>
  );

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_130px_90px_120px_120px_100px] gap-3 px-4 py-2 text-xs text-gray-400 font-medium bg-gray-50 border-b border-gray-100">
        <span>Title</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Assignee</span>
        <span>Labels</span>
        <span>Deadline</span>
      </div>
      {tasks.map((task) => {
        const s = statusOf(task.status);
        const p = priorityOf(task.priority);
        const dl = formatDeadline(task.deadline);
        return (
          <div
            key={task.id}
            onClick={() => onEdit(task)}
            className="grid grid-cols-[1fr_130px_90px_120px_120px_100px] gap-3 px-4 py-3 text-sm border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors items-center"
          >
            <span className="font-medium text-gray-900 truncate">{task.title}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full w-fit ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded w-fit ${p.color}`}>{p.label}</span>
            <span className="text-xs text-gray-500 truncate">{task.assignee || "—"}</span>
            <div className="flex gap-1 flex-wrap">
              {task.labels.slice(0, 2).map((l) => (
                <span key={l} className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{l}</span>
              ))}
              {task.labels.length > 2 && <span className="text-[10px] text-gray-400">+{task.labels.length - 2}</span>}
            </div>
            <span className={`text-xs ${dl ? dl.cls : "text-gray-300"}`}>{dl ? dl.label : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Board View ───────────────────────────────────────────────────────────────

interface BoardViewProps {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function BoardView({ tasks, onEdit, onStatusChange }: BoardViewProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start">
      {STATUSES.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.value);
        const isOver = over === col.value;
        return (
          <div
            key={col.value}
            className={`flex-shrink-0 w-64 rounded-xl border transition-colors flex flex-col max-h-[calc(100vh-220px)] ${isOver ? "border-gray-400 bg-gray-50" : "border-gray-100 bg-gray-50/50"}`}
            onDragOver={(e) => { e.preventDefault(); setOver(col.value); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging) onStatusChange(dragging, col.value);
              setDragging(null);
              setOver(null);
            }}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-xs font-medium text-gray-700">{col.label}</span>
              <span className="ml-auto text-xs text-gray-400">{colTasks.length}</span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-16 overflow-y-auto flex-1">
              {colTasks.map((task) => {
                const p = priorityOf(task.priority);
                const dl = formatDeadline(task.deadline);
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragging(task.id)}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    onClick={() => onEdit(task)}
                    className={`bg-white rounded-lg border border-gray-100 p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all ${dragging === task.id ? "opacity-40" : ""}`}
                  >
                    <p className="text-sm font-medium text-gray-900 mb-2">{task.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.color}`}>{p.label}</span>
                      {task.labels.slice(0, 2).map((l) => (
                        <span key={l} className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{l}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {task.assignee ? (
                        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center uppercase">
                          {task.assignee.slice(0, 2)}
                        </span>
                      ) : <span />}
                      {dl && <span className={`text-[10px] ${dl.cls}`}>{dl.label}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

type SortField = "createdAt" | "deadline" | "priority" | "title";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"list" | "board">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [modal, setModal] = useState<{ task: Partial<Task> | null } | null>(null);

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
  }

  async function saveTask(data: Partial<Task>) {
    if (data.id) {
      const res = await fetch(`/api/tasks/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const created = await res.json();
      setTasks((prev) => [created, ...prev]);
    }
    setModal(null);
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setModal(null);
  }

  async function changeStatus(id: string, status: TaskStatus) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 3, high: 2, medium: 1, low: 0 };

  const filtered = tasks
    .filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterAssignee && !t.assignee.toLowerCase().includes(filterAssignee.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "deadline") cmp = (a.deadline ?? "9999") < (b.deadline ?? "9999") ? -1 : 1;
      else if (sortField === "priority") cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      else cmp = a.createdAt < b.createdAt ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const allAssignees = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))];

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${sortField === field ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
    >
      {label} {sortField === field ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </button>
  );

  return (
    <div className="px-6 py-8 h-full overflow-y-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 transition-colors ${view === "list" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}
              title="List view"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setView("board")}
              className={`p-1.5 transition-colors ${view === "board" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}
              title="Board view"
            >
              <LayoutDashboard size={15} />
            </button>
          </div>
          <button
            onClick={() => setModal({ task: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            New task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 w-44"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "all")}
          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white text-gray-600"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "all")}
          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white text-gray-600"
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {/* Assignee filter */}
        {allAssignees.length > 0 && (
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white text-gray-600"
          >
            <option value="">All assignees</option>
            {allAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {/* Sort (list view only) */}
        {view === "list" && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-gray-400 mr-1">Sort:</span>
            <SortBtn field="createdAt" label="Created" />
            <SortBtn field="deadline" label="Deadline" />
            <SortBtn field="priority" label="Priority" />
            <SortBtn field="title" label="Title" />
          </div>
        )}

        {/* Clear filters */}
        {(search || filterStatus !== "all" || filterPriority !== "all" || filterAssignee) && (
          <button
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPriority("all"); setFilterAssignee(""); }}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 mb-4">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>

      {/* Views */}
      {view === "list" ? (
        <ListView tasks={filtered} onEdit={(t) => setModal({ task: t })} />
      ) : (
        <BoardView tasks={filtered} onEdit={(t) => setModal({ task: t })} onStatusChange={changeStatus} />
      )}

      {/* Modal */}
      {modal && (
        <TaskModal
          task={modal.task}
          onSave={saveTask}
          onDelete={modal.task?.id ? () => deleteTask(modal.task!.id!) : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
