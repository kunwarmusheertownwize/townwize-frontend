import { useLocation, useNavigate } from "react-router-dom";

const DriverTripSummary = () => {
    const navigate = useNavigate();
    const { state } = useLocation();

    const trip = state?.trip;

    if (!trip) {
        return (
            <div className="p-6 text-center text-gray-500">
                Trip data unavailable
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-white dark:bg-townwize-primaryDark rounded-2xl shadow-lg">
            <h1 className="text-xl font-bold mb-4">Trip Summary</h1>

            <div className="space-y-2 text-sm">
                <p><strong>Pickup:</strong> {trip.pickup}</p>
                <p><strong>Dropoff:</strong> {trip.dropoff}</p>
                <p><strong>Ride Type:</strong> {trip.rideType}</p>
                <p><strong>Fare:</strong> {trip.fare} PKR</p>
            </div>

            <button
                onClick={() => navigate("/driver/trip-requests", { replace: true })}
                className="mt-6 w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold"
            >
                Go Online
            </button>
        </div>
    );
};

export default DriverTripSummary;
