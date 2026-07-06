import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, getWorkspaceTasks } from "./supabase";
import type { Database } from "./supabase.types";

type TeamTaskRow = Database["public"]["Tables"]["team_tasks"]["Row"];
type TeamTaskUpdate = Database["public"]["Tables"]["team_tasks"]["Update"];

interface PendingOp {
	id: string;
	type: "task_insert" | "task_update" | "task_delete" | "comment_insert";
	payload: Record<string, unknown>;
	created_at: string;
	retries: number;
}

const STORAGE_KEY = "focustap-sync-queue";
const CACHE_KEY = "focustap-team-tasks-cache";
const MAX_RETRIES = 5;

/* ── Offline Queue ── */

function loadQueue(): PendingOp[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as PendingOp[]) : [];
	} catch {
		return [];
	}
}

function saveQueue(queue: PendingOp[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueueOp(
	op: Omit<PendingOp, "id" | "created_at" | "retries">,
): void {
	const queue = loadQueue();
	queue.push({
		...op,
		id: crypto.randomUUID(),
		created_at: new Date().toISOString(),
		retries: 0,
	});
	saveQueue(queue);
}

export function getQueueLength(): number {
	return loadQueue().length;
}

export async function flushQueue(): Promise<{
	flushed: number;
	failed: number;
}> {
	const queue = loadQueue();
	if (queue.length === 0) return { flushed: 0, failed: 0 };

	const supabase = getSupabase();
	let flushed = 0;
	let failed = 0;

	for (const op of queue) {
		try {
			switch (op.type) {
				case "task_insert": {
					const { error } = await supabase
						.from("team_tasks")
						.insert(
							op.payload as unknown as Database["public"]["Tables"]["team_tasks"]["Insert"],
						);
					if (error) throw error;
					break;
				}
				case "task_update": {
					const payload = op.payload as unknown as {
						id: string;
					} & TeamTaskUpdate;
					const { id, ...updates } = payload;
					const { error } = await supabase
						.from("team_tasks")
						.update(updates)
						.eq("id", id);
					if (error) throw error;
					break;
				}
				case "task_delete": {
					const { id } = op.payload as unknown as { id: string };
					const { error } = await supabase
						.from("team_tasks")
						.delete()
						.eq("id", id);
					if (error) throw error;
					break;
				}
				case "comment_insert": {
					const { error } = await supabase
						.from("task_comments")
						.insert(
							op.payload as unknown as Database["public"]["Tables"]["task_comments"]["Insert"],
						);
					if (error) throw error;
					break;
				}
			}
			flushed++;
		} catch {
			op.retries++;
			failed++;
			if (op.retries >= MAX_RETRIES) {
				console.warn(
					`[sync] dropping op ${op.id} (${op.type}) after ${MAX_RETRIES} failed retries`,
				);
			}
		}
	}

	const remaining = queue.filter(
		(o) => o.retries > 0 && o.retries < MAX_RETRIES,
	);
	saveQueue(remaining);
	return { flushed, failed };
}

/* ── Task Cache ── */

interface TaskCache {
	[workspaceId: string]: {
		tasks: TeamTaskRow[];
		updated_at: string;
	};
}

function loadCache(): TaskCache {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		return raw ? (JSON.parse(raw) as TaskCache) : {};
	} catch {
		return {};
	}
}

function saveCache(cache: TaskCache): void {
	localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export async function pullTeamTasks(
	workspaceId: string,
): Promise<TeamTaskRow[]> {
	try {
		const tasks = await getWorkspaceTasks(workspaceId);
		const cache = loadCache();
		cache[workspaceId] = { tasks, updated_at: new Date().toISOString() };
		saveCache(cache);
		return tasks;
	} catch {
		const cache = loadCache();
		return cache[workspaceId]?.tasks ?? [];
	}
}

export function getCachedTasks(workspaceId: string): TeamTaskRow[] {
	const cache = loadCache();
	return cache[workspaceId]?.tasks ?? [];
}

/* ── Realtime Subscriptions ── */

const activeChannels = new Map<string, RealtimeChannel>();

export function subscribeWorkspace(
	workspaceId: string,
	onTaskChange: (
		task: TeamTaskRow,
		event: "INSERT" | "UPDATE" | "DELETE",
	) => void,
	onPresence: (onlineUsers: string[]) => void,
): () => void {
	const supabase = getSupabase();
	const channelName = `workspace-${workspaceId}`;

	if (activeChannels.has(channelName)) {
		return () => unsubscribeWorkspace(channelName);
	}

	const channel = supabase.channel(channelName);

	// Listen to task changes
	channel
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "team_tasks",
				filter: `workspace_id=eq.${workspaceId}`,
			},
			(payload) => {
				const event = payload.eventType.toUpperCase() as
					| "INSERT"
					| "UPDATE"
					| "DELETE";
				onTaskChange(payload.new as TeamTaskRow, event);
			},
		)
		// Track presence
		.on("presence", { event: "sync" }, () => {
			const state = channel.presenceState();
			const online = Object.keys(state);
			onPresence(online);
		})
		.subscribe(async (status) => {
			if (status === "SUBSCRIBED") {
				await channel.track({
					user_id: (await supabase.auth.getUser()).data.user?.id,
					online_at: new Date().toISOString(),
				});
			}
		});

	activeChannels.set(channelName, channel);

	return () => unsubscribeWorkspace(channelName);
}

function unsubscribeWorkspace(channelName: string): void {
	const channel = activeChannels.get(channelName);
	if (channel) {
		channel.unsubscribe();
		activeChannels.delete(channelName);
	}
}

export function unsubscribeAll(): void {
	for (const [name] of activeChannels) {
		unsubscribeWorkspace(name);
	}
}

/* ── Online status ── */

export function isOnline(): boolean {
	return navigator.onLine;
}

export function onOnlineChange(handler: (online: boolean) => void): () => void {
	const handleOnline = () => handler(true);
	const handleOffline = () => handler(false);
	window.addEventListener("online", handleOnline);
	window.addEventListener("offline", handleOffline);
	return () => {
		window.removeEventListener("online", handleOnline);
		window.removeEventListener("offline", handleOffline);
	};
}
