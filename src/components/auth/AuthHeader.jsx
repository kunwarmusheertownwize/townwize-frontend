// 📄 src/components/auth/AuthHeader.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaSun, FaMoon } from "react-icons/fa";
import { useTheme } from "../../hooks/useTheme";
import { useLanguage } from "../../hooks/useLanguage";

const AuthHeader = () => {
    const { darkMode, toggleTheme } = useTheme();
    const { language, changeLanguage } = useLanguage();
    const navigate = useNavigate();
    const handleNav = (path) => navigate(path);
    return (
        <div className="sticky top-0 z-50 w-full bg-white dark:bg-townwize-primaryDark border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300 mb-6 pt-safe">
            <div className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-start">
                {/* LEFT — Logo + Center Nav */}
                <div className="flex items-center justify-between w-full">
                    {/* Logo */}
                    <div
                        onClick={() => handleNav("/")}
                        className="relative cursor-pointer h-9 w-auto flex items-center"
                    >
                        {/* Light Mode Logo */}
                        <img
                            src="/images/logo-dark.png"
                            alt="Townwize Logo Light"
                            className={`block h-9 w-auto transition-opacity duration-500  ${darkMode ? "opacity-0" : "opacity-100 "
                                }`}
                        />

                        {/* Dark Mode Logo (stacked behind, no distortion) */}
                        <img
                            src="/images/logo-light.png"
                            alt="Townwize Logo Dark"
                            className={`absolute left-0 top-0 h-9 w-auto transition-opacity duration-500  ${darkMode ? "opacity-100" : "opacity-0 "
                                }`}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex justify-end items-center gap-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle Theme"
                            className="flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                        >
                            {darkMode ? <FaSun /> : <FaMoon />}
                        </button>

                        {/* Language Toggle */}
                        <button
                            onClick={() => changeLanguage(language === "en" ? "ur" : "en")}
                            className="text-sm font-medium hover:text-townwize-accent transition"
                        >
                            {language === "en" ? "اردو" : "EN"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthHeader;
