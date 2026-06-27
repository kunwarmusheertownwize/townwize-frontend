import { useEffect, useState, useCallback, useRef } from "react";
import { FaBell, FaCheckDouble } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const getDeepLink = (n) => {
  const rideId = n.rideId;
  if (!rideId) return null;
  if (["RIDE_ACCEPTED", "DRIVER_ARRIVED", "TRIP_STARTED"].includes(n.type))
    return `/passenger/live-tracking/${rideId}`;
  if (["TRIP_COMPLETED", "CANCEL_FEE_APPLIED"].includes(n.type))
    return `/passenger/trip-receipt/${rideId}`;
  if (n.type === "RIDE_CANCELLED") return "/passenger/trips";
  return null;
};

const TYPE_STYLE = {
  RIDE_ACCEPTED:     { border: "border-townwize-accent",  dot: "bg-townwize-accent" },
  DRIVER_ARRIVED:    { border: "border-blue-400",         dot: "bg-blue-400" },
  TRIP_STARTED:      { border: "border-green-500",        dot: "bg-green-500" },
  TRIP_COMPLETED:    { border: "border-townwize-primary", dot: "bg-townwize-primary" },
  RIDE_CANCELLED:    { border: "border-red-400",          dot: "bg-red-400" },
  CANCEL_FEE_APPLIED:{ border: "border-orange-400",       dot: "bg-orange-400" },
  SYSTEM:            { border: "border-gray-400",         dot: "bg-gray-400" },
};

const formatTime = (iso) => {
  const diff = Date.now() - new Date(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
};

function SkeletonNotification() {
  return (
    <div className="animate-pulse rounded-2xl border-l-4 border-gray-200 dark:border-gray-700 bg-white dark:bg-townwize-primaryDark px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 w-2/3 rounded-md bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-12 rounded-md bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-3 w-4/5 rounded-md bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

const Notifications = () => {
  const navigate = useNavigate();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [marking, setMarking]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const touchStartY = useRef(null);

  const fetchNotifications = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setLoading(true);
    api.get("/notifications?limit=50")
      .then((res) => setItems(res?.data?.data?.items || []))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const doRefresh = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

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

  const markOne = async (n) => {
    setItems((prev) => prev.map((item) => item._id === n._id ? { ...item, read: true } : item));
    api.patch(`/notifications/${n._id}/read`).catch(() => {});
    const link = getDeepLink(n);
    if (link) navigate(link);
  };

  const markAll = async () => {
    if (marking) return;
    setMarking(true);
    await api.patch("/notifications/read-all").catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setMarking(false);
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-townwize-primary dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAll}
              disabled={marking}
              className="flex items-center gap-1.5 text-xs font-medium text-townwize-accent hover:underline disabled:opacity-50"
            >
              <FaCheckDouble /> Mark all read
            </button>
          )}
          <button
            onClick={() => fetchNotifications()}
            disabled={loading}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <button
        onClick={doRefresh}
        disabled={loading || refreshing}
        className="sm:hidden flex items-center gap-1.5 text-xs font-medium text-townwize-accent border border-townwize-accent/30 rounded-xl px-3 py-1.5 hover:bg-townwize-accent/5 disabled:opacity-40 transition"
      >
        <span className={refreshing ? "animate-spin inline-block" : "inline-block"}>↻</span>
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonNotification key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-townwize-primaryDark py-16 text-gray-400">
          <FaBell className="text-4xl" />
          <p className="text-base font-semibold text-gray-700 dark:text-gray-200">No notifications</p>
          <p className="text-sm text-gray-400">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const style = TYPE_STYLE[n.type] || TYPE_STYLE.SYSTEM;
            return (
              <button
                key={n._id}
                type="button"
                onClick={() => markOne(n)}
                className={`w-full text-left rounded-2xl border-l-4 ${style.border} bg-white dark:bg-townwize-primaryDark px-4 py-3 shadow-sm transition hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot} ${n.read ? "opacity-0" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${n.read ? "text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-gray-400">{formatTime(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
