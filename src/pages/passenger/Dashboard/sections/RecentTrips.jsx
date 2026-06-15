import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCarSide } from "react-icons/fa";
import api from "../../../../services/api";

const STATUS_META = {
  COMPLETED: { label: "Completed", cls: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
};

const formatDate = (iso) => {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
};

const fareOf = (ride) =>
  Number(ride.fareAdjustment?.finalFare || ride.fareEstimate || 0).toLocaleString();

const RecentTrips = () => {
  const [rides, setRides]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/rides/my?page=1&limit=3")
      .then((res) => {
        if (!mounted) return;
        setRides(res?.data?.data?.items || []);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
          Recent Trips
        </h2>
        {rides.length > 0 && (
          <Link
            to="/passenger/trips"
            className="text-xs text-townwize-accent hover:underline font-medium"
          >
            View all
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3 text-gray-400 dark:text-gray-500">
          <FaCarSide className="text-3xl" />
          <p className="text-sm">No recent trips yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rides.map((ride) => {
            const meta = STATUS_META[ride.status] || { label: ride.status, cls: "bg-gray-100 text-gray-500" };
            return (
              <div
                key={ride._id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-townwize-primary/10">
                  <FaCarSide className="text-townwize-primary dark:text-townwize-accent text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {ride.dropoff?.address || "Unknown destination"}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(ride.createdAt)}</p>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-sm font-bold text-townwize-primary dark:text-white">
                    {fareOf(ride)} PKR
                  </p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentTrips;
