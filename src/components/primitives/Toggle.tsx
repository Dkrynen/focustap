interface ToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2
                  focus-visible:ring-offset-[var(--surface-primary)]
                  ${checked ? "bg-accent-primary" : "bg-white/10"}`}
		>
			<span
				className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm
                    ring-0 transition-transform duration-200 ease-out
                    ${checked ? "translate-x-4" : "translate-x-0"}`}
			/>
		</button>
	);
}
