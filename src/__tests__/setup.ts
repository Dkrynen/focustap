import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("react-i18next", () => ({
	initReactI18next: { type: "3rdParty", init: vi.fn() },
	useTranslation: () => ({
		t: (key: string, defaultValue?: string) => defaultValue ?? key,
		i18n: {
			language: "en",
			changeLanguage: vi.fn(),
			exists: () => true,
		},
	}),
}));
