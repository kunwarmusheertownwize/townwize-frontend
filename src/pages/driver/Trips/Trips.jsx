import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchDriverTrips } from "../../../api/driverApi";

const statusStyle = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETED") return "bg-green-100 text-green-700";
  if (s === "CANCELLED") return "bg-red-100 text-red-700";
  if (s === "ON_TRIP" || s === "EN_ROUTE" || s === "ARRIVED") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
};

const prettyRideType = (type) => {
  if (String(type).toUpperCase() === "RIDETOGETHER") return "RideTogether";
  return "Private Ride";
};

const Trips = () => {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchDriverTrips();
      setTrips(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Unable to load trips right now.");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => trips, [trips]);

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trips</h1>
          <p className="text-sm text-gray-500">Your trip history</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">Loading trips...</div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-500">No trips found.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((trip) => (
            <div
              key={trip.id}
              className="p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <div className="text-sm text-gray-500">
                  {new Date(trip.date).toLocaleString()}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${statusStyle(trip.status)}`}>
                  {String(trip.status || "").replace("_", " ")}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                <p>
                  <strong>Pickup:</strong>{" "}
                  <span className="text-gray-600 dark:text-gray-300">{trip.pickup}</span>
                </p>
                <p>
                  <strong>Dropoff:</strong>{" "}
                  <span className="text-gray-600 dark:text-gray-300">{trip.dropoff}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between mt-3 text-sm gap-3">
                <span className="text-gray-500">{prettyRideType(trip.rideType)}</span>
                <span className="text-gray-500">{Number(trip.distanceKm || 0).toFixed(1)} km</span>
                <span className="font-semibold">{Number(trip.fare || 0).toLocaleString()} PKR</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trips;

