import type { ExternalEvent } from "./calendar-api-google";
import {
	createGoogleEvent,
	deleteGoogleEvent,
	listGoogleEvents,
	updateGoogleEvent,
} from "./calendar-api-google";
import {
	createMicrosoftEvent,
	deleteMicrosoftEvent,
	listMicrosoftEvents,
	updateMicrosoftEvent,
} from "./calendar-api-microsoft";
import {
	type CalendarProvider,
	type CalendarSyncState,
	createPullTask,
	deleteCalendarEventLink,
	getCalendarEventLinkByExternal,
	getCalendarEventLinkByTask,
	getCalendarSyncState,
	insertCalendarEventLink,
	listCalendarTokens,
	updateCalendarEventLinkSync,
	updateTaskDate,
	updateTaskText,
	upsertCalendarSyncState,
} from "./db";

export interface SyncResult {
	provider: CalendarProvider;
	accountEmail: string;
	pulled: number;
	pushed: number;
	deleted: number;
	errors: string[];
	newSyncToken: string | null;
}

export interface PullRange {
	fromIso: string;
	toIso: string;
}

export type CalendarItem = {
	kind: "task" | "event";
	source: "local" | "google" | "microsoft";
	id: string;
	title: string;
	startDate: string;
	isDone?: boolean;
	color?: string;
};

const DEFAULT_RANGE_DAYS_BACK = -30;
const DEFAULT_RANGE_DAYS_FORWARD = 90;
const PROVIDER_TAG: Record<CalendarProvider, string> = {
	google: "google",
	microsoft: "microsoft",
};

function defaultRange(): PullRange {
	const now = new Date();
	const from = new Date(now);
	from.setDate(now.getDate() + DEFAULT_RANGE_DAYS_BACK);
	const to = new Date(now);
	to.setDate(now.getDate() + DEFAULT_RANGE_DAYS_FORWARD);
	return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

function eventToTaskDate(event: ExternalEvent): string {
	return event.startTime.slice(0, 10);
}

async function fetchEvents(
	provider: CalendarProvider,
	accountEmail: string,
	calendarId: string,
	range: PullRange,
): Promise<ExternalEvent[]> {
	if (provider === "google") {
		return await listGoogleEvents(accountEmail, calendarId, range);
	}
	return await listMicrosoftEvents(accountEmail, calendarId, range);
}

export async function pullEvents(
	provider: CalendarProvider,
	accountEmail: string,
	calendarId = provider === "google" ? "primary" : "AAAAA==",
	range: PullRange = defaultRange(),
): Promise<SyncResult> {
	const result: SyncResult = {
		provider,
		accountEmail,
		pulled: 0,
		pushed: 0,
		deleted: 0,
		errors: [],
		newSyncToken: null,
	};

	let events: ExternalEvent[];
	try {
		events = await fetchEvents(provider, accountEmail, calendarId, range);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/401|invalid_token|expired/i.test(msg)) {
			result.errors.push(
				`Auth expired for ${accountEmail}. Reconnect required.`,
			);
		} else {
			result.errors.push(`Fetch failed: ${msg}`);
		}
		return result;
	}

	const tag = PROVIDER_TAG[provider];

	for (const event of events) {
		try {
			if (event.status === "cancelled") {
				const existing = await getCalendarEventLinkByExternal(
					provider,
					event.externalId,
				);
				if (existing) {
					await deleteCalendarEventLink(existing.id);
					result.deleted++;
				}
				continue;
			}

			const link = await getCalendarEventLinkByExternal(
				provider,
				event.externalId,
			);

			if (link) {
				if (event.etag && link.etag !== event.etag) {
					await updateTaskText(link.task_id, event.title);
					await updateTaskDate(link.task_id, eventToTaskDate(event));
					await updateCalendarEventLinkSync(link.id, event.etag);
					result.pulled++;
				}
				continue;
			}

			const taskId = await createPullTask(
				event.title,
				eventToTaskDate(event),
				tag,
				0,
			);
			await insertCalendarEventLink(
				provider,
				taskId,
				event.externalId,
				calendarId,
				event.etag,
				"bidirectional",
			);
			result.pulled++;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			result.errors.push(`Failed syncing event ${event.externalId}: ${msg}`);
		}
	}

	let syncState: CalendarSyncState | null = null;
	try {
		syncState = await getCalendarSyncState(provider, calendarId);
	} catch {
		// optional — non-fatal
	}
	const lastFullSync = new Date().toISOString();
	try {
		await upsertCalendarSyncState(
			provider,
			calendarId,
			syncState?.sync_token ?? null,
			syncState?.delta_link ?? null,
			lastFullSync,
		);
		result.newSyncToken = syncState?.sync_token ?? null;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		result.errors.push(`Failed persisting sync state: ${msg}`);
	}

	return result;
}

