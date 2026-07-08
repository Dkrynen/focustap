import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

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
	resizable?: boolean;
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
}

const STORAGE_PREFIX = "panel-width:";

function loadWidth(key: string, fallback: number): number {
	try {
		const saved = localStorage.getItem(STORAGE_PREFIX + key);
		if (saved) return Math.max(200, parseInt(saved, 10) || fallback);
	} catch {
		/* localStorage unavailable */
	}
	return fallback;
}

function saveWidth(key: string, width: number) {
	try {
		localStorage.setItem(STORAGE_PREFIX + key, String(width));
	} catch {
		/* localStorage unavailable */
	}
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
			resizable = false,
			defaultWidth = 320,
			minWidth = 240,
			maxWidth = 900,
		},
		ref,
	) {
		const [showContent, setShowContent] = useState(false);
		const [panelWidth, setPanelWidth] = useState(() =>
			loadWidth(ariaLabel, defaultWidth),
		);
		const [isResizing, setIsResizing] = useState(false);
		const resizeStartRef = useRef<{
			startX: number;
			startWidth: number;
		} | null>(null);

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

		// Reset width when panel opens (reloads saved width)
		useEffect(() => {
			if (open && resizable) {
				setPanelWidth(loadWidth(ariaLabel, defaultWidth));
			}
		}, [open, resizable, ariaLabel, defaultWidth]);

		const handleResizeStart = useCallback(
			(e: React.MouseEvent | React.TouchEvent) => {
				if (!resizable) return;
				e.preventDefault();
				const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

				resizeStartRef.current = {
					startX: clientX,
					startWidth: panelWidth,
				};
				setIsResizing(true);

				const handleMove = (ev: MouseEvent | TouchEvent) => {
					const currentX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
					const start = resizeStartRef.current;
					if (!start) return;

					// Panel slides in from the right; dragging left edge left = wider
					const delta = start.startX - currentX;
					const newWidth = Math.max(
						minWidth,
						Math.min(maxWidth, start.startWidth + delta),
					);
					setPanelWidth(newWidth);
				};

				const handleUp = () => {
					setIsResizing(false);
					resizeStartRef.current = null;
					document.removeEventListener("mousemove", handleMove);
					document.removeEventListener("mouseup", handleUp);
					document.removeEventListener("touchmove", handleMove);
					document.removeEventListener("touchend", handleUp);
					document.body.style.cursor = "";
					document.body.style.userSelect = "";
				};

				document.addEventListener("mousemove", handleMove);
				document.addEventListener("mouseup", handleUp);
				document.addEventListener("touchmove", handleMove, {
					passive: false,
				});
				document.addEventListener("touchend", handleUp);
				document.body.style.cursor = "col-resize";
				document.body.style.userSelect = "none";
			},
			[resizable, panelWidth, minWidth, maxWidth],
		);

		// Persist width when resize ends and on unmount
		useEffect(() => {
			if (!resizable || isResizing) return;
			saveWidth(ariaLabel, panelWidth);
		}, [panelWidth, isResizing, resizable, ariaLabel]);

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

		const widthStyle = resizable
			? {
					width: panelWidth,
					transform: showContent ? "translateX(0)" : "translateX(100%)",
				}
			: { transform: showContent ? "translateX(0)" : "translateX(100%)" };

		const baseClass =
			"absolute right-0 top-0 h-full glass-elevated rounded-l-[16px] shadow-2xl flex flex-col";
		const transitionClass = isResizing
			? `${baseClass} ${className}`
			: `${baseClass} transition-transform duration-200 ease-out-expo ${className}`;

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
				<div className={transitionClass} style={widthStyle}>
					{resizable && (
						// biome-ignore lint/a11y/noStaticElementInteractions: resize handle, interactive
						<div
							role="presentation"
							className={`absolute left-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20
								before:absolute before:inset-y-0 before:-left-1 before:w-4
								hover:bg-accent-primary/30 active:bg-accent-primary/50
								transition-colors duration-150
								${isResizing ? "bg-accent-primary/50" : ""}`}
							onMouseDown={handleResizeStart}
							onTouchStart={handleResizeStart}
						>
							<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-8 rounded-full bg-border-default opacity-0 group-hover:opacity-100 transition-opacity" />
						</div>
					)}
					{children}
				</div>
			</div>
		);
	},
);
