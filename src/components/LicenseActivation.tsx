import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, KeyRound } from "lucide-react";
import { activateAndGetState, deactivate } from "@licenseseat/tauri-plugin";

type LicenseStatus = "none" | "active" | "error" | "loading";

export function LicenseActivation() {
  const [keyInput, setKeyInput] = useState("");
  const [status, setStatus] = useState<LicenseStatus>("none");
  const [errorMsg, setErrorMsg] = useState("");
  const [planKey, setPlanKey] = useState("");

  const handleActivate = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const state = await activateAndGetState(trimmed);
      if (state.isValid && state.isActivated) {
        setStatus("active");
        setPlanKey(state.planKey ?? "pro");
      } else {
        setStatus("error");
        setErrorMsg("License key is not valid for this product");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Activation failed");
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivate();
    } catch (e) {
      console.error("License deactivation failed:", e);
    }
    setStatus("none");
    setKeyInput("");
    setErrorMsg("");
  };

  if (status === "active") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">Pro Activated</span>
        </div>
        <div className="text-xs text-text-tertiary space-y-1">
          {planKey && <p>Plan: {planKey}</p>}
        </div>
        <button
          onClick={handleDeactivate}
          className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
        >
          Deactivate license
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <KeyRound size={14} />
        <span>Enter your Pro license key</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleActivate()}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          disabled={status === "loading"}
          className="flex-1 bg-white/5 border border-border-subtle rounded-[6px] px-3 py-2 text-xs text-text-primary placeholder:text-text-quaternary outline-none focus:border-accent-primary/50 transition-colors"
        />
        <button
          onClick={handleActivate}
          disabled={status === "loading" || !keyInput.trim()}
          className="px-3 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs rounded-[6px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "loading" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            "Activate"
          )}
        </button>
      </div>
      {status === "error" && (
        <div className="flex items-center gap-2 text-red-400 text-xs">
          <XCircle size={14} />
          <span>{errorMsg || "Activation failed"}</span>
        </div>
      )}
    </div>
  );
}