export async function pullAll(
	range: PullRange = defaultRange(),
): Promise<SyncResult[]> {
	const tokens = await listCalendarTokens();
	const results: SyncResult[] = [];
	for (const token of tokens) {
		const calendarId = token.provider === "google" ? "primary" : "AAAAA==";
		try {
			const res = await pullEvents(
				token.provider,
				token.account_email,
				calendarId,
				range,
			);
			results.push(res);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			results.push({
				provider: token.provider,
				accountEmail: token.account_email,
				pulled: 0,
				pushed: 0,
				deleted: 0,
				errors: [`Pull failed: ${msg}`],
				newSyncToken: null,
			});
		}
	}
	return results;
}

export function summarizeSync(results: SyncResult[]): {
	totalPulled: number;
	totalDeleted: number;
	totalErrors: number;
	messages: string[];
} {
	let totalPulled = 0;
	let totalDeleted = 0;
	let totalErrors = 0;
	const messages: string[] = [];
	for (const r of results) {
		totalPulled += r.pulled;
		totalDeleted += r.deleted;
		totalErrors += r.errors.length;
		if (r.pulled || r.deleted || r.errors.length) {
			messages.push(
				`${r.provider} (${r.accountEmail}): ${r.pulled} pulled, ${r.deleted} deleted, ${r.errors.length} errors`,
			);
		}
		if (r.errors.length) {
			for (const err of r.errors) messages.push(`  • ${err}`);
		}
	}
	return { totalPulled, totalDeleted, totalErrors, messages };
}

/* ── Push Sync Queue ── */

type CalendarOpType =
	| "cal_event_create"
	| "cal_event_update"
	| "cal_event_delete";

interface CalendarPushPayload {
	title?: string;
	description?: string | null;
	startTime?: string;
	endTime?: string;
	isAllDay?: boolean;
}

interface CalendarPendingOp {
	id: string;
	type: CalendarOpType;
	provider: CalendarProvider;
	accountEmail: string;
	taskId: number;
	calendarId: string;
	externalId: string | null;
	linkId: number | null;
	payload: CalendarPushPayload;
	created_at: string;
	retries: number;
}

const CALENDAR_QUEUE_KEY = "focustap-calendar-push-queue";
const CALENDAR_MAX_RETRIES = 3;
const CALENDAR_FLUSH_DEBOUNCE_MS = 60_000;

function loadCalendarQueue(): CalendarPendingOp[] {
	try {
		const raw = localStorage.getItem(CALENDAR_QUEUE_KEY);
		return raw ? (JSON.parse(raw) as CalendarPendingOp[]) : [];
	} catch {
		return [];
	}
}

