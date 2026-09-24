import { useEffect, useRef } from "react";

/**
 * Keeps keyboard focus inside an open overlay.
 *
 * Extracted from Modal because not every overlay is a centred dialog — the
 * navigation drawer slides in from the edge and cannot use Modal's layout, but
 * needs exactly the same trapping. Without it, Tab walks out of the open
 * overlay and onto the page behind, where a keyboard user can reach and
 * activate controls they cannot see.
 *
 * Returns a ref to put on the element that should contain focus.
 *
 * @param open        whether the overlay is showing
 * @param onEscape    called on Escape; omit for an overlay that must be answered
 */
const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function useFocusTrap(open, onEscape) {
    const ref = useRef(null);
    const restoreRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        // Remember what had focus, so closing returns the user where they
        // were rather than dropping them at the top of the document.
        restoreRef.current = document.activeElement;

        const node = ref.current;
        const first = node?.querySelector(FOCUSABLE);
        (first || node)?.focus?.();

        const onKeyDown = (e) => {
            if (e.key === "Escape" && onEscape) {
                e.stopPropagation();
                onEscape();
                return;
            }
            if (e.key !== "Tab" || !node) return;

            const items = [...node.querySelectorAll(FOCUSABLE)].filter(
                // offsetParent is null for display:none — a hidden control
                // must not be a stop in the cycle.
                (el) => el.offsetParent !== null || el === document.activeElement
            );
            if (!items.length) {
                e.preventDefault();
                return;
            }

            const firstItem = items[0];
            const lastItem = items[items.length - 1];

            // Wrap at both ends, and haul focus back if it started outside.
            if (e.shiftKey && document.activeElement === firstItem) {
                e.preventDefault();
                lastItem.focus();
            } else if (!e.shiftKey && document.activeElement === lastItem) {
                e.preventDefault();
                firstItem.focus();
            } else if (!node.contains(document.activeElement)) {
                e.preventDefault();
                firstItem.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown, true);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown, true);
            document.body.style.overflow = previousOverflow;
            restoreRef.current?.focus?.();
        };
    }, [open, onEscape]);

    return ref;
}
