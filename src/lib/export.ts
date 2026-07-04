import type { Task } from "./db";
import { listAllTasks } from "./db";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function priorityLabel(p: number): string {
  if (p === 3) return "High";
  if (p === 2) return "Medium";
  if (p === 1) return "Low";
  return "None";
}

export function tasksToCSV(tasks: Task[]): string {
  const header = "ID,Text,Status,Created,Completed,Priority,Tags,Notes,Recurrence,Parent ID";
  const rows = tasks.map((t) => {
    const status = t.is_done ? "Done" : "Pending";
    return [
      t.id,
      escapeCSV(t.text),
      status,
      t.created_at,
      t.completed_at || "",
      priorityLabel(t.priority),
      escapeCSV(t.tags),
      escapeCSV(t.notes),
      t.recurrence || "",
      t.parent_id ?? "",
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function tasksToMarkdown(tasks: Task[]): string {
  const lines: string[] = ["# FocusTap Task Export", "", `Exported: ${new Date().toLocaleDateString("en-CA")}`, ""];

  const incomplete = tasks.filter((t) => !t.is_done);
  const completed = tasks.filter((t) => t.is_done);

  if (incomplete.length > 0) {
    lines.push("## Pending");
    for (const t of incomplete) {
      const tagStr = t.tags ? ` [${t.tags.split(",").map((x) => `#${x.trim()}`).filter(Boolean).join(" ")}]` : "";
      const prioStr = t.priority ? ` (${priorityLabel(t.priority)})` : "";
      lines.push(`- [ ] ${t.text || "Untitled"}${prioStr}${tagStr}`);
    }
    lines.push("");
  }

  if (completed.length > 0) {
    lines.push("## Completed");
    for (const t of completed) {
      lines.push(`- [x] ${t.text || "Done"}${t.completed_at ? ` — ${t.completed_at}` : ""}`);
    }
    lines.push("");
  }

  lines.push("---", `Total: ${tasks.length} tasks (${completed.length} completed, ${incomplete.length} pending)`);
  return lines.join("\n");
}

export async function exportToCSVFile(): Promise<void> {
  const tasks = await listAllTasks();
  const csv = tasksToCSV(tasks);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `focustap-${new Date().toLocaleDateString("en-CA")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToMarkdownFile(): Promise<void> {
  const tasks = await listAllTasks();
  const md = tasksToMarkdown(tasks);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `focustap-${new Date().toLocaleDateString("en-CA")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}