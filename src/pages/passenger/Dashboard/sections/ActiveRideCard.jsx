import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCarSide, FaChevronRight } from "react-icons/fa";
import api from "../../../../services/api";

const ACTIVE_STATUSES = new Set(["REQUESTED", "DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"]);

const STATUS_LABEL = {
  REQUESTED:       "Finding a driver…",
  DRIVER_ASSIGNED: "Driver assigned",
  EN_ROUTE:        "Driver on the way",
  ARRIVED:         "Driver has arrived",
  ON_TRIP:         "On trip",
};

const ActiveRideCard = () => {
  const navigate = useNavigate();
  const [ride, setRide]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get("/rides/my?page=1&limit=10")
      .then((res) => {
        if (!mounted) return;
        const items = res?.data?.data?.items || [];
        const active = items.find((r) => ACTIVE_STATUSES.has(r.status));
        setRide(active || null);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleClick = () => {
    if (!ride) return;
    navigate(`/passenger/live-tracking/${ride._id}`);
  };

  return (
    <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-2">
      <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
        Active Ride
      </h2>

      {loading ? (
        <div className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      ) : !ride ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3 text-gray-400 dark:text-gray-500">
          <FaCarSide className="text-3xl" />
          <p className="text-sm">No active ride right now.</p>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className="w-full text-start rounded-xl border border-townwize-primary/20 bg-townwize-primary/5 dark:bg-townwize-primary/10 p-3 hover:bg-townwize-primary/10 dark:hover:bg-townwize-primary/20 transition"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-full bg-townwize-primary flex items-center justify-center">
                <FaCarSide className="text-white text-xs" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-townwize-primary dark:text-townwize-accent">
                  {STATUS_LABEL[ride.status] || ride.status}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  → {ride.dropoff?.address || "Dropoff"}
                </p>
              </div>
            </div>
            <FaChevronRight className="text-townwize-primary dark:text-townwize-accent shrink-0 text-xs" />
          </div>
        </button>
      )}
    </div>
  );
};

export default ActiveRideCard;
