import { useTranslation } from "react-i18next";
import { CloseButton, SlideInPanel } from "./primitives";

interface ShortcutOverlayProps {
	open: boolean;
	onClose: () => void;
}

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
	const { t } = useTranslation();

	const GROUPS = [
		{
			title: t("shortcuts.group_tasks"),
			shortcuts: [
				{ keys: "n", desc: t("shortcuts.focus_input") },
				{ keys: "↑↓", desc: t("shortcuts.navigate_list") },
				{ keys: "Enter", desc: t("shortcuts.toggle_complete") },
				{ keys: "E", desc: t("shortcuts.edit_details") },
				{ keys: "Delete / Backspace", desc: t("shortcuts.delete_selected") },
			],
		},
		{
			title: t("shortcuts.group_search"),
			shortcuts: [
				{ keys: "Ctrl+F", desc: t("shortcuts.quick_find") },
				{ keys: "Escape", desc: t("shortcuts.clear_search") },
			],
		},
		{
			title: t("shortcuts.group_navigation"),
			shortcuts: [
				{ keys: "Escape", desc: t("shortcuts.hide_window") },
				{ keys: "Ctrl+Shift+Space", desc: t("shortcuts.toggle_global") },
				{ keys: "?", desc: t("shortcuts.show_reference") },
			],
		},
		{
			title: t("shortcuts.group_timer"),
			shortcuts: [
				{ keys: "Ctrl+Shift+P", desc: t("shortcuts.start_pause_timer") },
			],
		},
	];

	if (!open) return null;

	return (
		<SlideInPanel
			open={open}
			onClose={onClose}
			ariaLabel={t("shortcuts.title")}
			centered
			zIndex="z-[60]"
		>
			{/* Header */}
			<div className="flex items-center justify-between px-5 pt-4 pb-3">
				<h2 className="text-sm font-medium text-text-primary">
					{t("shortcuts.title")}
				</h2>
				<CloseButton onClick={onClose} ariaLabel={t("common.close")} />
			</div>
			<div className="mx-5 h-px bg-border-subtle" />

			{/* Groups */}
			<div className="px-5 py-4 space-y-4">
				{GROUPS.map((group) => (
					<div key={group.title}>
						<h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-2">
							{group.title}
						</h3>
						<div className="space-y-2">
							{group.shortcuts.map((sc) => (
								<div
									key={sc.desc}
									className="flex items-center justify-between"
								>
									<span className="text-xs text-text-primary">{sc.desc}</span>
									<span className="text-[11px] font-mono bg-surface-glass text-text-secondary px-2 py-0.5 rounded-[6px] border border-border-subtle whitespace-nowrap ml-3">
										{sc.keys}
									</span>
								</div>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Footer */}
			<div className="px-5 py-3 border-t border-border-subtle">
				<p className="text-[10px] text-text-tertiary/60 text-center">
					Press <kbd className="text-text-secondary">?</kbd> or{" "}
					<kbd className="text-text-secondary">Escape</kbd> {t("common.close")}
				</p>
			</div>
		</SlideInPanel>
	);
}
