import { useState, useRef, useCallback } from "react";
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
    else if (lower === "!m" || lower === "!med" || lower === "!medium") priority = 2;
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
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addTask = useTaskStore((s) => s.addTask);

  const commit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { clean, priority, tags } = parseNLP(trimmed);
    addTask(clean || "Untitled", priority, tags);
    setText("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [text, addTask]);

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
        placeholder="Add a task... (!h !m !l for priority, #tag)"
        className="w-full bg-surface-glass text-text-primary placeholder-text-tertiary/50 text-xs px-4 py-2.5 rounded-[10px] outline-none border border-border-default focus:border-accent-primary/30 focus:shadow-[0_0_0_1px_rgba(139,126,255,0.15)] transition-all duration-150 placeholder-[#555]"
        autoFocus
      />
    </div>
  );
}
