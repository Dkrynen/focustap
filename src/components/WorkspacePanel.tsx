import {
	Loader2,
	LogOut,
	Mail,
	Plus,
	Trash2,
	UserMinus,
	UserPlus,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useAuthStore } from "../lib/auth-store";
import { getQueueLength, isOnline, onOnlineChange } from "../lib/sync";
import { useWorkspaceStore } from "../lib/workspace-store";
import { CloseButton, SlideInPanel } from "./primitives";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

interface WorkspacePanelProps {
	open: boolean;
	onClose: () => void;
}

export function WorkspacePanel({ open, onClose }: WorkspacePanelProps) {
	const { t } = useTranslation();
	const panelRef = useRef<HTMLDivElement>(null);
	useFocusTrap(panelRef, open);
	const {
		workspaces,
		activeWorkspaceId,
		members,
		invites,
		loading,
		loadWorkspaces,
		setActiveWorkspace,
		createWorkspace,
		deleteWorkspace,
		updateMemberRole,
		removeMember,
		createInvite,
	} = useWorkspaceStore();
	const { user, logout } = useAuthStore();
	const [newName, setNewName] = useState("");
	const [inviteEmail, setInviteEmail] = useState("");
	const [creating, setCreating] = useState(false);
	const [online, setOnline] = useState(isOnline());
	const [pendingOps, setPendingOps] = useState(getQueueLength());

	useEffect(() => {
		if (open) loadWorkspaces();
	}, [open, loadWorkspaces]);

	useEffect(() => {
		const unsub = onOnlineChange(setOnline);
		return unsub;
	}, []);

	useEffect(() => {
		const interval = setInterval(() => setPendingOps(getQueueLength()), 3000);
		return () => clearInterval(interval);
	}, []);

	const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newName.trim()) return;
		setCreating(true);
		try {
			await createWorkspace(newName.trim());
			setNewName("");
		} finally {
			setCreating(false);
		}
	};

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail.trim() || !activeWorkspaceId) return;
		await createInvite(activeWorkspaceId, inviteEmail.trim(), "member");
		setInviteEmail("");
	};

	return (
		<SlideInPanel
			ref={panelRef}
			open={open}
			onClose={onClose}
			ariaLabel="Workspace settings"
			className="w-[320px]"
		>
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
				<span className="text-sm font-semibold text-text-primary">
					{t("workspace.title")}
				</span>
				<CloseButton onClick={onClose} />
			</div>

			{/* Connection status */}
			<div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
				{online ? (
					<Wifi size={11} className="text-green-400" />
				) : (
					<WifiOff size={11} className="text-red-400" />
				)}
				<span className="text-xs text-text-tertiary">
					{online ? "Connected" : "Offline"}
				</span>
				{pendingOps > 0 && (
					<span className="text-xs text-yellow-400 ml-auto">
						{pendingOps} pending
					</span>
				)}
			</div>

			<div className="flex-1 overflow-y-auto">
				{loading && (
					<div className="flex items-center justify-center py-8">
						<Loader2 size={16} className="animate-spin text-text-quaternary" />
					</div>
				)}

				{!loading && (
					<>
						{/* Workspace list */}
						<div className="px-4 pt-3 pb-2">
							<span className="text-xs font-medium text-text-quaternary uppercase tracking-wider">
								{t("workspace.workspaces")}
							</span>
						</div>
						<div className="px-2">
							{workspaces.map((ws) => (
								<button
									type="button"
									key={ws.id}
									onClick={() => setActiveWorkspace(ws.id)}
									className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer ${
										ws.id === activeWorkspaceId
											? "bg-accent-subtle text-accent-primary"
											: "text-text-secondary hover:bg-surface-secondary"
									} ${FOCUS_RING}`}
								>
									<span className="truncate flex-1 text-left">{ws.name}</span>
									{ws.id === activeWorkspaceId && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												deleteWorkspace(ws.id);
											}}
											className="text-text-quaternary hover:text-red-400 transition-colors cursor-pointer p-0.5"
										>
											<Trash2 size={11} />
										</button>
									)}
								</button>
							))}
						</div>

						{/* Create workspace */}
						<form onSubmit={handleCreate} className="px-4 pt-2 pb-3">
							<div className="flex gap-1.5">
								<input
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder={t("workspace.new_placeholder")}
									className="flex-1 h-8 px-2.5 text-xs bg-surface-deep border border-border-subtle rounded-[6px] text-text-primary placeholder:text-text-quaternary outline-none focus:border-accent-primary transition-colors"
								/>
								<button
									type="submit"
									disabled={creating || !newName.trim()}
									className="h-8 w-8 flex items-center justify-center bg-accent-primary text-white rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
								>
									{creating ? (
										<Loader2 size={12} className="animate-spin" />
									) : (
										<Plus size={12} />
									)}
								</button>
							</div>
						</form>

						{/* Active workspace details */}
						{activeWs && (
							<>
								<div className="border-t border-border-subtle" />

								{/* Members */}
								<div className="px-4 pt-3 pb-2 flex items-center justify-between">
									<span className="text-[11px] font-medium text-text-quaternary uppercase tracking-wider">
										{t("workspace.members")} ({members.length})
									</span>
								</div>
								<div className="px-2">
									{members.map((m) => (
										<div
											key={m.id}
											className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary"
										>
											<div className="w-6 h-6 rounded-full bg-accent-subtle flex items-center justify-center text-xs text-accent-primary font-medium shrink-0">
												{m.user_id.slice(0, 2).toUpperCase()}
											</div>
											<span className="truncate flex-1">
												{m.user_id === user?.id
													? `${m.user_id.slice(0, 8)}... (you)`
													: `${m.user_id.slice(0, 8)}...`}
											</span>
											<select
												value={m.role}
												onChange={(e) =>
													updateMemberRole(
														m.id,
														e.target.value as "owner" | "admin" | "member",
													)
												}
												className="text-xs bg-surface-deep border border-border-subtle rounded-[4px] px-1.5 py-0.5 text-text-secondary outline-none cursor-pointer"
											>
												<option value="owner">Owner</option>
												<option value="admin">Admin</option>
												<option value="member">Member</option>
											</select>
											{m.role !== "owner" && (
												<button
													type="button"
													onClick={() => removeMember(m.id)}
													className="text-text-quaternary hover:text-red-400 transition-colors cursor-pointer p-0.5"
												>
													<UserMinus size={11} />
												</button>
											)}
										</div>
									))}
								</div>

								{/* Invite */}
								<div className="px-4 pt-3 pb-2">
<span className="text-xs font-medium text-text-quaternary uppercase tracking-wider">
								{t("workspace.members")}
							</span>
								</div>
								<form onSubmit={handleInvite} className="px-4 pb-2">
									<div className="flex gap-1.5">
										<div className="relative flex-1">
											<Mail
												size={11}
												className="absolute left-2 top-1/2 -translate-y-1/2 text-text-quaternary"
											/>
											<input
												type="email"
												value={inviteEmail}
												onChange={(e) => setInviteEmail(e.target.value)}
												placeholder={t("workspace.invite_placeholder")}
												className="w-full h-8 pl-7 pr-2.5 text-xs bg-surface-deep border border-border-subtle rounded-[6px] text-text-primary placeholder:text-text-quaternary outline-none focus:border-accent-primary transition-colors"
											/>
										</div>
										<button
											type="submit"
											disabled={!inviteEmail.trim()}
											className="h-8 w-8 flex items-center justify-center bg-accent-primary text-white rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
										>
											<UserPlus size={12} />
										</button>
									</div>
								</form>

								{/* Pending invites */}
								{invites.filter((i) => i.status === "pending").length > 0 && (
									<div className="px-4 pb-2">
										<span className="text-xs text-text-quaternary">
											{t("workspace.pending_invites")}
										</span>
										{invites
											.filter((i) => i.status === "pending")
											.map((inv) => (
												<div
													key={inv.id}
													className="flex items-center gap-2 px-2 py-1 text-xs text-text-secondary"
												>
													<Mail size={10} className="shrink-0" />
													<span className="truncate flex-1">{inv.email}</span>
													<span className="text-xs text-yellow-400">
														{inv.status}
													</span>
												</div>
											))}
									</div>
								)}
							</>
						)}
					</>
				)}
			</div>

			{/* Footer with sign out */}
			{user && (
				<div className="border-t border-border-subtle px-4 py-3">
					<button
						type="button"
						onClick={logout}
						className="flex items-center gap-2 text-xs text-text-tertiary hover:text-red-400 transition-colors cursor-pointer"
					>
						<LogOut size={12} />
						{t("auth.logout")}
					</button>
				</div>
			)}
		</SlideInPanel>
	);
}
