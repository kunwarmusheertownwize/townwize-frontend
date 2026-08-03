import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaStar, FaUsers } from "react-icons/fa";
import api from "../../../services/api";

const STATUS_META = {
  COMPLETED:       { label: "Completed",      cls: "bg-green-100 text-green-700" },
  CANCELLED:       { label: "Cancelled",      cls: "bg-red-100 text-red-600" },
  POOLING_MERGED:  { label: "Joined group",   cls: "bg-purple-100 text-purple-700" },
  SCHEDULED:       { label: "Scheduled",      cls: "bg-amber-100 text-amber-700" },
  REQUESTED:       { label: "Requested",      cls: "bg-blue-100 text-blue-600" },
  DRIVER_ASSIGNED: { label: "Assigned",       cls: "bg-blue-100 text-blue-600" },
  EN_ROUTE:        { label: "En Route",       cls: "bg-blue-100 text-blue-600" },
  ARRIVED:         { label: "Arrived",        cls: "bg-blue-100 text-blue-600" },
  ON_TRIP:         { label: "On Trip",        cls: "bg-townwize-accent/10 text-townwize-accent" },
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
  const actual = ride.fareAdjustment?.actualDistanceKm;
  const km = actual != null ? actual : (ride.estimatedFareBreakdown?.distanceKm ?? 0);
  return km > 0 ? `${Number(km).toFixed(1)} km` : null;
};

const LIMIT = 10;

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white dark:bg-townwize-primaryDark dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-3/4 rounded-md bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex items-start gap-2.5">
            <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-1/2 rounded-md bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <div className="h-5 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-12 rounded-md bg-gray-200 dark:bg-gray-700 ml-auto" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-28 rounded-md bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function PassengerTrips() {
  const navigate = useNavigate();
  const [rides, setRides]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [pages, setPages]           = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const touchStartY = useRef(null);

  const doRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
      else touchStartY.current = null;
    };
    const onTouchEnd = (e) => {
      if (touchStartY.current == null) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta >= 60) doRefresh();
      touchStartY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [doRefresh]);

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
      .finally(() => {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => { mounted = false; };
  }, [page, refreshKey]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-townwize-primary dark:text-white">Ride History</h1>
          {!loading && total > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{total} trip{total !== 1 ? "s" : ""} total</p>
          )}
        </div>
        {/* hidden on mobile: the pull-to-refresh button below is `sm:hidden`,
            so without this both rendered at once on a phone. */}
        <button
          onClick={() => { setPage(1); setRefreshKey((k) => k + 1); }}
          disabled={loading}
          className="hidden sm:block rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <button
        onClick={doRefresh}
        disabled={loading || refreshing}
        className="sm:hidden flex items-center gap-1.5 text-xs font-medium text-townwize-accent border border-townwize-accent/30 rounded-xl px-3 py-1.5 hover:bg-townwize-accent/5 disabled:opacity-40 transition"
      >
        <span className={refreshing ? "animate-spin inline-block" : "inline-block"}>↻</span>
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white dark:bg-townwize-primaryDark py-16 text-gray-400">
          <span className="text-5xl">🚗</span>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-200">No trips yet</p>
          <p className="text-sm text-gray-400">Your completed rides will appear here</p>
          <Link to="/passenger/home" className="mt-2 rounded-xl bg-townwize-primary px-5 py-2 text-sm font-semibold text-white">
            Book a ride
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rides.map((ride) => {
              const meta = STATUS_META[ride.status] || { label: ride.status, cls: "bg-gray-100 text-gray-600" };
              const dist = distanceOf(ride);
              const isCompleted = ride.status === "COMPLETED";
              const isMerged = ride.status === "POOLING_MERGED" && !!ride.linkedRideId;
              // Cancelled trips were unopenable, so a passenger had no way to
              // see what happened to one — including whether anything was
              // charged. That is precisely the ride someone needs to check.
              const isCancelled = ride.status === "CANCELLED";
              const canOpen = isCompleted || isMerged || isCancelled;
              const rated = ride.passengerRating?.stars;
              const handleClick = () => {
                if (isMerged) navigate(`/passenger/trip-receipt/${ride.linkedRideId}`);
                else if (canOpen) navigate(`/passenger/trip-receipt/${ride._id}`);
              };
              return (
                <div
                  key={ride._id}
                  onClick={handleClick}
                  className={`rounded-2xl border border-gray-100 bg-white dark:bg-townwize-primaryDark dark:border-gray-700 p-4 shadow-sm ${canOpen ? "cursor-pointer hover:border-townwize-primary/40 hover:shadow-md transition-shadow" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
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

                    <div className="shrink-0 text-right">
                      {/* A cancelled trip costs nothing, but the list showed its
                          ESTIMATE in the same bold style as a real fare — so a
                          cancelled ride read as though it had charged 257 PKR.
                          Show what was actually charged, which for a cancelled
                          ride is nothing. */}
                      {isCancelled ? (
                        <>
                          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                            Not charged
                          </p>
                          <p className="text-[11px] text-gray-400">
                            est. {fareOf(ride)} PKR
                          </p>
                        </>
                      ) : (
                        <p className="text-base font-bold text-townwize-primary dark:text-white">
                          {fareOf(ride)} PKR
                        </p>
                      )}
                      {dist && <p className="text-xs text-gray-400">{dist}</p>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(ride.createdAt)} · {formatTime(ride.createdAt)}
                    </span>
                    {isCompleted && rated && (
                      <span className="flex items-center gap-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5">
                        {[1,2,3,4,5].map((n) => (
                          <FaStar key={n} className={`text-[9px] ${n <= rated ? "text-yellow-400" : "text-gray-200 dark:text-gray-600"}`} />
                        ))}
                      </span>
                    )}
                    {isCompleted && !rated && (
                      <span className="rounded-full border border-townwize-primary/40 px-2 py-0.5 text-xs font-semibold text-townwize-primary dark:text-townwize-accent">
                        Rate
                      </span>
                    )}
                    {ride.rideType === "RIDETOGETHER" && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
                        <FaUsers size={9} /> RideTogether
                      </span>
                    )}
                    {isMerged && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-townwize-primary dark:text-townwize-accent underline underline-offset-2">
                        <FaUsers size={9} /> View shared ride receipt →
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400 capitalize">
                      {ride.carType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

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
