import React from "react";
import { FaBell } from "react-icons/fa";

const NotificationsPreview = () => {
    const notifications = [
        {
            id: 1,
            message: "Your driver has arrived!",
            time: "2 mins ago",
        },
        {
            id: 2,
            message: "Wallet top-up successful (1,000 PKR)",
            time: "1 hour ago",
        },
        {
            id: 3,
            message: "Ride completed — Thanks for riding with Townwize!",
            time: "Yesterday",
        },
    ];

    return (
        <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
                    Notifications
                </h2>
                <FaBell className="text-townwize-primary dark:text-townwize-accent text-xl" />
            </div>

            {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                    No new notifications.
                </p>
            ) : (
                <ul className="space-y-2">
                    {notifications.map((n) => (
                        <li
                            key={n.id}
                            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-townwize-accent/10 transition-all text-sm shadow-sm"
                        >
                            <div className="text-gray-800 dark:text-gray-200">
                                {n.message}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {n.time}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default NotificationsPreview;
