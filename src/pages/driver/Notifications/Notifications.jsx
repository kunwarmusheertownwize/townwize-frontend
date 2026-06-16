import { useEffect, useState, useCallback } from "react";
import { FaBell, FaCheckDouble } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const getDeepLink = (n) => {
  if (n.type === "TRIP_COMPLETED") return "/driver/trips";
  if (n.type === "RIDE_CANCELLED") return "/driver/home";
  return null;
};

const TYPE_STYLE = {
  RIDE_ACCEPTED:      { border: "border-townwize-accent",  dot: "bg-townwize-accent" },
  TRIP_COMPLETED:     { border: "border-green-500",        dot: "bg-green-500" },
  RIDE_CANCELLED:     { border: "border-red-400",          dot: "bg-red-400" },
  CANCEL_WARNING:     { border: "border-orange-400",       dot: "bg-orange-400" },
  CANCEL_SUSPENSION:  { border: "border-red-600",          dot: "bg-red-600" },
  PAYOUT_UPDATE:      { border: "border-blue-400",         dot: "bg-blue-400" },
  SYSTEM:             { border: "border-gray-400",         dot: "bg-gray-400" },
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

const DriverNotifications = () => {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    api.get("/notifications?limit=50")
      .then((res) => setItems(res?.data?.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

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
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            disabled={marking}
            className="flex items-center gap-1.5 text-xs font-medium text-townwize-accent hover:underline disabled:opacity-50"
          >
            <FaCheckDouble /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-townwize-primaryDark py-16 text-gray-400">
          <FaBell className="text-4xl" />
          <p className="text-sm">No notifications yet.</p>
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
                className={`w-full text-left rounded-2xl border-l-4 ${style.border} bg-white dark:bg-townwize-primaryDark px-4 py-3 shadow-sm transition hover:shadow-md ${
                  n.read ? "opacity-70" : ""
                }`}
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

export default DriverNotifications;
