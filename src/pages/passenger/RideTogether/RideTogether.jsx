import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PassengerLayout from "../../../layouts/PassengerLayout";
import api from "../../../services/api";
import { FaUsers, FaWallet, FaShieldAlt, FaArrowRight, FaClock } from "react-icons/fa";

const HOW_IT_WORKS = [
  {
    icon: <FaUsers className="text-townwize-primary text-xl" />,
    title: "Book with one tap",
    body: "Select RideTogether when choosing your ride type. No extra steps.",
  },
  {
    icon: <FaShieldAlt className="text-townwize-primary text-xl" />,
    title: "Matched with verified Towners",
    body: "If another verified Townwize member is heading the same way, you ride together.",
  },
  {
    icon: <FaWallet className="text-townwize-primary text-xl" />,
    title: "Fare split automatically",
    body: "The fare is divided between co-riders. You pay less, the Wizer earns more.",
  },
  {
    icon: <FaClock className="text-townwize-primary text-xl" />,
    title: "No match? No problem",
    body: "If no match is found within 3 minutes, you proceed solo at the same RideTogether fare.",
  },
];

const STATUS_LABEL = {
  POOLING: { label: "Matching…", color: "bg-blue-100 text-blue-700" },
  REQUESTED: { label: "Finding Wizer", color: "bg-amber-100 text-amber-700" },
  DRIVER_ASSIGNED: { label: "Wizer assigned", color: "bg-green-100 text-green-700" },
  EN_ROUTE: { label: "On the way", color: "bg-green-100 text-green-700" },
  ARRIVED: { label: "Arrived", color: "bg-green-100 text-green-700" },
  ON_TRIP: { label: "In progress", color: "bg-townwize-primary/10 text-townwize-primary" },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-600" },
};

const RideTogether = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/rides/my", { params: { limit: 10 } })
      .then((res) => {
        const all = res?.data?.data?.items || [];
        setRides(all.filter((r) => r.rideType === "RIDETOGETHER"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PassengerLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-townwize-primary dark:text-white">RideTogether</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Share a ride with other verified Towners. Pay less, travel smart.
          </p>
        </div>

        {/* Book CTA */}
        <button
          onClick={() => navigate("/passenger/select-ride")}
          className="w-full flex items-center justify-between bg-townwize-primary text-white rounded-2xl px-5 py-4 font-semibold shadow-md hover:bg-townwize-primaryDark transition"
        >
          <span>Book a RideTogether</span>
          <FaArrowRight />
        </button>

        {/* How it works */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">How it works</h2>
          <div className="grid grid-cols-1 gap-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="flex items-start gap-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="mt-0.5 shrink-0">{item.icon}</div>
                <div>
                  <p className="font-semibold text-sm text-gray-800 dark:text-white">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent RideTogether rides */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recent group rides</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No RideTogether trips yet. Book your first one above.
            </div>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => {
                const s = STATUS_LABEL[ride.status] || { label: ride.status, color: "bg-gray-100 text-gray-600" };
                const fare = ride.fareAdjustment?.finalFare ?? ride.fareEstimate ?? 0;
                const coRiders = ride.sharedPassengers?.length || 1;
                return (
                  <div
                    key={ride._id}
                    onClick={() => {
                      if (["COMPLETED", "CANCELLED"].includes(ride.status)) {
                        navigate(`/passenger/trip-receipt/${ride._id}`);
                      } else {
                        navigate(`/passenger/live-tracking/${ride._id}`);
                      }
                    }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs text-gray-500 truncate">{ride.pickup?.address || "—"}</p>
                        <p className="text-xs text-gray-400 truncate">→ {ride.dropoff?.address || "—"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${s.color}`}>
                        {s.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FaUsers className="text-townwize-primary" />
                        {coRiders > 1 ? `${coRiders} riders` : "Solo (no match)"}
                      </span>
                      <span className="font-semibold text-townwize-primary dark:text-white">
                        {Number(fare).toLocaleString()} PKR
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </PassengerLayout>
  );
};

export default RideTogether;
