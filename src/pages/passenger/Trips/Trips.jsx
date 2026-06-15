import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCarSide, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import api from "../../../services/api";

const STATUS_META = {
  COMPLETED:       { label: "Completed",   cls: "bg-green-100 text-green-700" },
  CANCELLED:       { label: "Cancelled",   cls: "bg-red-100 text-red-600" },
  REQUESTED:       { label: "Requested",   cls: "bg-blue-100 text-blue-600" },
  DRIVER_ASSIGNED: { label: "Assigned",    cls: "bg-blue-100 text-blue-600" },
  EN_ROUTE:        { label: "En Route",    cls: "bg-blue-100 text-blue-600" },
  ARRIVED:         { label: "Arrived",     cls: "bg-blue-100 text-blue-600" },
  ON_TRIP:         { label: "On Trip",     cls: "bg-townwize-accent/10 text-townwize-accent" },
};

const formatDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });

const fareOf = (ride) =>
  Number(ride.fareAdjustment?.finalFare || ride.fareEstimate || 0).toLocaleString();

const distanceOf = (ride) => {
  const km = ride.fareAdjustment?.actualDistanceKm
    || ride.estimatedFareBreakdown?.distanceKm
    || 0;
  return km > 0 ? `${Number(km).toFixed(1)} km` : null;
};

const LIMIT = 10;

export default function PassengerTrips() {
  const [rides, setRides]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    api
      .get(`/rides/my?page=${page}&limit=${LIMIT}`)
      .then((res) => {
        if (!mounted) return;
        const d = res?.data?.data || {};
        setRides(d.items || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Failed to load trips");
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [page]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-townwize-primary dark:text-white">Ride History</h1>
          {!loading && total > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{total} trip{total !== 1 ? "s" : ""} total</p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white dark:bg-townwize-primaryDark py-16 text-gray-400">
          <FaCarSide className="text-4xl" />
          <p className="text-sm">No trips yet. Book your first ride!</p>
          <Link to="/passenger/home" className="mt-1 rounded-xl bg-townwize-primary px-5 py-2 text-sm font-semibold text-white">
            Book a ride
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rides.map((ride) => {
              const meta = STATUS_META[ride.status] || { label: ride.status, cls: "bg-gray-100 text-gray-600" };
              const dist = distanceOf(ride);
              return (
                <div
                  key={ride._id}
                  className="rounded-2xl border border-gray-100 bg-white dark:bg-townwize-primaryDark dark:border-gray-700 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Route */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-townwize-accent" />
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-1">
                          {ride.pickup?.address || "Pickup"}
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-townwize-primary dark:bg-red-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug line-clamp-1">
                          {ride.dropoff?.address || "Dropoff"}
                        </p>
                      </div>
                    </div>

                    {/* Fare */}
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-townwize-primary dark:text-white">
                        {fareOf(ride)} PKR
                      </p>
                      {dist && <p className="text-xs text-gray-400">{dist}</p>}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(ride.createdAt)} · {formatTime(ride.createdAt)}
                    </span>
                    <span className="ml-auto text-xs text-gray-400 capitalize">
                      {ride.rideType?.toLowerCase().replace("_", " ")} · {ride.carType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-gray-200 p-2 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <FaChevronLeft className="text-sm" />
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-xl border border-gray-200 p-2 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <FaChevronRight className="text-sm" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
