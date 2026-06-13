import React from "react";
import { FaRedoAlt, FaWallet, FaHeadset } from "react-icons/fa";

const QuickActions = () => {
    const actions = [
        {
            id: 1,
            label: "Book Again",
            icon: <FaRedoAlt />,
            color: "bg-townwize-primary hover:bg-townwize-primaryDark text-white",
        },
        {
            id: 2,
            label: "Top Up Wallet",
            icon: <FaWallet />,
            color:
                "bg-townwize-accent hover:bg-yellow-500 text-townwize-primary font-semibold",
        },
        {
            id: 3,
            label: "Support",
            icon: <FaHeadset />,
            color:
                "bg-gray-200 dark:bg-gray-700 text-townwize-primary dark:text-townwize-accent hover:bg-gray-300 dark:hover:bg-gray-600",
        },
    ];

    return (
        <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-4">
            <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
                Quick Actions
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl shadow-sm transition-all text-sm font-medium ${action.color}`}
                    >
                        {action.icon}
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;
