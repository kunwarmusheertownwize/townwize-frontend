import React from "react";
import { FaMapMarkerAlt, FaClock, FaCarSide } from "react-icons/fa";

const ActiveRideCard = () => {
    const activeRide = {
        id: 12345,
        pickup: "Bahria Town Karachi",
        dropoff: "DHA Phase 6",
        eta: "20 mins",
        status: "On the way",
    };

    if (!activeRide) {
        return (
            <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 text-gray-500 dark:text-gray-300 text-sm text-center">
                No active rides right now.
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
            <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
                Active Ride
            </h2>

            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <FaMapMarkerAlt className="text-green-500" />
                <span>
                    <strong>Pickup:</strong> {activeRide.pickup}
                </span>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <FaMapMarkerAlt className="text-red-500" />
                <span>
                    <strong>Dropoff:</strong> {activeRide.dropoff}
                </span>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <FaClock className="text-yellow-500" />
                <span>
                    ETA: <strong>{activeRide.eta}</strong>
                </span>
            </div>

            <div className="flex items-center gap-2 text-townwize-primary dark:text-townwize-accent font-medium">
                <FaCarSide />
                {activeRide.status}
            </div>
        </div>
    );
};

export default ActiveRideCard;
