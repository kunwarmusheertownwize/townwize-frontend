// src/pages/passenger/Booking/components/RideTypeCard.jsx

import React from "react";

/**
 * RideTypeCard
 * ------------
 * UI-only selectable ride card.
 */
export default function RideTypeCard({
    title,
    icon,
    selected = false,
    disabled = false,
    children,
    onSelect,
}) {
    return (
        <div
            onClick={!disabled ? onSelect : undefined}
            className={`p-4 rounded-xl flex flex-col items-center shadow transition-all
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
        ${selected
                    ? "bg-townwize-primary text-white"
                    : "bg-townwize-bgLight dark:bg-townwize-bgDark text-townwize-textPrimary dark:text-white border border-gray-200 dark:border-gray-600"
                }
      `}
        >
            {icon && <div className="text-2xl mb-2">{icon}</div>}
            <span className="text-sm font-medium">{title}</span>

            {selected && children && (
                <div className="mt-2 text-sm flex flex-col items-center">
                    {children}
                </div>
            )}
        </div>
    );
}
