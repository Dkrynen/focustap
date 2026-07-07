import type { ExternalEvent } from "./calendar-api-google";
import { getValidAccessToken } from "./calendar-auth";

export type { ExternalEvent };

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function parseGraphDateTime(raw: unknown): { time: string; allDay: boolean } {
	const obj = (raw ?? {}) as Record<string, unknown>;
	if (obj.isAllDay === true && typeof obj.date === "string") {
		if (obj.date.length === 10) {
			return { time: `${obj.date}T00:00:00Z`, allDay: true };
		}
		return { time: obj.date as string, allDay: true };
	}
	if (obj.isAllDay === true && typeof obj.dateTime === "string") {
		return { time: obj.dateTime, allDay: true };
	}
	if (typeof obj.dateTime === "string") {
		return { time: obj.dateTime, allDay: false };
	}
	return { time: new Date(0).toISOString(), allDay: false };
}

function toGraphDateTime(iso: string, allDay: boolean): { dateTime: string } {
	const d = new Date(iso);
	const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
		.toISOString()
		.replace(/\.\d{3}Z$/i, "");
	if (allDay) {
		return { dateTime: `${isoLocal.slice(0, 10)}T00:00:00` };
	}
	return { dateTime: isoLocal };
}

function toExternalEvent(
	raw: Record<string, unknown>,
	calendarId: string,
): ExternalEvent {
	const start = parseGraphDateTime(raw.start);
	const end = parseGraphDateTime(raw.end);
	const locationObj = (raw.location ?? {}) as Record<string, unknown>;
	const statusObj = (raw.status ?? {}) as Record<string, unknown>;
	const statusPreview =
		typeof statusObj.preview === "string"
			? statusObj.preview
			: typeof raw.status === "string"
				? raw.status
				: "confirmed";
	return {
		externalId: typeof raw.id === "string" ? raw.id : "",
		provider: "microsoft",
		calendarId,
		title: typeof raw.subject === "string" ? raw.subject : "(no title)",
		description: typeof raw.bodyPreview === "string" ? raw.bodyPreview : null,
		startTime: start.time,
		endTime: end.time,
		isAllDay: start.allDay || end.allDay,
		recurrence: null,
		etag: typeof raw["@odata.etag"] === "string" ? raw["@odata.etag"] : null,
		status: validateStatus(statusPreview),
		location:
			typeof locationObj.displayName === "string"
				? locationObj.displayName
				: null,
	};
}

function validateStatus(raw: unknown): ExternalEvent["status"] {
	if (typeof raw !== "string") return "confirmed";
	const lower = raw.toLowerCase();
	if (lower.includes("tentative")) return "tentative";
	if (lower.includes("cancel")) return "cancelled";
	if (lower.includes("confirmed")) return "confirmed";
	return "confirmed";
}

async function graphFetch(
	accountEmail: string,
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const token = await getValidAccessToken("microsoft", accountEmail);
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${token}`);
	if (init.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	return fetch(`${GRAPH_BASE}${path}`, { ...init, headers });
}

export async function listMicrosoftCalendars(
	accountEmail: string,
): Promise<{ id: string; summary: string }[]> {
	const res = await graphFetch(accountEmail, `/me/calendars?$select=id,name`);
	if (!res.ok) {
		throw new Error(
			`Microsoft listMicrosoftCalendars HTTP ${res.status}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as Record<string, unknown>;
	const items = Array.isArray(json.value) ? json.value : [];
	return items.map((it) => {
		const obj = it as Record<string, unknown>;
		return {
			id: typeof obj.id === "string" ? obj.id : "",
			summary: typeof obj.name === "string" ? obj.name : "",
		};
	});
}

export async function listMicrosoftEvents(
	accountEmail: string,
	calendarId = "AAAAA==",
	range?: { fromIso: string; toIso: string },
): Promise<ExternalEvent[]> {
	const params = new URLSearchParams({
		$top: "250",
		$orderby: "start/dateTime",
		$select:
			"id,subject,bodyPreview,start,end,isAllDay,location,status,@odata.etag",
	});
	if (range) {
		const fromLocal = new Date(range.fromIso).toISOString();
		const toLocal = new Date(range.toIso).toISOString();
		params.set(
			"$filter",
			`start/dateTime ge '${fromLocal.slice(0, 19)}' and end/dateTime le '${toLocal.slice(0, 19)}'`,
		);
	}
	const res = await graphFetch(
		accountEmail,
		`/me/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
	);
	if (!res.ok) {
		throw new Error(
			`Microsoft listEvents HTTP ${res.status}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as Record<string, unknown>;
	const items = Array.isArray(json.value) ? json.value : [];
	return items.map((it) =>
		toExternalEvent(it as Record<string, unknown>, calendarId),
	);
}

export async function createMicrosoftEvent(
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
		subject: event.title,
		body: event.description
			? { contentType: "text", content: event.description }
			: undefined,
		start: toGraphDateTime(event.startTime, event.isAllDay ?? false),
		end: toGraphDateTime(event.endTime, event.isAllDay ?? false),
		location:
			event.location != null ? { displayName: event.location } : undefined,
		isAllDay: event.isAllDay ?? false,
	};
	const res = await graphFetch(
		accountEmail,
		`/me/calendars/${encodeURIComponent(calendarId)}/events`,
		{ method: "POST", body: JSON.stringify(body) },
	);
	if (!res.ok) {
		throw new Error(
			`Microsoft createEvent HTTP ${res.status}: ${await res.text()}`,
		);
	}
	const raw = (await res.json()) as Record<string, unknown>;
	return toExternalEvent(raw, calendarId);
}

export async function updateMicrosoftEvent(
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
	if (patch.title !== undefined) body.subject = patch.title;
	if (patch.description !== undefined)
		body.body = { contentType: "text", content: patch.description ?? "" };
	if (patch.startTime !== undefined)
		body.start = toGraphDateTime(patch.startTime, patch.isAllDay ?? false);
	if (patch.endTime !== undefined)
		body.end = toGraphDateTime(patch.endTime, patch.isAllDay ?? false);
	if (patch.location !== undefined)
		body.location = { displayName: patch.location ?? "" };
	const res = await graphFetch(
		accountEmail,
		`/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`,
		{
			method: "PATCH",
			body: JSON.stringify(body),
			headers: { "Content-Type": "application/json" },
		},
	);
	if (!res.ok) {
		throw new Error(
			`Microsoft updateEvent HTTP ${res.status}: ${await res.text()}`,
		);
	}
	const raw = (await res.json()) as Record<string, unknown>;
	return toExternalEvent(raw, calendarId);
}

export async function deleteMicrosoftEvent(
	accountEmail: string,
	calendarId: string,
	externalId: string,
): Promise<void> {
	const res = await graphFetch(
		accountEmail,
		`/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`,
		{ method: "DELETE" },
	);
	if (!res.ok && res.status !== 204) {
		throw new Error(
			`Microsoft deleteEvent HTTP ${res.status}: ${await res.text()}`,
		);
	}
}

export const microsoftDateUtil = {
	toGraphDateTime,
	parseGraphDateTime,
};
