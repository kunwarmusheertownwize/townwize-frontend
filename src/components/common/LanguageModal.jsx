import { useLanguage } from "../../hooks/useLanguage";
import Modal from "./Modal";

/**
 * Language picker.
 *
 * Dismissable: choosing a language is optional and the page behind is fully
 * usable, so Escape and a backdrop click should get you out. That is the
 * opposite of the sign-in gate, which blocks on purpose.
 */
const LanguageModal = ({ open, onClose }) => {
    const { language, changeLanguage } = useLanguage();

    const pick = (code) => {
        changeLanguage(code);
        onClose();
    };

    /* The selected language is marked with aria-pressed, not colour alone.
     * These are toggle buttons, and a screen reader had no way to tell which
     * one was active — nor does anyone who cannot distinguish the filled
     * state from the unfilled one. */
    const option = (code, label) => (
        <button
            type="button"
            onClick={() => pick(code)}
            aria-pressed={language === code}
            className={`rounded-xl py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-townwize-primary ${
                language === code
                    ? "bg-townwize-primary text-white"
                    : "border border-gray-300 text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800"
            }`}
        >
            {label}
        </button>
    );

    return (
        <Modal open={open} onClose={onClose} labelledBy="language-modal-title" className="w-80">
            <h2
                id="language-modal-title"
                className="mb-4 text-center text-lg font-semibold dark:text-white"
            >
                Select Language
            </h2>

            <div className="flex flex-col gap-3">
                {option("en", "English")}
                {/* lang so a screen reader pronounces it as Urdu rather than
                    spelling it out in the page's language. */}
                {option("ur", <span lang="ur">اردو</span>)}
            </div>

            <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full rounded-xl py-2 text-sm text-gray-600 hover:text-townwize-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-townwize-primary dark:text-gray-300"
            >
                Cancel
            </button>
        </Modal>
    );
};

export default LanguageModal;
