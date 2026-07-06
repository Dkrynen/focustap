import { Keyboard, ListChecks, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

interface OnboardingProps {
	onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	useFocusTrap(containerRef, true);

	const steps = [
		{
			icon: <ListChecks size={32} className="text-accent-primary" />,
			title: t("onboarding.step1_title"),
			description: t("onboarding.step1_desc"),
		},
		{
			icon: <Keyboard size={32} className="text-accent-primary" />,
			title: t("onboarding.step2_title"),
			description: t("onboarding.step2_desc"),
		},
		{
			icon: <Sparkles size={32} className="text-accent-primary" />,
			title: t("onboarding.step3_title"),
			description: t("onboarding.step3_desc"),
		},
	];

	const current = steps[step];

	return (
		<div
			ref={containerRef}
			className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm animate-fade-in flex items-center justify-center"
			role="dialog"
			aria-modal="true"
			aria-label={t("onboarding.title", "Welcome")}
			onKeyDown={(e) => {
				if (e.key === "Escape") onComplete();
			}}
			tabIndex={-1}
		>
			<div className="w-[320px] bg-surface-primary border border-border-subtle rounded-[14px] p-6 shadow-2xl">
				<div className="flex flex-col items-center text-center gap-4">
					<div className="mt-2">{current.icon}</div>
					<h2 className="text-base font-semibold text-text-primary">
						{current.title}
					</h2>
					<p className="text-xs text-text-secondary leading-relaxed">
						{current.description}
					</p>

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
									className={`flex-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer py-2 rounded-[6px] ${FOCUS_RING}`}
									aria-label={t("onboarding.skip")}
								>
									{t("onboarding.skip")}
								</button>
								<button
									onClick={() => setStep(step + 1)}
									className={`flex-1 px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs font-medium rounded-[8px] transition-colors cursor-pointer ${FOCUS_RING}`}
									aria-label={t("onboarding.next")}
								>
									{t("onboarding.next")}
								</button>
							</>
						) : (
							<button
								onClick={onComplete}
								className={`w-full px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary text-xs font-medium rounded-[8px] transition-colors cursor-pointer ${FOCUS_RING}`}
								aria-label={t("onboarding.get_started")}
							>
								{t("onboarding.get_started")}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
