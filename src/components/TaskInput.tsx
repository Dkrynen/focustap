import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTaskStore } from "../store";

function parseNLP(input: string): {
	clean: string;
	priority: number | undefined;
	tags: string | undefined;
} {
	const tokens = input.split(/\s+/);
	let priority: number | undefined;
	const tagList: string[] = [];
	const kept: string[] = [];

	for (const t of tokens) {
		const lower = t.toLowerCase();
		if (lower === "!h" || lower === "!high") priority = 3;
		else if (lower === "!m" || lower === "!med" || lower === "!medium")
			priority = 2;
		else if (lower === "!l" || lower === "!low") priority = 1;
		else if (t.startsWith("#") && t.length > 1) tagList.push(t.slice(1));
		else kept.push(t);
	}

	return {
		clean: kept.join(" ").trim(),
		priority,
		tags: tagList.length > 0 ? tagList.join(",") : undefined,
	};
}

export function TaskInput() {
	const { t } = useTranslation();
	const [text, setText] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const addTask = useTaskStore((s) => s.addTask);

	const commit = useCallback(() => {
		const trimmed = text.trim();
		if (!trimmed) return;
		const { clean, priority, tags } = parseNLP(trimmed);
		addTask(clean || t("task.untitled", "Untitled"), priority, tags);
		setText("");
		setTimeout(() => inputRef.current?.focus(), 0);
	}, [text, addTask, t]);

	return (
		<div>
			<input
				ref={inputRef}
				type="text"
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && text.trim()) {
						e.preventDefault();
						commit();
					}
					if (e.key === "Escape") {
						setText("");
						inputRef.current?.blur();
					}
				}}
				placeholder={t("task.input_placeholder")}
				className="w-full bg-surface-glass/60 text-text-primary placeholder-input-placeholder/50 backdrop-blur-sm
					   text-sm px-4 py-2.5 rounded-[10px] border border-border-default/50
					   focus:border-accent-primary/40 transition-all duration-150
					   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]
					   focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]"
				autoFocus
			/>
		</div>
	);
}
