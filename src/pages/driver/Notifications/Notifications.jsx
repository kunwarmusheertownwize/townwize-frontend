import { useState } from "react";

const MOCK_NOTIFICATIONS = [
    {
        id: "NTF-001",
        title: "New Ride Request",
        message: "A nearby passenger is requesting a ride.",
        time: "5 min ago",
        type: "ride",
        read: false,
    },
    {
        id: "NTF-002",
        title: "Trip Completed",
        message: "Your trip has been completed successfully.",
        time: "Yesterday",
        type: "trip",
        read: true,
    },
    {
        id: "NTF-003",
        title: "System Update",
        message: "New features have been added to improve your experience.",
        time: "2 days ago",
        type: "system",
        read: true,
    },
];

const typeStyles = {
    ride: "border-blue-500",
    trip: "border-green-500",
    system: "border-gray-400",
};

const DriverNotifications = () => {
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    const markAsRead = (id) => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === id ? { ...n, read: true } : n
            )
        );
    };

    return (
        <div className="max-w-4xl mx-auto mt-8 px-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Notifications</h1>
                <p className="text-sm text-gray-500">
                    Recent updates and alerts
                </p>
            </div>

            {/* Empty State */}
            {notifications.length === 0 ? (
                <div className="text-gray-500 py-12 text-center">
                    No notifications yet
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n) => (
                        <button
                            key={n.id}
                            type="button"
                            onClick={() => markAsRead(n.id)}
                            aria-pressed={n.read}
                            className={`w-full text-left cursor-pointer p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm border-l-4
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-townwize-primary
                            focus-visible:ring-offset-2
                            ${typeStyles[n.type]}
                            ${n.read ? "opacity-80" : "bg-blue-50 dark:bg-opacity-90"}
                        `}
                        >
                            
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-sm">
                                    {n.title}
                                </h3>
                                <span className="text-xs text-gray-400">
                                    {n.time}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {n.message}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DriverNotifications;
