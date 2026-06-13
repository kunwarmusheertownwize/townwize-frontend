import React from "react";
import { FaMapMarkerAlt, FaCarSide, FaClock } from "react-icons/fa";

const RecentTrips = () => {
    const recentTrips = [
        {
            id: 1,
            date: "Jan 2, 2026",
            pickup: "Precinct 10, Bahria Town Karachi",
            dropoff: "Dolmen Mall Clifton",
            fare: 950,
            status: "Completed",
            duration: "42 mins",
        },
        {
            id: 2,
            date: "Dec 29, 2025",
            pickup: "BTK Jinnah Avenue",
            dropoff: "Lucky One Mall",
            fare: 1_250,
            status: "Completed",
            duration: "1 hr 10 mins",
        },
    ];

    return (
        <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
            <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
                Recent Trips
            </h2>

            {recentTrips.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                    No recent trips found.
                </p>
            ) : (
                <ul className="space-y-3">
                    {recentTrips.map((trip) => (
                        <li
                            key={trip.id}
                            className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-townwize-accent/10 transition-all shadow-sm"
                        >
                            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>{trip.date}</span>
                                <span className="font-semibold text-townwize-primary dark:text-townwize-accent">
                                    {trip.status}
                                </span>
                            </div>

                            <div className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                                <div className="flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-green-500" />
                                    <span>{trip.pickup}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-red-500" />
                                    <span>{trip.dropoff}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                    <FaClock /> {trip.duration}
                                </div>
                                <div className="flex items-center gap-1 font-semibold text-townwize-primary dark:text-townwize-accent">
                                    <FaCarSide /> {trip.fare} PKR
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default RecentTrips;
