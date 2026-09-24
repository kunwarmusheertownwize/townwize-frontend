import useFocusTrap from "../../hooks/useFocusTrap";

/**
 * A dialog that actually behaves like one.
 *
 * WHY THIS EXISTS. The app had eight overlay modals and NOT ONE was a dialog:
 * no `role`, no focus trap, no Escape. Found 23 Sep by the user pressing Tab
 * on the sign-in gate and watching focus walk the blurred page behind it, item
 * by item, before ever reaching Login.
 *
 * That is not only untidy. A keyboard user can reach and activate controls
 * they cannot see underneath a modal that is supposedly blocking them —
 * changing the pickup address behind a sign-in prompt, for instance. Screen
 * readers announce the whole page rather than the dialog, so there is no way
 * to tell a modal has opened at all.
 *
 * The trapping lives in useFocusTrap, because the navigation drawer needs the
 * same behaviour and cannot use this layout.
 *
 * ⚠️ `dismissable={false}` for a dialog the user must answer — the sign-in
 * gate, a payment in flight. Escape and backdrop clicks are then ignored, but
 * the focus trap still applies: blocking someone is no reason to strand them.
 */
/* `sheet` rises from the bottom on a phone and centres on a larger screen —
 * the pattern two of the app's dialogs already used, and the right one for
 * anything with a form in it: a centred dialog is thrown upward by the
 * on-screen keyboard, while a bottom sheet sits where the thumb already is.
 * `center` stays for short confirmations where there is nothing to type. */
const ALIGN = {
    center: "items-center",
    sheet: "items-end sm:items-center",
};

export default function Modal({
    open,
    onClose,
    labelledBy,
    dismissable = true,
    align = "center",
    /* Some panels bleed a coloured header to their own edges. Passing p-0 in
     * className cannot be relied on to beat p-6 — Tailwind resolves by
     * stylesheet order, not attribute order — so the padding is a prop. */
    padded = true,
    className = "",
    children,
}) {
    const panelRef = useFocusTrap(open, dismissable ? onClose : undefined);

    if (!open) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex justify-center px-4 pb-6 sm:pb-0 ${ALIGN[align] || ALIGN.center}`}
            onMouseDown={(e) => {
                if (dismissable && e.target === e.currentTarget) onClose?.();
            }}
        >
            {/* A real backdrop. Several of the hand-rolled overlays had none at
                all, leaving the dialog floating over live content with no
                visual separation. */}
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                className={`relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl outline-none dark:bg-gray-800 ${padded ? "p-6" : ""} ${className}`}
            >
                {children}
            </div>
        </div>
    );
}
