import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import ur from "./locales/ur";

/**
 * Translation setup.
 *
 * The strings themselves live in ./locales, one file per language. This used
 * to be a single 189-line file with both languages inline — fine for the 68
 * keys the app had, and hopeless for the 62 screens still to translate: every
 * addition touched the same file twice, and a missing Urdu key was invisible.
 *
 * ⚠️ WHAT SWITCHING THE LANGUAGE ACTUALLY INVOLVES is NOT here. Three things
 * have to move together — the i18next language, `document.documentElement.lang`
 * and `dir` — and all three are set in ONE place, contexts/LanguageContext.jsx.
 * `i18n.changeLanguage` used to be called from a useEffect inside Navbar and
 * nowhere else, so on any screen without the Navbar (the whole native app, and
 * the auth screens, which carry their own language toggle) switching to Urdu
 * flipped the layout to RTL and left every word in English. Do not reintroduce
 * a second caller.
 *
 * `fallbackLng: "en"` means an untranslated key shows the English sentence
 * rather than the raw key name — always the better failure.
 */
i18n.use(initReactI18next).init({
    /* Each locale file already exports its own `{ translation: { … } }`
     * bundle, so it is spread in as-is. Wrapping it again here would nest it
     * one level too deep and every lookup would miss — a build that succeeds
     * and an app with no translations at all. */
    resources: { en, ur },
    lng: localStorage.getItem("language") || "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
});

export default i18n;
