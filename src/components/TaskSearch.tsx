import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTaskStore } from "../store";

interface TaskSearchProps {
	inputRef: React.RefObject<HTMLInputElement | null>;
	onSearchActive: (active: boolean) => void;
}

export function TaskSearch({ inputRef, onSearchActive }: TaskSearchProps) {
	const { t } = useTranslation();
	const searchQuery = useTaskStore((s) => s.searchQuery);
	const setSearchQuery = useTaskStore((s) => s.setSearchQuery);
	const localRef = useRef<HTMLInputElement>(null);

	const active = searchQuery.length > 0;

	useEffect(() => {
		if (active && localRef.current) {
			localRef.current.focus();
		}
		onSearchActive(active);
	}, [active, onSearchActive]);

	const input = inputRef ?? localRef;

	return (
		<div className="relative">
			<Search
				size={15}
				className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
			/>
			<input
				ref={input as React.RefObject<HTMLInputElement>}
				type="text"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						setSearchQuery("");
						(e.target as HTMLInputElement).blur();
					}
				}}
				placeholder={t("common.search")}
				className="w-full bg-surface-glass text-text-primary placeholder-text-tertiary backdrop-blur-sm
					   text-sm pl-9 pr-9 py-2.5 rounded-[10px]
					   border border-border-default
					   focus:border-accent-primary/40
					   transition-all duration-150 font-sans
					   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]
					   focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]"
			/>
			{searchQuery.length > 0 && (
				<button
					type="button"
					onClick={() => {
						setSearchQuery("");
						input.current?.focus();
					}}
					className="absolute right-2 top-1/2 -translate-y-1/2
					      text-text-tertiary hover:text-text-primary transition-colors cursor-pointer
					      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]
					      focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]
					      rounded-[6px] p-0.5"
					aria-label={t("common.clear_search", "Clear search")}
				>
					<X size={15} />
				</button>
			)}
		</div>
	);
}
