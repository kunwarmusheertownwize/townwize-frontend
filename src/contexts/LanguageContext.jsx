// src/contexts/LanguageContext.jsx

import React, { createContext, useState, useEffect } from "react";
import i18n from "../i18n";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
    // The effect below does the rest, so the two paths cannot disagree.
  };

  /* ONE place decides what language the app is in.
   *
   * `i18n.changeLanguage` used to be called from a useEffect inside Navbar,
   * and nowhere else. On any screen without the Navbar — the whole native app,
   * and the auth screens, which carry their own language toggle in AuthHeader
   * — switching to Urdu set dir="rtl" and stored the preference while i18next
   * never switched at all. The layout flipped and the text stayed English.
   *
   * This provider wraps the app, so putting it here means the three things
   * that must move together always do: the i18next language, the document
   * language, and the text direction. */
  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageContext };
