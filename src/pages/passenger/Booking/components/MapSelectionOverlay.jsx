// src/pages/passenger/Booking/components/MapSelectionOverlay.jsx

import React from "react";

/**
 * MapSelectionOverlay
 * -------------------
 * UI-only overlay for map click selection.
 * Controlled entirely by parent.
 */
export default function MapSelectionOverlay({
    selectingFor,      // "pickup" | "stop" | "dropoff" | null
    onCancel,
}) {
    if (!selectingFor) return null;

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Dim background (map still clickable) */}
            <div className="absolute inset-0 bg-black bg-opacity-10" />

            {/* Instruction box */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white dark:bg-townwize-primaryDark p-4 rounded-lg text-center pointer-events-auto shadow-lg">
                    <p className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-100">
                        Click on the map to set <span className="capitalize">{selectingFor}</span> location
                    </p>

                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-md text-sm font-medium
                       bg-red-500 text-white hover:bg-red-600"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
