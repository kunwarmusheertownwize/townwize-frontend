import { FaCarSide } from "react-icons/fa";

const ActiveRideCard = () => {
    return (
        <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 text-center space-y-2">
            <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent text-left">
                Active Ride
            </h2>
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-gray-400 dark:text-gray-500">
                <FaCarSide className="text-3xl" />
                <p className="text-sm">No active ride right now.</p>
            </div>
        </div>
    );
};

export default ActiveRideCard;
