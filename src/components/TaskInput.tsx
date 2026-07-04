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
        className="w-full bg-[rgba(255,255,255,0.04)] text-[#f0f0f0] text-[13px] px-3 py-2 rounded-[6px] outline-none border border-[rgba(255,255,255,0.06)] focus:border-[#8b7eff] focus:bg-[rgba(255,255,255,0.06)] transition-colors placeholder-[#555]"
        autoFocus
      />
    </div>
  );
}
