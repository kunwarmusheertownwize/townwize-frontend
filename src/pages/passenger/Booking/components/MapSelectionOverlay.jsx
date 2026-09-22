import React from "react";

/**
 * MapSelectionOverlay
 * -------------------
 * Center-pin drag-to-set UI. User drags the map under the pin, then taps confirm.
 * Parent passes onConfirm() which reads the map center and sets the address.
 */
export default function MapSelectionOverlay({
    selectingFor,
    onCancel,
    onConfirm,
}) {
    if (!selectingFor) return null;

    const label = selectingFor === "pickup" ? "Pickup" : selectingFor === "stop" ? "Stop" : "Dropoff";
    const accentColor = selectingFor === "pickup" ? "#2d88e0" : selectingFor === "stop" ? "#f59e0b" : "#E53935";

    return (
        <div className="absolute inset-0 z-20 pointer-events-none">
            {/* Center pin — always points at the exact map center */}
            <div
                className="absolute"
                style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -100%)",
                    pointerEvents: "none",
                }}
            >
                <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="18" cy="46" rx="6" ry="2" fill="rgba(0,0,0,0.18)" />
                    <path
                        d="M18 0C9.163 0 2 7.163 2 16C2 27 18 44 18 44C18 44 34 27 34 16C34 7.163 26.837 0 18 0Z"
                        fill={accentColor}
                    />
                    <circle cx="18" cy="16" r="7" fill="white" />
                </svg>
            </div>

            {/* Top bar — instruction + cancel */}
            <div
                className="absolute top-16 start-0 end-0 flex flex-col items-center gap-2 pointer-events-auto px-4"
            >
                <div className="bg-white dark:bg-townwize-primaryDark rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3 w-full max-w-xs">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-1 text-center">
                        Drag map to set {label}
                    </span>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-xs font-medium text-red-500 hover:text-red-600 shrink-0"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {/* Confirm button — floats above the bottom sheet */}
            <div
                className="absolute start-0 end-0 flex justify-center pointer-events-auto"
                style={{ bottom: "calc(32vh + 16px)" }}
            >
                <button
                    type="button"
                    onClick={onConfirm}
                    className="px-8 py-3 rounded-full text-sm font-semibold text-white shadow-lg active:scale-95 transition-transform"
                    style={{ backgroundColor: accentColor }}
                >
                    Set {label} here
                </button>
            </div>
        </div>
    );
}
