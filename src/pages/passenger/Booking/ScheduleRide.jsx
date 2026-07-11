import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft, FaUsers, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import api from "../../../services/api";
import PassengerLayout from "../../../layouts/PassengerLayout";

const ScheduleRide = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const pickup = state?.pickup || "";
  const pickupCoords = state?.pickupCoords || null;
  const dropoff = state?.dropoff || "";
  const scheduledAt = state?.scheduledAt || null;

  const [availableRides, setAvailableRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    if (!scheduledAt) {
      navigate("/passenger/home", { replace: true });
      return;
    }
    const fetch = async () => {
      setLoadingRides(true);
      try {
        const res = await api.get("/rides/shared/available", {
          params: {
            pickupText: pickup,
            dropoffText: dropoff,
            scheduledAt,
          },
        });
        setAvailableRides(res.data?.data?.rides || []);
      } catch {
        setAvailableRides([]);
      } finally {
        setLoadingRides(false);
      }
    };
    fetch();
  }, [scheduledAt, pickup, dropoff, navigate]);

  const handleJoin = async (ride) => {
    setJoiningId(ride.rideId);
    try {
      const res = await api.post(`/rides/${ride.rideId}/join`);
      const data = res.data?.data;
      toast.success(`Joined! Fare per seat: PKR ${data?.farePerSeat?.toLocaleString()}`);
      if (data?.isDispatched) {
        localStorage.setItem("activePassengerRideId", ride.rideId);
        navigate(`/passenger/live-tracking/${ride.rideId}`, { replace: true });
      } else {
        navigate("/passenger/trips", { replace: true });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Could not join ride");
      setJoiningId(null);
    }
  };

  const handleCreateOwn = () => {
    navigate("/passenger/select-ride", {
      state: { pickup, pickupCoords, dropoff, scheduledAt },
    });
  };

  const scheduledLabel = scheduledAt
    ? new Date(scheduledAt).toLocaleString("en-PK", { dateStyle: "full", timeStyle: "short" })
    : "";

  return (
    <PassengerLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <FaArrowLeft className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Schedule a Shared Ride</h1>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
              <FaClock className="shrink-0" /> {scheduledLabel}
            </p>
          </div>
        </div>

        {/* Route summary */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 space-y-2">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-2.5 h-2.5 rounded-full bg-townwize-primary shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{pickup || "—"}</p>
          </div>
          <div className="ml-[5px] h-4 border-l-2 border-dashed border-gray-200 dark:border-gray-600" />
          <div className="flex items-start gap-3">
            <FaMapMarkerAlt className="mt-0.5 text-red-500 shrink-0 text-sm" />
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{dropoff || "—"}</p>
          </div>
        </div>

        {/* Available shared rides */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
            Available Shared Rides
          </h2>

          {loadingRides ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : availableRides.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-5 text-center">
              <FaUsers className="text-gray-300 dark:text-gray-600 text-3xl mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No shared rides yet for this time</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first — create your own below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableRides.map((ride) => (
                <div
                  key={ride.rideId}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                      {new Date(ride.scheduledAt).toLocaleTimeString("en-PK", { timeStyle: "short" })} · {ride.seatsLeft} seat{ride.seatsLeft !== 1 ? "s" : ""} left
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{ride.pickup}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">→ {ride.dropoff}</p>
                    <p className="text-sm font-bold text-townwize-primary dark:text-townwize-accent mt-1">
                      PKR {ride.farePerSeat?.toLocaleString()} / seat
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoin(ride)}
                    disabled={joiningId === ride.rideId}
                    className="shrink-0 px-4 py-2 rounded-xl bg-townwize-primary text-white text-sm font-semibold disabled:opacity-50 transition"
                  >
                    {joiningId === ride.rideId ? "Joining…" : "Join"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create own ride */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-5 space-y-3">
          <div className="flex items-center gap-2">
            <FaUsers className="text-townwize-primary dark:text-townwize-accent" />
            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Create Your Own Shared Ride</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Set your route and seat count. Others with similar schedules can join and split the fare.
          </p>
          <button
            onClick={handleCreateOwn}
            className="w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold text-sm hover:bg-townwize-primaryDark transition"
          >
            Set Up Route & Fare
          </button>
        </div>

      </div>
    </PassengerLayout>
  );
};

export default ScheduleRide;
