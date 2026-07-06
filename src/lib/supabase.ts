import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";

let _client: SupabaseClient | null = null;
let _initError: Error | null = null;

function getUrl(): string {
	const url = import.meta.env.VITE_SUPABASE_URL as string;
	if (!url) {
		throw new Error("VITE_SUPABASE_URL is not set. Add it to your .env file.");
	}
	return url;
}

function getAnonKey(): string {
	const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
	if (!key) {
		throw new Error(
			"VITE_SUPABASE_ANON_KEY is not set. Add it to your .env file.",
		);
	}
	return key;
}

/**
 * Get the Supabase client singleton.
 * Throws if env vars are missing or initialization fails.
 */
export function getSupabase(): SupabaseClient {
	if (_client) return _client;
	if (_initError) throw _initError;

	try {
		_client = createClient(getUrl(), getAnonKey(), {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
				storageKey: "focustap-auth",
			},
		});
		return _client;
	} catch (e) {
		_initError = e instanceof Error ? e : new Error(String(e));
		throw _initError;
	}
}

/**
 * Reset the client singleton (e.g. on sign-out).
 */
export function resetSupabase(): void {
	_client = null;
	_initError = null;
}

/* ── Workspace Queries ── */

export async function getUserWorkspaces(): Promise<
	Database["public"]["Tables"]["workspaces"]["Row"][]
> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("workspaces")
		.select("*")
		.order("created_at", { ascending: false });
	if (error) throw error;
	return data;
}

export async function getWorkspace(
	id: string,
): Promise<Database["public"]["Tables"]["workspaces"]["Row"] | null> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("workspaces")
		.select("*")
		.eq("id", id)
		.single();
	if (error) {
		if (error.code === "PGRST116") return null; // not found
		throw error;
	}
	return data;
}

export async function createWorkspace(
	name: string,
	description?: string,
): Promise<Database["public"]["Tables"]["workspaces"]["Row"]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("workspaces")
		.insert({ name, description: description ?? null })
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function updateWorkspace(
	id: string,
	updates: Database["public"]["Tables"]["workspaces"]["Update"],
): Promise<Database["public"]["Tables"]["workspaces"]["Row"]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("workspaces")
		.update(updates)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteWorkspace(id: string): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase.from("workspaces").delete().eq("id", id);
	if (error) throw error;
}

/* ── Workspace Members ── */

export async function getWorkspaceMembers(
	workspaceId: string,
): Promise<Database["public"]["Tables"]["workspace_members"]["Row"][]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("workspace_members")
		.select("*")
		.eq("workspace_id", workspaceId);
	if (error) throw error;
	return data;
}

export async function addWorkspaceMember(
	workspaceId: string,
	userId: string,
	role: Database["public"]["Enums"]["member_role"] = "member",
): Promise<Database["public"]["Tables"]["workspace_members"]["Row"]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("workspace_members")
		.insert({ workspace_id: workspaceId, user_id: userId, role })
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function updateMemberRole(
	memberId: string,
	role: Database["public"]["Enums"]["member_role"],
): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase
		.from("workspace_members")
		.update({ role })
		.eq("id", memberId);
	if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase
		.from("workspace_members")
		.delete()
		.eq("id", memberId);
	if (error) throw error;
}

/* ── Team Tasks ── */

export async function getWorkspaceTasks(
	workspaceId: string,
	status?: Database["public"]["Enums"]["task_status"],
): Promise<Database["public"]["Tables"]["team_tasks"]["Row"][]> {
	const supabase = getSupabase();
	let query = supabase
		.from("team_tasks")
		.select("*")
		.eq("workspace_id", workspaceId)
		.order("sort_order", { ascending: true });
	if (status) {
		query = query.eq("status", status);
	}
	const { data, error } = await query;
	if (error) throw error;
	return data;
}

export async function getTeamTask(
	id: string,
): Promise<Database["public"]["Tables"]["team_tasks"]["Row"] | null> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("team_tasks")
		.select("*")
		.eq("id", id)
		.single();
	if (error) {
		if (error.code === "PGRST116") return null;
		throw error;
	}
	return data;
}

export async function createTeamTask(
	task: Database["public"]["Tables"]["team_tasks"]["Insert"],
): Promise<Database["public"]["Tables"]["team_tasks"]["Row"]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("team_tasks")
		.insert(task)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function updateTeamTask(
	id: string,
	updates: Database["public"]["Tables"]["team_tasks"]["Update"],
): Promise<Database["public"]["Tables"]["team_tasks"]["Row"]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("team_tasks")
		.update(updates)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteTeamTask(id: string): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase.from("team_tasks").delete().eq("id", id);
	if (error) throw error;
}

export async function getAssignedTasks(
	userId: string,
): Promise<Database["public"]["Tables"]["team_tasks"]["Row"][]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("team_tasks")
		.select("*")
		.eq("assigned_to", userId)
		.order("due_date", { ascending: true, nullsFirst: false });
	if (error) throw error;
	return data;
}

/* ── Task Comments ── */

export async function getTaskComments(
	taskId: string,
): Promise<Database["public"]["Tables"]["task_comments"]["Row"][]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("task_comments")
		.select("*")
		.eq("task_id", taskId)
		.order("created_at", { ascending: true });
	if (error) throw error;
	return data;
}

export async function addComment(
	comment: Database["public"]["Tables"]["task_comments"]["Insert"],
): Promise<Database["public"]["Tables"]["task_comments"]["Row"]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("task_comments")
		.insert(comment)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function updateComment(
	id: string,
	content: string,
): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase
		.from("task_comments")
		.update({ content })
		.eq("id", id);
	if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase.from("task_comments").delete().eq("id", id);
	if (error) throw error;
}

/* ── Workspace Invites ── */

export async function getWorkspaceInvites(
	workspaceId: string,
): Promise<Database["public"]["Tables"]["workspace_invites"]["Row"][]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("workspace_invites")
		.select("*")
		.eq("workspace_id", workspaceId)
		.order("created_at", { ascending: false });
	if (error) throw error;
	return data;
}

export async function createInvite(
	invite: Database["public"]["Tables"]["workspace_invites"]["Insert"],
): Promise<Database["public"]["Tables"]["workspace_invites"]["Row"]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from("workspace_invites")
		.insert(invite)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function respondToInvite(
	inviteId: string,
	status: "accepted" | "declined",
): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase
		.from("workspace_invites")
		.update({ status })
		.eq("id", inviteId);
	if (error) throw error;
}

/* ── Auth Helpers ── */

export async function signInWithMagicLink(
	email: string,
): Promise<{ success: boolean }> {
	const supabase = getSupabase();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: { shouldCreateUser: true },
	});
	if (error) throw error;
	return { success: true };
}

export async function signOut(): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
	resetSupabase();
}

export async function getCurrentSession() {
	const supabase = getSupabase();
	const { data, error } = await supabase.auth.getSession();
	if (error) throw error;
	return data.session;
}

export async function getCurrentUser() {
	const supabase = getSupabase();
	const { data, error } = await supabase.auth.getUser();
	if (error) throw error;
	return data.user;
}
