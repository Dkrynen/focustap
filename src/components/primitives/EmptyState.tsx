interface EmptyStateProps {
	icon: React.ReactNode;
	title: string;
	description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
	return (
		<div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
			{icon}
			<p className="text-sm text-text-quaternary">{title}</p>
			{description && (
				<p className="text-xs text-text-quaternary">{description}</p>
			)}
		</div>
	);
}
