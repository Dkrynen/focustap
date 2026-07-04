import { useState, useEffect, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

type ToastType = "success" | "error";

interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

let nextId = 0;
type Listener = (msg: ToastMessage) => void;
const listeners = new Set<Listener>();

/** Exportable function to show a toast from anywhere (store, components, etc.) */
export function showToast(text: string, type: ToastType = "error") {
  const msg: ToastMessage = { id: nextId++, type, text };
  listeners.forEach((fn) => fn(msg));
  setTimeout(() => {
    listeners.forEach((fn) => fn({ ...msg, text: "" }));
  }, 4000);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler: Listener = (msg) => {
      if (msg.text === "") {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      } else {
        setToasts((prev) => [...prev, msg]);
      }
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return (
    <>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
               className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm shadow-xl
              ${t.type === "error"
                ? "bg-red-500/20 border border-red-500/30 text-red-200"
                : "bg-green-500/20 border border-green-500/30 text-green-200"
              }`}
          >
            {t.type === "error" ? (
              <AlertTriangle size={14} className="flex-shrink-0" />
            ) : (
              <CheckCircle2 size={14} className="flex-shrink-0" />
            )}
            <span className="text-xs font-medium">{t.text}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
