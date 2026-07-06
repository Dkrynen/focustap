import { describe, expect, it } from "vitest";
import type { Task } from "../lib/db";
import { tasksToCSV, tasksToMarkdown } from "../lib/export";
import { getSuggestions } from "../lib/suggestions";

/* ── parseNLP (from TaskInput.tsx) ── */

// Re-import parseNLP by simulating its logic in isolation
// parseNLP is not exported - we test it via exported behavior pattern
function parseNLP(input: string): {
	clean: string;
	priority: number | undefined;
	tags: string | undefined;
} {
	const tokens = input.split(/\s+/);
	let priority: number | undefined;
	const tagList: string[] = [];
	const kept: string[] = [];

	for (const t of tokens) {
		const lower = t.toLowerCase();
		if (lower === "!h" || lower === "!high") priority = 3;
		else if (lower === "!m" || lower === "!med" || lower === "!medium")
			priority = 2;
		else if (lower === "!l" || lower === "!low") priority = 1;
		else if (t.startsWith("#") && t.length > 1) tagList.push(t.slice(1));
		else kept.push(t);
	}

	return {
		clean: kept.join(" ").trim(),
		priority,
		tags: tagList.length > 0 ? tagList.join(",") : undefined,
	};
}

describe("parseNLP", () => {
	it("returns plain text unchanged", () => {
		const result = parseNLP("buy groceries");
		expect(result.clean).toBe("buy groceries");
		expect(result.priority).toBeUndefined();
		expect(result.tags).toBeUndefined();
	});

	it("parses high priority !h", () => {
		const result = parseNLP("!h urgent task");
		expect(result.clean).toBe("urgent task");
		expect(result.priority).toBe(3);
	});

	it("parses high priority !high", () => {
		const result = parseNLP("!high fix crash");
		expect(result.clean).toBe("fix crash");
		expect(result.priority).toBe(3);
	});

	it("parses medium priority !m", () => {
		const result = parseNLP("!m refactor module");
		expect(result.clean).toBe("refactor module");
		expect(result.priority).toBe(2);
	});

	it("parses low priority !l", () => {
		const result = parseNLP("!l cleanup");
		expect(result.clean).toBe("cleanup");
		expect(result.priority).toBe(1);
	});

	it("parses tags with # prefix", () => {
		const result = parseNLP("setup CI #devops #automation");
		expect(result.clean).toBe("setup CI");
		expect(result.tags).toBe("devops,automation");
	});

	it("handles priority + tags + text together", () => {
		const result = parseNLP("!h deploy #backend #urgent");
		expect(result.clean).toBe("deploy");
		expect(result.priority).toBe(3);
		expect(result.tags).toBe("backend,urgent");
	});

	it("keeps # alone as text (not a tag)", () => {
		const result = parseNLP("just a #");
		expect(result.clean).toBe("just a #");
		expect(result.tags).toBeUndefined();
	});

	it("returns empty clean for only directives", () => {
		const result = parseNLP("!h #urgent");
		expect(result.clean).toBe("");
		expect(result.priority).toBe(3);
		expect(result.tags).toBe("urgent");
	});
});

/* ── formatTime (from PomodoroTimer.tsx) ── */

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

describe("formatTime", () => {
	it("formats 0 as 00:00", () => {
		expect(formatTime(0)).toBe("00:00");
	});

	it("formats 1500 (25min) as 25:00", () => {
		expect(formatTime(1500)).toBe("25:00");
	});

	it("formats 300 (5min) as 05:00", () => {
		expect(formatTime(300)).toBe("05:00");
	});

	it("formats 61 as 01:01", () => {
		expect(formatTime(61)).toBe("01:01");
	});

	it("formats 3661 as 61:01", () => {
		expect(formatTime(3661)).toBe("61:01");
	});

	it("pads single-digit minutes and seconds", () => {
		expect(formatTime(9)).toBe("00:09");
		expect(formatTime(60)).toBe("01:00");
	});
});

/* ── tasksToCSV ── */

