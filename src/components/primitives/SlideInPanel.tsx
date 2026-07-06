import { forwardRef, useEffect, useState } from "react";

interface SlideInPanelProps {
	open: boolean;
	onClose: () => void;
	ariaLabel: string;
	children: React.ReactNode;
	zIndex?: string;
	className?: string;
	disableEscape?: boolean;
	centered?: boolean;
	onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const SlideInPanel = forwardRef<HTMLDivElement, SlideInPanelProps>(
	function SlideInPanel(
		{
			open,
			onClose,
			ariaLabel,
			children,
			zIndex = "z-50",
			className = "",
			disableEscape = false,
			centered = false,
			onKeyDown,
		},
		ref,
	) {
		const [showContent, setShowContent] = useState(false);

		useEffect(() => {
			if (centered) return;
			if (open) {
				requestAnimationFrame(() => setShowContent(true));
			} else {
				setShowContent(false);
			}
		}, [open, centered]);

		useEffect(() => {
			if (disableEscape || onKeyDown) return;
			const handler = (e: KeyboardEvent) => {
				if (e.key === "Escape") onClose();
			};
			window.addEventListener("keydown", handler);
			return () => window.removeEventListener("keydown", handler);
		}, [onClose, disableEscape, onKeyDown]);

		if (!open) return null;

		if (centered) {
			return (
				<div
					ref={ref}
					className={`fixed inset-0 ${zIndex} flex items-center justify-center`}
					role="dialog"
					aria-modal="true"
					aria-label={ariaLabel}
					onClick={onClose}
					onKeyDown={onKeyDown}
					tabIndex={onKeyDown ? -1 : undefined}
				>
					<div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
					{/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only, not interactive */}
					<div
						role="presentation"
						className={`relative glass-elevated rounded-[16px] shadow-2xl w-[320px] max-w-[90vw] max-h-[80vh] overflow-y-auto animate-slide-in ${className}`}
						onClick={(e) => e.stopPropagation()}
					>
						{children}
					</div>
				</div>
			);
		}

		return (
			<div
				ref={ref}
				className={`fixed inset-0 ${zIndex}`}
				role="dialog"
				aria-modal="true"
				aria-label={ariaLabel}
				onKeyDown={onKeyDown}
				tabIndex={onKeyDown ? -1 : undefined}
			>
				{/* biome-ignore lint/a11y/useSemanticElements: backdrop overlay needs absolute positioning */}
				<div
					role="button"
					tabIndex={0}
					className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
					onClick={onClose}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") onClose();
					}}
				/>
				<div
					className={`absolute right-0 top-0 h-full glass-elevated rounded-l-[16px] shadow-2xl flex flex-col transition-transform duration-200 ease-out-expo ${className}`}
					style={{
						transform: showContent ? "translateX(0)" : "translateX(100%)",
					}}
				>
					{children}
				</div>
			</div>
		);
	},
);
