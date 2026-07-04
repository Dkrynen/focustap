import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
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
    if (lower === "!h" || lower === "!high") {
      priority = 3;
    } else if (lower === "!m" || lower === "!med" || lower === "!medium") {
      priority = 2;
    } else if (lower === "!l" || lower === "!low") {
      priority = 1;
    } else if (t.startsWith("#") && t.length > 1) {
      tagList.push(t.slice(1));
    } else {
      kept.push(t);
    }
  }

  return {
    clean: kept.join(" ").trim(),
    priority,
    tags: tagList.length > 0 ? tagList.join(",") : undefined,
  };
}

interface TaskInputProps {
  autoFocus?: boolean;
}

export function TaskInput({ autoFocus = true }: TaskInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addTask = useTaskStore((s) => s.addTask);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const dummy = document.createElement("input");
      dummy.style.position = "fixed";
      dummy.style.opacity = "0";
      dummy.style.pointerEvents = "none";
      document.body.appendChild(dummy);
      dummy.focus();
      dummy.blur();
      document.body.removeChild(dummy);
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const commit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { clean, priority, tags } = parseNLP(trimmed);
    addTask(clean || "Untitled", priority, tags);
    setText("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [text, addTask]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && text.trim()) {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") {
      setText("");
      inputRef.current?.blur();
    }
  };

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Add task — use !h !m !l for priority, #tag for labels'
          className="w-full bg-surface-glass text-text-primary placeholder-text-tertiary/50
                     text-sm px-4 py-2.5 rounded-[10px] outline-none
                     border border-border-default
                     focus:border-accent-primary/30 focus:shadow-[0_0_0_1px_rgba(139,126,255,0.15)]
                     focus:bg-surface-elevated
                     transition-all duration-150 font-sans"
        />
        {text.trim() && (
          <button
            onClick={commit}
            className="absolute right-2 top-1/2 -translate-y-1/2
                       bg-accent-primary hover:bg-accent-hover text-white
                       text-xs px-3 py-1.5 rounded-full
                       transition-all duration-150 active:scale-[0.97] cursor-pointer"
          >
            Add
          </button>
        )}
      </div>
      <p className="text-[10px] text-text-quaternary text-center mt-1.5 select-none">
        <kbd className="text-accent-primary/70">!h</kbd> high ·
        <kbd className="text-accent-primary/70">!m</kbd> med ·
        <kbd className="text-accent-primary/70">!l</kbd> low ·
        <kbd className="text-accent-primary/70">#tag</kbd> label
      </p>
    </div>
  );
}
