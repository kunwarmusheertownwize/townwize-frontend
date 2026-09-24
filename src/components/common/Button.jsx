/**
 * The button.
 *
 * WHY THIS EXISTS. The primary action was hand-written everywhere — twelve
 * different spellings in the core ride journey alone, across four heights
 * (py-2, py-2.5, py-3, py-4), four radii (rounded, lg, xl, 2xl) and three text
 * sizes. "Confirm Trip", "Pay now" and "Submit" were visibly different
 * buttons doing the same job, and nobody had decided they should be.
 *
 * The values below are not new inventions: they are the ones already most
 * used, so adopting this changes as few screens as possible. `rounded-xl`
 * appears 113 times against 41 for `rounded-2xl` and 27 for `rounded-lg`.
 *
 * ⚠️ TOUCH TARGETS. `md` is the default because py-3 with text-sm lands at
 * ~44px, which is Apple's minimum and close to Material's 48dp. `sm` is below
 * that and is deliberately only for secondary actions sitting inside a row —
 * never for something a driver taps while holding a phone in one hand.
 */

const BASE =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold " +
    // Every interactive control needs a visible focus ring; several of the
    // hand-written buttons had none, which makes the app unusable by keyboard
    // and fails an accessibility review.
    "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "focus-visible:ring-townwize-primary disabled:cursor-not-allowed";

const SIZES = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-3 text-sm",
    lg: "px-5 py-4 text-base",
};

const VARIANTS = {
    primary: "bg-townwize-primary text-white hover:bg-townwize-primaryDark disabled:opacity-50",
    /* Outlined rather than filled-grey: a secondary action next to a primary
     * one needs to read as available, not as disabled. Grey-on-grey was the
     * most common mistake in the hand-written versions. */
    secondary:
        "border border-gray-300 text-gray-800 hover:bg-gray-50 " +
        "dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800 disabled:opacity-50",
    ghost:
        "text-gray-600 hover:text-gray-900 hover:bg-gray-100 " +
        "dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 disabled:opacity-50",
    /* Destructive. Used for cancelling a ride and ending a trip — actions
     * where the colour is the warning. */
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

const Spinner = () => (
    <span
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
    />
);

export default function Button({
    children,
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    fullWidth = false,
    type = "button",
    className = "",
    ...rest
}) {
    return (
        <button
            type={type}
            /* Loading implies disabled. Leaving a button clickable while its
             * action is in flight is how a ride gets booked twice — and the
             * hand-written versions were inconsistent about it. */
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={[
                BASE,
                SIZES[size] || SIZES.md,
                VARIANTS[variant] || VARIANTS.primary,
                fullWidth ? "w-full" : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...rest}
        >
            {loading && <Spinner />}
            {children}
        </button>
    );
}
