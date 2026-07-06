/* ── Google Calendar CSV Import ── */

export interface CalendarEvent {
	subject: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	allDay: boolean;
	description: string;
	location: string;
}

/**
 * Parse a Google Calendar CSV export into structured events.
 *
 * Google Calendar CSV format:
 * Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location,Private
 *
 * Example:
 * "Meeting with team",2026-01-15,10:00:00,2026-01-15,11:00:00,False,Discuss Q1 planning,Conference Room,True
 */
export function parseGoogleCalendarCSV(raw: string): CalendarEvent[] {
	const lines = raw.trim().split(/\r?\n/);
	if (lines.length < 2) return [];

	// Find the header row (case-insensitive)
	const headerLine = lines.find(
		(l) =>
			l.toLowerCase().includes("subject") &&
			l.toLowerCase().includes("start date"),
	);
	if (!headerLine) return [];

	const headerIndex = lines.indexOf(headerLine);
	const dataLines = lines.slice(headerIndex + 1).filter((l) => l.trim());

	const events: CalendarEvent[] = [];

	for (const line of dataLines) {
		try {
			const cols = parseCSVLine(line);
			if (cols.length < 5) continue;

			const event: CalendarEvent = {
				subject: cols[0]?.trim() || "Untitled Event",
				startDate: cols[1]?.trim() || "",
				startTime: cols[2]?.trim() || "",
				endDate: cols[3]?.trim() || "",
				endTime: cols[4]?.trim() || "",
				allDay: cols[5]?.trim().toLowerCase() === "true",
				description: cols[6]?.trim() || "",
				location: cols[7]?.trim() || "",
			};

			if (event.subject && event.startDate) {
				events.push(event);
			}
		} catch {
			// skip malformed rows
		}
	}

	return events;
}

/**
 * Simple CSV line parser that handles quoted fields.
 */
function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const next = line[i + 1];

		if (char === '"') {
			if (inQuotes && next === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === "," && !inQuotes) {
			result.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	result.push(current);
	return result;
}

/**
 * Convert a CalendarEvent into a task-compatible object for FocusTap.
 */
export interface ImportedTask {
	text: string;
	notes: string;
	tags: string;
	task_date: string | null;
}

export function eventToTask(event: CalendarEvent): ImportedTask {
	const parts: string[] = [];
	if (event.description) parts.push(event.description);
	if (event.location) parts.push(`📍 ${event.location}`);

	return {
		text: event.subject,
		notes: parts.join("\n"),
		tags: "calendar",
		task_date: event.startDate || null,
	};
}

export function importFromGoogleCalendar(
	raw: string,
	onTask: (task: ImportedTask) => void,
): { total: number; imported: number } {
	const events = parseGoogleCalendarCSV(raw);
	let imported = 0;

	for (const event of events) {
		const task = eventToTask(event);
		onTask(task);
		imported++;
	}

	return { total: events.length, imported };
}
