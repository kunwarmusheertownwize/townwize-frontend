// src/pages/passenger/Booking/components/RouteLoaderOverlay.jsx

import React from "react";

/**
 * RouteLoaderOverlay
 * ------------------
 * UI-only overlay shown while route is being calculated.
 * Visibility is controlled by parent via `isVisible`.
 */
export default function RouteLoaderOverlay({ isVisible }) {
    if (!isVisible) return null;

    return (
        <div
            className="
        absolute inset-0 z-50 flex items-center justify-center
        bg-white/60 dark:bg-black/60 backdrop-blur-sm
        transition-opacity duration-300
      "
        >
            <div className="flex flex-col items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Calculating best route...
                </span>

                <div
                    className="
            w-48 h-3 rounded-full overflow-hidden
            bg-gray-200 dark:bg-gray-700 relative
          "
                >
                    <div
                        className="
              absolute inset-y-0 start-0 w-1/3
              bg-gradient-to-r
              from-gray-300 to-gray-400
              dark:from-gray-600 dark:to-gray-500
              animate-[shimmer_1.2s_infinite]
            "
                    />
                </div>
            </div>
        </div>
    );
}
