import { create } from "zustand";
import {
	createInvite,
	createWorkspace,
	deleteWorkspace,
	getUserWorkspaces,
	getWorkspaceInvites,
	getWorkspaceMembers,
	removeMember,
	updateMemberRole,
	updateWorkspace,
} from "./supabase";
import type { Database } from "./supabase.types";

type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
type MemberRow = Database["public"]["Tables"]["workspace_members"]["Row"];
type InviteRow = Database["public"]["Tables"]["workspace_invites"]["Row"];
type MemberRole = Database["public"]["Enums"]["member_role"];

const LOCAL_WORKSPACE_KEY = "focustap-local-workspace";

function getLocalWorkspace(): WorkspaceRow {
	const raw = localStorage.getItem(LOCAL_WORKSPACE_KEY);
	if (raw) {
		try {
			return JSON.parse(raw);
		} catch {
			// parse failed — use default
		}
	}
	return {
		id: "local",
		name: "Personal",
		description: "Your local workspace",
		created_by: "local",
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

interface WorkspaceState {
	workspaces: WorkspaceRow[];
	activeWorkspaceId: string | null;
	members: MemberRow[];
	invites: InviteRow[];
	loading: boolean;
	panelOpen: boolean;

	setPanelOpen: (open: boolean) => void;
	loadWorkspaces: () => Promise<void>;
	setActiveWorkspace: (id: string) => Promise<void>;
	createWorkspace: (name: string, description?: string) => Promise<void>;
	updateWorkspace: (id: string, name: string) => Promise<void>;
	deleteWorkspace: (id: string) => Promise<void>;

	loadMembers: (workspaceId: string) => Promise<void>;
	updateMemberRole: (memberId: string, role: MemberRole) => Promise<void>;
	removeMember: (memberId: string) => Promise<void>;

	loadInvites: (workspaceId: string) => Promise<void>;
	createInvite: (
		workspaceId: string,
		email: string,
		role: MemberRole,
	) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
	workspaces: [],
	activeWorkspaceId: null,
	members: [],
	invites: [],
	loading: false,
	panelOpen: false,

	setPanelOpen: (open) => set({ panelOpen: open }),

	loadWorkspaces: async () => {
		set({ loading: true });
		try {
			const workspaces = await getUserWorkspaces();
			if (workspaces.length > 0) {
				set({
					workspaces,
					activeWorkspaceId: workspaces[0]?.id ?? null,
					loading: false,
				});
				if (workspaces[0]) {
					get().loadMembers(workspaces[0].id);
					get().loadInvites(workspaces[0].id);
				}
				return;
			}
		} catch {
			// supabase unavailable — use local workspace
		}
		// Fallback: use local workspace
		const local = getLocalWorkspace();
		set({
			workspaces: [local],
			activeWorkspaceId: local.id,
			loading: false,
		});
	},

	setActiveWorkspace: async (id) => {
		set({ activeWorkspaceId: id });
		get().loadMembers(id);
		get().loadInvites(id);
	},

	createWorkspace: async (name, description) => {
		const ws = await createWorkspace(name, description);
		await get().loadWorkspaces();
		set({ activeWorkspaceId: ws.id });
	},

	updateWorkspace: async (id, name) => {
		await updateWorkspace(id, { name });
		await get().loadWorkspaces();
	},

	deleteWorkspace: async (id) => {
		await deleteWorkspace(id);
		const workspaces = get().workspaces.filter((w) => w.id !== id);
		set({
			workspaces,
			activeWorkspaceId: workspaces[0]?.id ?? null,
		});
	},

	loadMembers: async (workspaceId) => {
		try {
			const members = await getWorkspaceMembers(workspaceId);
			set({ members });
		} catch {
			// silently fail — user may not have permission
		}
	},

	updateMemberRole: async (memberId, role) => {
		await updateMemberRole(memberId, role);
		const { activeWorkspaceId } = get();
		if (activeWorkspaceId) get().loadMembers(activeWorkspaceId);
	},

	removeMember: async (memberId) => {
		await removeMember(memberId);
		const { activeWorkspaceId } = get();
		if (activeWorkspaceId) get().loadMembers(activeWorkspaceId);
	},

	loadInvites: async (workspaceId) => {
		try {
			const invites = await getWorkspaceInvites(workspaceId);
			set({ invites });
		} catch {
			// silently fail
		}
	},

	createInvite: async (workspaceId, email, role) => {
		await createInvite({
			workspace_id: workspaceId,
			email,
			role,
			invited_by: "", // will be set by RLS / trigger
		});
		await get().loadInvites(workspaceId);
	},
}));
