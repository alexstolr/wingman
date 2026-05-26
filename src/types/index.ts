export type CapabilityType =
  | "rules"
  | "skills"
  | "tools"
  | "hooks"
  | "agents"
  | "conventions"
  | "workflows"
  | "prompts"
  | "souls"
  | "personas";

export interface Capability {
  id: string;
  name: string;
  type: CapabilityType;
  harness: string;
  scope: "global" | "repo";
  repo?: string;
  path: string;
}

export type TaskStatus = "backlog" | "todo" | "in-progress" | "monitoring" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  labels: string[];
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Automation {
  id: string;
  name: string;
  scheduleType: "cron" | "scheduled";
  schedule: string;
  taskType: "claude" | "grok" | "cursor" | "codex";
  command: string;
  sync: boolean;
  enabled: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  automationId: string;
  automationName: string;
  startedAt: string;
  endedAt?: string;
  status: "running" | "completed" | "failed" | "stopped";
  output: string;
  pid?: number;
  sync: boolean;
}
