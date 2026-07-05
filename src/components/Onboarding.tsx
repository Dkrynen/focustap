import { useState } from "react";
import { ListChecks, Keyboard, Sparkles } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: <ListChecks size={32} className="text-accent-primary" />,
    title: "Welcome to FocusTap",
    description: "A distraction-free task manager. Add tasks instantly with NLP parsing — try !h !m !l for priority or #tag for tagging.",
  },
  {
    icon: <Keyboard size={32} className="text-accent-primary" />,
    title: "Keyboard-First",
    description: "Press n to focus the input, Ctrl+F to search, Ctrl+Shift+Space to toggle the window from anywhere.",
  },
  {
    icon: <Sparkles size={32} className="text-accent-primary" />,
    title: "Pro Features",
    description: "Upgrade to Pro for backup/restore, priority support, and more. Find it in Settings.",
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm animate-fade-in flex items-center justify-center">
      <div className="w-[320px] bg-[#0a0a0a] border border-border-subtle rounded-[14px] p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="mt-2">{current.icon}</div>
          <h2 className="text-base font-semibold text-text-primary">{current.title}</h2>
          <p className="text-xs text-text-secondary leading-relaxed">{current.description}</p>

          {/* Dots */}
          <div className="flex gap-1.5 mt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? "bg-accent-primary" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-2 w-full">
            {step < steps.length - 1 ? (
              <>
                <button
                  onClick={onComplete}
                  className="flex-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer py-2"
                >
                  Skip
                </button>
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex-1 px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs font-medium rounded-[8px] transition-colors cursor-pointer"
                >
                  Next
                </button>
              </>
            ) : (
              <button
                onClick={onComplete}
                className="w-full px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs font-medium rounded-[8px] transition-colors cursor-pointer"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
