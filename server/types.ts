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
