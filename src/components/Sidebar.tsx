import {
	Calendar,
	ChevronDown,
	Inbox,
	ListChecks,
	StickyNote,
	Sun,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export type View = "today" | "upcoming" | "inbox" | "notes" | "calendar";

interface SidebarProps {
	activeView: View;
	onViewChange: (view: View) => void;
	workspaces: { id: string; name: string }[];
	activeWorkspaceId: string | null;
	onWorkspaceChange: (id: string) => void;
}

const NAV_ITEMS: { id: View; label: string; icon: typeof Sun }[] = [
	{ id: "today", label: "Today", icon: Sun },
	{ id: "upcoming", label: "Upcoming", icon: Calendar },
	{ id: "inbox", label: "Inbox", icon: Inbox },
	{ id: "notes", label: "Notes", icon: StickyNote },
	{ id: "calendar", label: "Calendar", icon: Calendar },
];

export function Sidebar({
	activeView,
	onViewChange,
	workspaces,
	activeWorkspaceId,
	onWorkspaceChange,
}: SidebarProps) {
	const { t } = useTranslation();
	const [wsOpen, setWsOpen] = useState(false);

	const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

	return (
		<div className="w-[200px] flex-shrink-0 h-full flex flex-col bg-surface-deep border-r border-border-subtle select-none">
			{/* Workspace header */}
			<div className="relative px-3 pt-4 pb-2">
				<button
					type="button"
					onClick={() => setWsOpen(!wsOpen)}
					className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] hover:bg-surface-glass transition-colors cursor-pointer text-left"
				>
					<ListChecks size={16} className="text-accent-primary shrink-0" />
					<span className="text-sm font-medium text-text-primary truncate flex-1">
						{activeWs?.name || t("workspace.title")}
					</span>
					<ChevronDown
						size={14}
						className={`text-text-quaternary transition-transform ${wsOpen ? "rotate-180" : ""}`}
					/>
				</button>

				{/* Workspace dropdown */}
				{wsOpen && (
					<div className="absolute left-3 right-3 top-full mt-1 z-20 bg-surface-deep border border-border-default rounded-[10px] shadow-xl overflow-hidden">
						{workspaces.map((ws) => (
							<button
								key={ws.id}
								type="button"
								onClick={() => {
									onWorkspaceChange(ws.id);
									setWsOpen(false);
								}}
								className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer text-left ${
									ws.id === activeWorkspaceId
										? "bg-accent-subtle text-accent-primary"
										: "text-text-secondary hover:bg-surface-glass hover:text-text-primary"
								}`}
							>
								<ListChecks size={14} />
								<span className="truncate">{ws.name}</span>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Nav items */}
			<nav className="flex-1 px-2 py-2 space-y-0.5">
				{NAV_ITEMS.map((item) => {
					const Icon = item.icon;
					const isActive = activeView === item.id;
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onViewChange(item.id)}
							className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-sm transition-colors cursor-pointer text-left ${
								isActive
									? "bg-accent-subtle text-accent-primary font-medium"
									: "text-text-secondary hover:bg-surface-glass hover:text-text-primary"
							}`}
						>
							<Icon
								size={16}
								className={isActive ? "text-accent-primary" : "text-text-quaternary"}
							/>
							<span>{item.label}</span>
						</button>
					);
				})}
			</nav>
		</div>
	);
}
