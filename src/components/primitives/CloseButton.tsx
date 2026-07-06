import { X } from "lucide-react";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

interface CloseButtonProps {
	onClick: () => void;
	ariaLabel?: string;
}

export function CloseButton({
	onClick,
	ariaLabel = "Close",
}: CloseButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer rounded-[6px] p-0.5 ${FOCUS_RING}`}
			aria-label={ariaLabel}
		>
			<X size={16} />
		</button>
	);
}
