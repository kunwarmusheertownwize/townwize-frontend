// 📄 src/components/auth/SubmitButton.jsx

export default function SubmitButton({ isSubmitting, isValid, isDirty }) {
  // disable if form invalid, untouched, or already submitting
  const disabled = !isValid || !isDirty || isSubmitting;

  return (
    <button
      type="submit"
      disabled={disabled}
      aria-disabled={disabled}
      className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
        ${
          disabled
            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
            : "bg-townwize-primary text-white hover:bg-townwize-primaryDark focus:ring-townwize-primary"
        }`}
    >
      {isSubmitting && (
        <svg
          className="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          role="status"
          aria-label="loading"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {isSubmitting ? "Submitting…" : "Complete Registration"}
    </button>
  );
}