function saveCalendarQueue(queue: CalendarPendingOp[]): void {
	localStorage.setItem(CALENDAR_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueCalendarOp(
	op: Omit<CalendarPendingOp, "id" | "created_at" | "retries">,
): void {
	const queue = loadCalendarQueue();
	queue.push({
		...op,
		id: crypto.randomUUID(),
		created_at: new Date().toISOString(),
		retries: 0,
	});
	saveCalendarQueue(queue);
}

export function getCalendarPushQueueLength(): number {
	return loadCalendarQueue().length;
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleCalendarFlush(): void {
	if (flushTimer) clearTimeout(flushTimer);
	flushTimer = setTimeout(() => {
		calendarSyncFlush().catch((e) => {
			console.warn("[calendar-sync] flush failed", e);
		});
	}, CALENDAR_FLUSH_DEBOUNCE_MS);
}

export async function calendarSyncFlush(): Promise<{
	flushed: number;
	failed: number;
}> {
	const queue = loadCalendarQueue();
	if (queue.length === 0) return { flushed: 0, failed: 0 };

	let flushed = 0;
	let failed = 0;

	for (const op of queue) {
		try {
			if (op.type === "cal_event_create") {
				const p = op.payload;
				const eventArg = {
					title: p.title ?? "(untitled)",
					startTime: p.startTime ?? new Date().toISOString(),
					endTime: p.endTime ?? new Date().toISOString(),
					isAllDay: p.isAllDay ?? false,
				};
				const created =
					op.provider === "google"
						? await createGoogleEvent(op.accountEmail, op.calendarId, eventArg)
						: await createMicrosoftEvent(
								op.accountEmail,
								op.calendarId,
								eventArg,
							);
				await insertCalendarEventLink(
					op.provider,
					op.taskId,
					created.externalId,
					op.calendarId,
					created.etag,
					"bidirectional",
				);
			} else if (op.type === "cal_event_update") {
				if (!op.externalId || op.linkId === null) {
					throw new Error("missing externalId or linkId for update");
				}
				const updated =
					op.provider === "google"
						? await updateGoogleEvent(
								op.accountEmail,
								op.calendarId,
								op.externalId,
								op.payload,
							)
						: await updateMicrosoftEvent(
								op.accountEmail,
								op.calendarId,
								op.externalId,
								op.payload,
							);
				await updateCalendarEventLinkSync(op.linkId, updated.etag);
			} else if (op.type === "cal_event_delete") {
				if (!op.externalId) {
					throw new Error("missing externalId for delete");
				}
				if (op.provider === "google") {
					await deleteGoogleEvent(
						op.accountEmail,
						op.calendarId,
						op.externalId,
					);
				} else {
					await deleteMicrosoftEvent(
						op.accountEmail,
						op.calendarId,
						op.externalId,
					);
				}
				if (op.linkId !== null) {
					await deleteCalendarEventLink(op.linkId);
				}
			}
			flushed++;
		} catch (_e) {
			op.retries++;
			failed++;
			if (op.retries >= CALENDAR_MAX_RETRIES) {
				console.warn(
					`[calendar-sync] dropping op ${op.id} (${op.type}) after ${CALENDAR_MAX_RETRIES} retries`,
				);
			}
		}
	}

	const remaining = queue.filter(
		(o) => o.retries > 0 && o.retries < CALENDAR_MAX_RETRIES,
	);
	saveCalendarQueue(remaining);
	return { flushed, failed };
}

/* ── Push Enqueue Helpers ── */

function defaultCalendarId(provider: CalendarProvider): string {
	return provider === "google" ? "primary" : "AAAAA==";
}

function taskDateToEventRange(taskDate: string): {
	startTime: string;
	endTime: string;
} {
	const start = new Date(`${taskDate}T09:00:00`);
	const end = new Date(`${taskDate}T10:00:00`);
	return { startTime: start.toISOString(), endTime: end.toISOString() };
}

export async function enqueueTaskCreate(
	taskId: number,
	title: string,
	taskDate: string | null,
): Promise<void> {
	if (!taskDate) return;
	const tokens = await listCalendarTokens();
	if (tokens.length === 0) return;
	const token = tokens[0];
	const { startTime, endTime } = taskDateToEventRange(taskDate);
	enqueueCalendarOp({
		type: "cal_event_create",
		provider: token.provider,
		accountEmail: token.account_email,
		taskId,
		calendarId: defaultCalendarId(token.provider),
		externalId: null,
		linkId: null,
		payload: { title, startTime, endTime, isAllDay: false },
	});
	scheduleCalendarFlush();
}

export async function enqueueTaskUpdate(
	taskId: number,
	patch: { title?: string; taskDate?: string | null },
): Promise<void> {
	const links = await getCalendarEventLinkByTask(taskId);
	if (links.length === 0) return;
	const link = links[0];
	const tokens = await listCalendarTokens();
	const token = tokens.find((t) => t.provider === link.provider);
	if (!token) return;
	const payload: CalendarPushPayload = {};
	if (patch.title !== undefined) payload.title = patch.title;
	if (patch.taskDate) {
		const { startTime, endTime } = taskDateToEventRange(patch.taskDate);
		payload.startTime = startTime;
		payload.endTime = endTime;
	}
	if (Object.keys(payload).length === 0) return;
	enqueueCalendarOp({
		type: "cal_event_update",
		provider: link.provider,
		accountEmail: token.account_email,
		taskId,
		calendarId: link.calendar_id ?? defaultCalendarId(link.provider),
		externalId: link.external_event_id,
		linkId: link.id,
		payload,
	});
	scheduleCalendarFlush();
}

export async function enqueueTaskDelete(taskId: number): Promise<void> {
	const links = await getCalendarEventLinkByTask(taskId);
	if (links.length === 0) return;
	const link = links[0];
	const tokens = await listCalendarTokens();
	const token = tokens.find((t) => t.provider === link.provider);
	if (!token) return;
	enqueueCalendarOp({
		type: "cal_event_delete",
		provider: link.provider,
		accountEmail: token.account_email,
		taskId,
		calendarId: link.calendar_id ?? defaultCalendarId(link.provider),
		externalId: link.external_event_id,
		linkId: link.id,
		payload: {},
	});
	scheduleCalendarFlush();
}
