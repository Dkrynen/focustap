import { useEffect } from "react";

export function useFocusTrap(
	containerRef: React.RefObject<HTMLElement | null>,
	enabled: boolean,
) {
	useEffect(() => {
		if (!enabled) return;
		const container = containerRef.current;
		if (!container) return;

		const selector =
			'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

		const getFocusables = () =>
			Array.from(container.querySelectorAll(selector)).filter((el) => {
				const htmlEl = el as HTMLElement;
				return htmlEl.offsetParent !== null;
			}) as HTMLElement[];

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			const focusables = getFocusables();
			if (focusables.length === 0) return;

			const first = focusables[0];
			const last = focusables[focusables.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		// Focus first element when opened
		const focusables = getFocusables();
		if (focusables.length > 0) {
			setTimeout(() => focusables[0].focus(), 50);
		}

		container.addEventListener("keydown", handleKeyDown);
		return () => container.removeEventListener("keydown", handleKeyDown);
	}, [enabled, containerRef]);
}
