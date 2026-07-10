import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaStar } from "react-icons/fa";
import api from "../../../services/api";

const DriverTripSummary = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const trip = state?.trip;

    const [rideData, setRideData] = useState(null);
    const [rating, setRating] = useState(0);
    const [rated, setRated] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!trip?.rideId) return;
        api.get(`/rides/${trip.rideId}`)
            .then((res) => { if (res.data?.success) setRideData(res.data.data); })
            .catch(() => {});
    }, [trip?.rideId]);

    const handleRate = async (stars) => {
        if (rated || submitting) return;
        setRating(stars);
        setSubmitting(true);
        try {
            await api.post(`/rides/${trip.rideId}/rate`, { rating: stars, role: "driver" });
            setRated(true);
        } catch {
            // rating is non-critical — mark as done anyway to avoid re-attempt
            setRated(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (!trip) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">Trip data unavailable.</p>
                <button
                    onClick={() => navigate("/driver/trip-requests", { replace: true })}
                    className="px-5 py-2.5 rounded-xl bg-townwize-primary text-white font-semibold"
                >
                    Go Online
                </button>
            </div>
        );
    }

    const gross = Number(trip.fare || rideData?.fareEstimate || 0);
    const commission = Number(rideData?.commissionAmount || 0);
    const net = commission > 0 ? gross - commission : gross;

    return (
        <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto">
                    <FaCheckCircle className="text-green-500 dark:text-green-400 text-3xl" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Trip Completed</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Great job! Here's your trip summary.</p>
            </div>

            {/* Route */}
            <div className="bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-townwize-accent shrink-0" />
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Pickup</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{trip.pickup || "—"}</p>
                    </div>
                </div>
                <div className="ml-[0.5rem] h-4 border-l-2 border-dashed border-gray-200 dark:border-gray-600" />
                <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Dropoff</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{trip.dropoff || "—"}</p>
                    </div>
                </div>
                {trip.rideType && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
                        {trip.rideType}
                    </p>
                )}
            </div>

            {/* Earnings breakdown */}
            <div className="bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Earnings</h3>
                <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>Gross Fare</span>
                        <span>PKR {gross.toLocaleString()}</span>
                    </div>
                    {commission > 0 && (
                        <div className="flex justify-between text-red-500 dark:text-red-400">
                            <span>Platform Commission</span>
                            <span>− PKR {commission.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5 flex justify-between font-bold text-base">
                        <span className="text-gray-800 dark:text-white">Your Earnings</span>
                        <span className="text-townwize-primary dark:text-townwize-accent">
                            PKR {net.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Rate passenger */}
            <div className="bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Rate Your Passenger</h3>
                {rated ? (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium text-center py-1">
                        ✓ Rating submitted
                    </p>
                ) : (
                    <div className="flex justify-center gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => handleRate(star)}
                                disabled={submitting}
                                className="transition-transform hover:scale-110 active:scale-95 disabled:opacity-60"
                            >
                                <FaStar
                                    className={`text-3xl transition-colors ${
                                        star <= rating
                                            ? "text-yellow-400"
                                            : "text-gray-200 dark:text-gray-600"
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={() => navigate("/driver/trip-requests", { replace: true })}
                className="w-full py-3.5 rounded-xl font-bold bg-townwize-primary text-white hover:bg-townwize-primaryDark transition"
            >
                Go Online Again
            </button>

        </div>
    );
};

export default DriverTripSummary;
