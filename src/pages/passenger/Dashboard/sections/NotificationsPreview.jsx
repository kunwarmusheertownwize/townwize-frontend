import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import api from "../../../../services/api";

const formatTime = (iso) => {
  const diff = Date.now() - new Date(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
};

const NotificationsPreview = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get("/notifications?limit=5")
      .then((res) => {
        if (!mounted) return;
        setItems((res?.data?.data?.items || []).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
          Notifications
        </h2>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Link
              to="/passenger/notifications"
              className="text-xs text-townwize-accent hover:underline font-medium"
            >
              View all
            </Link>
          )}
          <FaBell className="text-townwize-primary dark:text-townwize-accent text-xl" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 gap-2 text-gray-400 dark:text-gray-500">
          <FaBell className="text-2xl" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n._id}
              className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm shadow-sm ${!n.read ? "border-s-2 border-townwize-accent" : ""}`}
            >
              <div className={`font-medium ${n.read ? "text-gray-600 dark:text-gray-300" : "text-gray-800 dark:text-gray-100"}`}>
                {n.title || n.message}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {formatTime(n.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && items.length > 0 && (
        <Link
          to="/passenger/notifications"
          className="block text-center text-xs font-medium text-townwize-primary dark:text-townwize-accent hover:underline pt-1"
        >
          See all notifications →
        </Link>
      )}
    </div>
  );
};

export default NotificationsPreview;
