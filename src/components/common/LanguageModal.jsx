import React from "react";
import { useLanguage } from "../../hooks/useLanguage";

const LanguageModal = ({ open, onClose }) => {
    const { language, changeLanguage } = useLanguage();

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-townwize-primaryDark p-6 rounded-2xl shadow-xl w-80">
                <h2 className="text-lg font-semibold mb-4 dark:text-white text-center">
                    Select Language
                </h2>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => {
                            changeLanguage("en");
                            onClose();
                        }}
                        className={`py-2 rounded-lg font-medium ${language === "en"
                            ? "bg-townwize-primary text-white"
                            : "bg-gray-100 dark:bg-gray-700 dark:text-white"
                            }`}
                    >
                        English
                    </button>

                    <button
                        onClick={() => {
                            changeLanguage("ur");
                            onClose();
                        }}
                        className={`py-2 rounded-lg font-medium ${language === "ur"
                            ? "bg-townwize-primary text-white"
                            : "bg-gray-100 dark:bg-gray-700 dark:text-white"
                            }`}
                    >
                        اردو
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 w-full text-sm text-gray-600 dark:text-gray-300 hover:text-townwize-accent"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default LanguageModal;
