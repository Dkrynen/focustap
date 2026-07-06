import { Task } from "./db";

/* ── Workspace Export Formats ── */

export interface WorkspaceExport {
	workspace: {
		name: string;
		id: string;
		exported_at: string;
		version: string;
	};
	tasks: Task[];
	notes: { id: number; title: string; content: string; tags: string }[];
	stats: {
		total_tasks: number;
		completed_tasks: number;
		pending_tasks: number;
		total_notes: number;
	};
}

export function buildWorkspaceExport(
	workspaceName: string,
	workspaceId: string,
	tasks: Task[],
	notes: { id: number; title: string; content: string; tags: string }[],
): WorkspaceExport {
	const completed = tasks.filter((t) => t.is_done);
	return {
		workspace: {
			name: workspaceName,
			id: workspaceId,
			exported_at: new Date().toISOString(),
			version: "1.0",
		},
		tasks,
		notes,
		stats: {
			total_tasks: tasks.length,
			completed_tasks: completed.length,
			pending_tasks: tasks.length - completed.length,
			total_notes: notes.length,
		},
	};
}

export function exportToJSON(exportData: WorkspaceExport): string {
	return JSON.stringify(exportData, null, 2);
}

export function exportToCSV(tasks: Task[]): string {
	const header = "ID,Text,Status,Created,Completed,Priority,Tags,Notes";
	const rows = tasks.map((t) => {
		const status = t.is_done ? "Done" : "Pending";
		const prio = t.priority === 3 ? "High" : t.priority === 2 ? "Medium" : t.priority === 1 ? "Low" : "None";
		const escape = (v: string) => {
			if (v.includes(",") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
			return v;
		};
		return [t.id, escape(t.text), status, t.created_at, t.completed_at || "", prio, escape(t.tags || ""), escape(t.notes || "")].join(",");
	});
	return [header, ...rows].join("\n");
}

export function exportToMarkdown(exportData: WorkspaceExport): string {
	const lines: string[] = [
		`# Workspace: ${exportData.workspace.name}`,
		"",
		`Exported: ${new Date(exportData.workspace.exported_at).toLocaleDateString("en-CA")}`,
		`Total: ${exportData.stats.total_tasks} tasks · ${exportData.stats.completed_tasks} done · ${exportData.stats.pending_tasks} pending · ${exportData.stats.total_notes} notes`,
		"",
	];

	const incomplete = exportData.tasks.filter((t) => !t.is_done);
	if (incomplete.length > 0) {
		lines.push("## Pending");
		for (const t of incomplete) {
			const tags = t.tags ? ` [${t.tags.split(",").map((x) => `#${x.trim()}`).filter(Boolean).join(" ")}]` : "";
			const prio = t.priority === 3 ? " 🔴" : t.priority === 2 ? " 🟡" : t.priority === 1 ? " 🔵" : "";
			lines.push(`- [ ] ${t.text || "Untitled"}${prio}${tags}`);
		}
		lines.push("");
	}

	const done = exportData.tasks.filter((t) => t.is_done);
	if (done.length > 0) {
		lines.push("## Completed");
		for (const t of done) {
			lines.push(`- [x] ${t.text || "Done"}${t.completed_at ? ` — ${t.completed_at}` : ""}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

/* ── Browser download helper ── */

export function downloadBlob(content: string, filename: string, mime: string): void {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
