import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";

export const SUPPORTED_LOCALES = [{ code: "en", label: "English" }] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];

const resources = {
	en: { translation: en },
};

void i18n.use(initReactI18next).init({
	resources,
	lng: "en",
	fallbackLng: "en",
	interpolation: {
		escapeValue: false,
	},
	returnObjects: true,
});

export default i18n;
