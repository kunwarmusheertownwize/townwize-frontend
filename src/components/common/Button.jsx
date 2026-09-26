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
    "disabled:cursor-not-allowed";

/* The ring follows the button, not the brand. A red destructive button with a
 * brand-coloured halo reads as a rendering fault rather than as focus. */
const RINGS = {
    primary: "focus-visible:ring-townwize-primary",
    secondary: "focus-visible:ring-townwize-primary",
    ghost: "focus-visible:ring-townwize-primary",
    danger: "focus-visible:ring-red-500",
    dangerSoft: "focus-visible:ring-red-500",
    /* White, and no offset: an offset ring on a photographic background
     * exposes a slice of whatever sits behind the button, which reads as a
     * rendering fault rather than as focus. */
    onDark: "focus-visible:ring-white focus-visible:ring-offset-0",
    emergency: "focus-visible:ring-red-500",
    progress: "focus-visible:ring-green-500",
    warning: "focus-visible:ring-orange-500",
    warningSoft: "focus-visible:ring-orange-500",
};

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
    /* Cancelling a ride is destructive but it is also the ordinary way out of
     * a booking, and a solid red block makes it read as the thing to avoid.
     * The ride journey already used this outlined treatment in five slightly
     * different spellings; this is the one of them. */
    dangerSoft:
        "border border-red-200 text-red-600 hover:bg-red-50 " +
        "dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50",
    /* For controls sitting ON a coloured or photographic surface — the
     * searching-for-a-Wizer panel, controls over the map. `secondary` cannot
     * serve here: its grey-on-white is invisible against that background, and
     * overriding it through `className` is unreliable, because Tailwind
     * resolves conflicting utilities by stylesheet order — not by the order
     * the classes happen to be written in. */
    onDark:
        "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm disabled:opacity-60",
    /* Emergency SOS, and nothing else.
     *
     * It sits directly beneath "Cancel Ride" during a trip, and once both were
     * outlined red they read as siblings — one a routine way out of a booking,
     * the other a call for help. They must not be told apart by reading them.
     *
     * The difference is in KIND, not weight: a 2px saturated border against
     * dangerSoft's 1px pale one, a filled tint at rest, and darker text. Weight
     * was the obvious lever and is deliberately not used — BASE already sets
     * font-semibold, and Tailwind resolves two font-weight utilities by
     * stylesheet order rather than by which was written last, so font-bold here
     * would win or lose unpredictably. */
    emergency:
        "border-2 border-red-500 bg-red-50 text-red-700 hover:bg-red-100 " +
        "dark:border-red-500 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/60 " +
        "disabled:opacity-50",

    /* Reporting a Towner — a no-show, an unbooked extra passenger.
     *
     * Not `danger`, and the distinction is worth keeping. Red is for what the
     * Wizer does to their OWN ride: cancel it, end it. Orange is for an
     * accusation about somebody else, which carries a fee and cancels the trip
     * but is not the Wizer destroying their own work. A Wizer glancing down
     * mid-trip should not find the report button wearing the same colour as
     * cancel.
     *
     * Both spellings already existed on the driver screen — filled orange for
     * the confirmation, outlined for the control that opens it — so this names
     * what was there rather than inventing a colour. */
    /* Moving the trip forward: Arrived, Confirm Boarded.
     *
     * Green rather than brand, and the split is the useful part. On the Wizer's
     * screen the brand colour means "go somewhere" — Navigate to Pickup,
     * Navigate to Stop 2 — while green means "the thing I was going to do is
     * done". A Wizer glancing down at a phone in a cradle is reading colour
     * before words, and these two sat next to each other in the same colour in
     * several places. */
    progress: "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50",

    warning: "bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50",
    warningSoft:
        "border border-orange-300 text-orange-600 hover:bg-orange-50 " +
        "dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950 disabled:opacity-50",
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
                RINGS[variant] || RINGS.primary,
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
