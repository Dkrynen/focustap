import { getValidAccessToken } from "./calendar-auth";
import type { CalendarProvider } from "./db";

export interface ExternalEvent {
	externalId: string;
	provider: CalendarProvider;
	calendarId: string;
	title: string;
	description: string | null;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	recurrence: string | null;
	etag: string | null;
	status: "confirmed" | "tentative" | "cancelled";
	location: string | null;
}

const GOOGLE_BASE = "https://www.googleapis.com/calendar/v3";

function toDateOnlyOrDateTime(iso: string, allDay: boolean): string {
	if (allDay) return iso.slice(0, 10);
	return iso;
}

function parseGoogleDateTime(raw: unknown): { time: string; allDay: boolean } {
	if (!raw || typeof raw !== "object") {
		return { time: new Date(0).toISOString(), allDay: false };
	}
	const obj = raw as Record<string, unknown>;
	if (typeof obj.dateTime === "string") {
		return { time: obj.dateTime, allDay: false };
	}
	if (typeof obj.date === "string") {
		return {
			time: new Date(`${obj.date}T00:00:00Z`).toISOString(),
			allDay: true,
		};
	}
	return { time: new Date(0).toISOString(), allDay: false };
}

function toGoogleDateTime(
	iso: string,
	allDay: boolean,
): Record<string, string> {
	const d = new Date(iso);
	if (allDay) return { date: d.toISOString().slice(0, 10) };
	return { dateTime: d.toISOString() };
}

function toExternalEvent(
	raw: Record<string, unknown>,
	calendarId: string,
): ExternalEvent {
	const start = parseGoogleDateTime(raw.start);
	const end = parseGoogleDateTime(raw.end);
	return {
		externalId: typeof raw.id === "string" ? raw.id : "",
		provider: "google",
		calendarId,
		title: (typeof raw.summary === "string" ? raw.summary : "") || "(no title)",
		description: typeof raw.description === "string" ? raw.description : null,
		startTime: start.time,
		endTime: end.time,
		isAllDay: start.allDay || end.allDay,
		recurrence:
			Array.isArray(raw.recurrence) && raw.recurrence.length
				? String(raw.recurrence[0])
				: null,
		etag: typeof raw.etag === "string" ? raw.etag : null,
		status:
			typeof raw.status === "string"
				? (raw.status as ExternalEvent["status"])
				: "confirmed",
		location: typeof raw.location === "string" ? raw.location : null,
	};
}

async function googleFetch(
	accountEmail: string,
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const token = await getValidAccessToken("google", accountEmail);
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${token}`);
	if (init.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	return fetch(`${GOOGLE_BASE}${path}`, { ...init, headers });
}

export async function listGoogleEvents(
	accountEmail: string,
	calendarId = "primary",
	range?: { fromIso: string; toIso: string },
): Promise<ExternalEvent[]> {
	const params = new URLSearchParams({
		singleEvents: "true",
		orderBy: "startTime",
		showDeleted: "false",
		maxResults: "250",
	});
	if (range) {
		params.set("timeMin", new Date(range.fromIso).toISOString());
		params.set("timeMax", new Date(range.toIso).toISOString());
	}
	const res = await googleFetch(
		accountEmail,
		`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
	);
	if (!res.ok) {
		throw new Error(
			`Google listEvents HTTP ${res.status}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as Record<string, unknown>;
	const items = Array.isArray(json.items) ? json.items : [];
	return items.map((it) =>
		toExternalEvent(it as Record<string, unknown>, calendarId),
	);
}

export async function createGoogleEvent(
	accountEmail: string,
	calendarId: string,
	event: {
		title: string;
		description?: string | null;
		startTime: string;
		endTime: string;
		isAllDay?: boolean;
		location?: string | null;
		recurrence?: string | null;
	},
): Promise<ExternalEvent> {
	const body = {
		summary: event.title,
		description: event.description ?? null,
		start: toGoogleDateTime(event.startTime, event.isAllDay ?? false),
		end: toGoogleDateTime(event.endTime, event.isAllDay ?? false),
		location: event.location ?? null,
		recurrence: event.recurrence ? [event.recurrence] : undefined,
	};
	const res = await googleFetch(
		accountEmail,
		`/calendars/${encodeURIComponent(calendarId)}/events`,
		{ method: "POST", body: JSON.stringify(body) },
	);
	if (!res.ok) {
		throw new Error(
			`Google createEvent HTTP ${res.status}: ${await res.text()}`,
		);
	}
	const raw = (await res.json()) as Record<string, unknown>;
	return toExternalEvent(raw, calendarId);
}

export async function updateGoogleEvent(
	accountEmail: string,
	calendarId: string,
	externalId: string,
	patch: {
		title?: string;
		description?: string | null;
		startTime?: string;
		endTime?: string;
		isAllDay?: boolean;
		location?: string | null;
	},
): Promise<ExternalEvent> {
	const body: Record<string, unknown> = {};
	if (patch.title !== undefined) body.summary = patch.title;
	if (patch.description !== undefined) body.description = patch.description;
	if (patch.startTime !== undefined)
		body.start = toGoogleDateTime(patch.startTime, patch.isAllDay ?? false);
	if (patch.endTime !== undefined)
		body.end = toGoogleDateTime(patch.endTime, patch.isAllDay ?? false);
	if (patch.location !== undefined) body.location = patch.location;
	const res = await googleFetch(
		accountEmail,
		`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`,
		{
			method: "PATCH",
			body: JSON.stringify(body),
			headers: { "Content-Type": "application/json" },
		},
	);
	if (!res.ok) {
		throw new Error(
			`Google updateEvent HTTP ${res.status}: ${await res.text()}`,
		);
	}
	const raw = (await res.json()) as Record<string, unknown>;
	return toExternalEvent(raw, calendarId);
}

export async function deleteGoogleEvent(
	accountEmail: string,
	calendarId: string,
	externalId: string,
): Promise<void> {
	const res = await googleFetch(
		accountEmail,
		`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`,
		{ method: "DELETE" },
	);
	if (!res.ok && res.status !== 204) {
		throw new Error(
			`Google deleteEvent HTTP ${res.status}: ${await res.text()}`,
		);
	}
}

export async function listGoogleCalendars(
	accountEmail: string,
): Promise<{ id: string; summary: string }[]> {
	const res = await googleFetch(accountEmail, "/users/me/calendarList");
	if (!res.ok) {
		throw new Error(
			`Google calendarList HTTP ${res.status}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as Record<string, unknown>;
	const items = Array.isArray(json.items) ? json.items : [];
	return items.map((it) => {
		const obj = it as Record<string, unknown>;
		return {
			id: typeof obj.id === "string" ? obj.id : "",
			summary: typeof obj.summary === "string" ? obj.summary : "",
		};
	});
}

export const googleDateUtil = {
	toDateOnlyOrDateTime,
	toGoogleDateTime,
	parseGoogleDateTime,
};
