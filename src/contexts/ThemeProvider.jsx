import React, { useState, useEffect } from "react";
import { ThemeContext } from "./ThemeContext";

// ✅ Always default to light unless theme is explicitly "dark"
let savedTheme;
try {
  savedTheme = localStorage.getItem("theme");
} catch {
  savedTheme = null; // in case localStorage is unavailable
}

if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(savedTheme === "dark");

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const setTheme = (mode) => {
    setDarkMode(mode === "dark");
  };


  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