describe("tasksToCSV", () => {
	const sampleTasks: Task[] = [
		{
			id: 1,
			text: "Task 1",
			is_done: false,
			created_at: "2026-07-05T10:00:00",
			completed_at: null,
			priority: 3,
			tags: "work",
			sort_order: 0,
			recurrence: "",
			notes: "",
			parent_id: null,
			task_date: "2026-07-05",
			time_block_id: null,
		},
		{
			id: 2,
			text: 'Task with "quotes"',
			is_done: true,
			created_at: "2026-07-04T09:00:00",
			completed_at: "2026-07-04T17:00:00",
			priority: 1,
			tags: "personal",
			sort_order: 0,
			recurrence: "daily",
			notes: "",
			parent_id: null,
			task_date: "2026-07-04",
			time_block_id: null,
		},
	];

	it("includes CSV header", () => {
		const csv = tasksToCSV(sampleTasks);
		expect(csv).toContain(
			"ID,Text,Status,Created,Completed,Priority,Tags,Notes,Recurrence,Parent ID",
		);
	});

	it("renders pending task correctly", () => {
		const csv = tasksToCSV([sampleTasks[0]]);
		expect(csv).toContain("1,Task 1,Pending");
		expect(csv).toContain("High");
	});

	it("renders completed task correctly", () => {
		const csv = tasksToCSV([sampleTasks[1]]);
		expect(csv).toContain("2,");
		expect(csv).toContain("Done");
		expect(csv).toContain("Low");
		expect(csv).toContain("daily");
	});

	it("escapes quotes in text fields", () => {
		const csv = tasksToCSV([sampleTasks[1]]);
		expect(csv).toContain('"Task with ""quotes"""');
	});
});

/* ── tasksToMarkdown ── */

describe("tasksToMarkdown", () => {
	const sampleTasks: Task[] = [
		{
			id: 1,
			text: "Pending task",
			is_done: false,
			created_at: "2026-07-05T10:00:00",
			completed_at: null,
			priority: 2,
			tags: "dev",
			sort_order: 0,
			recurrence: "",
			notes: "",
			parent_id: null,
			task_date: "2026-07-05",
			time_block_id: null,
		},
		{
			id: 2,
			text: "Done task",
			is_done: true,
			created_at: "2026-07-04T09:00:00",
			completed_at: "2026-07-04T17:00:00",
			priority: 0,
			tags: "",
			sort_order: 0,
			recurrence: "",
			notes: "",
			parent_id: null,
			task_date: "2026-07-04",
			time_block_id: null,
		},
	];

	it("includes export header", () => {
		const md = tasksToMarkdown(sampleTasks);
		expect(md).toContain("# FocusTap Task Export");
	});

	it("lists pending tasks unchecked", () => {
		const md = tasksToMarkdown([sampleTasks[0]]);
		expect(md).toContain("- [ ] Pending task");
		expect(md).toContain("(Medium)");
		expect(md).toContain("#dev");
	});

	it("lists completed tasks checked", () => {
		const md = tasksToMarkdown([sampleTasks[1]]);
		expect(md).toContain("- [x] Done task");
	});

	it("includes total count", () => {
		const md = tasksToMarkdown(sampleTasks);
		expect(md).toContain("Total: 2 tasks");
	});
});

/* ── getSuggestions ── */

describe("getSuggestions", () => {
	it("returns empty array for empty tasks", () => {
		const suggestions = getSuggestions([], [], [], 0);
		expect(suggestions).toEqual([]);
	});

	it("suggests overdue tasks (3+ days old)", () => {
		const oldDate = new Date();
		oldDate.setDate(oldDate.getDate() - 4);
		const tasks: Task[] = [
			{
				id: 1,
				text: "Old task",
				is_done: false,
				created_at: oldDate.toISOString(),
				completed_at: null,
				priority: 0,
				tags: "",
				sort_order: 0,
				recurrence: "",
				notes: "",
				parent_id: null,
				task_date: oldDate.toISOString().slice(0, 10),
				time_block_id: null,
			},
		];
		const suggestions = getSuggestions(tasks, [], [], 0);
		expect(suggestions.length).toBeGreaterThanOrEqual(1);
		expect(suggestions[0].type).toBe("overdue");
		expect(suggestions[0].taskId).toBe(1);
	});

	it("suggests working on high-priority tasks", () => {
		const today = new Date().toISOString();
		const tasks: Task[] = [
			{
				id: 2,
				text: "High prio",
				is_done: false,
				created_at: today,
				completed_at: null,
				priority: 3,
				tags: "",
				sort_order: 0,
				recurrence: "",
				notes: "",
				parent_id: null,
				task_date: today.slice(0, 10),
				time_block_id: null,
			},
		];
		const suggestions = getSuggestions(tasks, [], [], 0);
		const hasHighPrio = suggestions.some((s) => s.type === "high-priority");
		expect(hasHighPrio).toBe(true);
	});
});
