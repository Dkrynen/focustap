export interface Database {
	public: {
		Tables: {
			workspaces: {
				Row: WorkspaceRow;
				Insert: WorkspaceInsert;
				Update: WorkspaceUpdate;
				Relationships: [];
			};
			workspace_members: {
				Row: WorkspaceMemberRow;
				Insert: WorkspaceMemberInsert;
				Update: WorkspaceMemberUpdate;
				Relationships: [];
			};
			team_tasks: {
				Row: TeamTaskRow;
				Insert: TeamTaskInsert;
				Update: TeamTaskUpdate;
				Relationships: [];
			};
			task_assignees: {
				Row: TaskAssigneeRow;
				Insert: TaskAssigneeInsert;
				Update: TaskAssigneeUpdate;
				Relationships: [];
			};
			task_comments: {
				Row: TaskCommentRow;
				Insert: TaskCommentInsert;
				Update: TaskCommentUpdate;
				Relationships: [];
			};
			workspace_invites: {
				Row: WorkspaceInviteRow;
				Insert: WorkspaceInviteInsert;
				Update: WorkspaceInviteUpdate;
				Relationships: [];
			};
			calendar_event_links: {
				Row: CalendarEventLinkRow;
				Insert: CalendarEventLinkInsert;
				Update: CalendarEventLinkUpdate;
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: {
			member_role: "owner" | "admin" | "member";
			invite_status: "pending" | "accepted" | "declined" | "expired";
			task_status: "todo" | "in_progress" | "done" | "cancelled";
		};
	};
}

/* ── Workspaces ── */

export interface WorkspaceRow {
	id: string;
	name: string;
	description: string | null;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface WorkspaceInsert {
	id?: string;
	name: string;
	description?: string | null;
	created_by: string;
	created_at?: string;
	updated_at?: string;
}

export interface WorkspaceUpdate {
	name?: string;
	description?: string | null;
	updated_at?: string;
}

/* ── Workspace Members ── */

export interface WorkspaceMemberRow {
	id: string;
	workspace_id: string;
	user_id: string;
	role: "owner" | "admin" | "member";
	joined_at: string;
}

export interface WorkspaceMemberInsert {
	id?: string;
	workspace_id: string;
	user_id: string;
	role: "owner" | "admin" | "member";
	joined_at?: string;
}

export interface WorkspaceMemberUpdate {
	role?: "owner" | "admin" | "member";
}

/* ── Team Tasks ── */

export interface TeamTaskRow {
	id: string;
	workspace_id: string;
	title: string;
	description: string | null;
	status: "todo" | "in_progress" | "done" | "cancelled";
	priority: number;
	due_date: string | null;
	created_by: string;
	assigned_to: string | null;
	parent_id: string | null;
	sort_order: number;
	tags: string[];
	created_at: string;
	updated_at: string;
}

export interface TeamTaskInsert {
	id?: string;
	workspace_id: string;
	title: string;
	description?: string | null;
	status?: "todo" | "in_progress" | "done" | "cancelled";
	priority?: number;
	due_date?: string | null;
	created_by: string;
	assigned_to?: string | null;
	parent_id?: string | null;
	sort_order?: number;
	tags?: string[];
	created_at?: string;
	updated_at?: string;
}

export interface TeamTaskUpdate {
	title?: string;
	description?: string | null;
	status?: "todo" | "in_progress" | "done" | "cancelled";
	priority?: number;
	due_date?: string | null;
	assigned_to?: string | null;
	parent_id?: string | null;
	sort_order?: number;
	tags?: string[];
	updated_at?: string;
}

/* ── Task Assignees ── */

export interface TaskAssigneeRow {
	id: string;
	task_id: string;
	user_id: string;
	assigned_at: string;
}

export interface TaskAssigneeInsert {
	id?: string;
	task_id: string;
	user_id: string;
	assigned_at?: string;
}

export interface TaskAssigneeUpdate {
	assigned_at?: string;
}

/* ── Task Comments ── */

export interface TaskCommentRow {
	id: string;
	task_id: string;
	user_id: string;
	content: string;
	created_at: string;
	updated_at: string;
}

export interface TaskCommentInsert {
	id?: string;
	task_id: string;
	user_id: string;
	content: string;
	created_at?: string;
	updated_at?: string;
}

export interface TaskCommentUpdate {
	content?: string;
	updated_at?: string;
}

/* ── Workspace Invites ── */

export interface WorkspaceInviteRow {
	id: string;
	workspace_id: string;
	email: string;
	role: "owner" | "admin" | "member";
	invited_by: string;
	status: "pending" | "accepted" | "declined" | "expired";
	created_at: string;
	expires_at: string;
}

export interface WorkspaceInviteInsert {
	id?: string;
	workspace_id: string;
	email: string;
	role: "owner" | "admin" | "member";
	invited_by: string;
	status?: "pending" | "accepted" | "declined" | "expired";
	created_at?: string;
	expires_at?: string;
}

export interface WorkspaceInviteUpdate {
	role?: "owner" | "admin" | "member";
	status?: "pending" | "accepted" | "declined" | "expired";
}

/* ── Calendar Event Links (cross-device sync) ── */

export interface CalendarEventLinkRow {
	id: string;
	user_id: string;
	workspace_id: string | null;
	team_task_id: string | null;
	local_task_id: number | null;
	provider: "google" | "microsoft";
	external_event_id: string;
	calendar_id: string | null;
	etag: string | null;
	last_synced_at: string | null;
	sync_direction: "bidirectional" | "local_to_remote" | "remote_to_local";
	created_at: string;
	updated_at: string;
}

export interface CalendarEventLinkInsert {
	id?: string;
	user_id: string;
	workspace_id?: string | null;
	team_task_id?: string | null;
	local_task_id?: number | null;
	provider: "google" | "microsoft";
	external_event_id: string;
	calendar_id?: string | null;
	etag?: string | null;
	last_synced_at?: string | null;
	sync_direction?: "bidirectional" | "local_to_remote" | "remote_to_local";
}

export interface CalendarEventLinkUpdate {
	team_task_id?: string | null;
	local_task_id?: number | null;
	calendar_id?: string | null;
	etag?: string | null;
	last_synced_at?: string | null;
	sync_direction?: "bidirectional" | "local_to_remote" | "remote_to_local";
}
