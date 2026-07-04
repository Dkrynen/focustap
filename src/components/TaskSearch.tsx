import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useTaskStore } from "../store";

interface TaskSearchProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSearchActive: (active: boolean) => void;
}

export function TaskSearch({ inputRef, onSearchActive }: TaskSearchProps) {
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
        size={13}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
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
        placeholder="Find tasks…"
        className="w-full bg-surface-glass text-text-primary placeholder-text-tertiary/50
                   text-xs pl-8 pr-8 py-2 rounded-[10px] outline-none
                   border border-border-default
                   focus:border-accent-primary/30 focus:shadow-[0_0_0_1px_rgba(139,126,255,0.15)]
                   transition-all duration-150 font-sans"
      />
      {searchQuery.length > 0 && (
        <button
          onClick={() => {
            setSearchQuery("");
            input.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2
                     text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}