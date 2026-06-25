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

const StarDisplay = ({ rating }) => {
  if (!rating) return null;
  const stars = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" title={`Rated ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 ${n <= stars ? "text-yellow-400" : "text-gray-200 dark:text-gray-600"}`}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

const Trips = () => {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  const rows = useMemo(() => {
    if (!fromDate && !toDate) return trips;
    return trips.filter((trip) => {
      const d = new Date(trip.date);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate + "T23:59:59") : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [trips, fromDate, toDate]);

  const hasFilter = fromDate || toDate;

  const clearFilter = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trips</h1>
          <p className="text-sm text-gray-500">Your trip history</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Refresh
        </button>
      </div>

      {/* Date range filter */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-townwize-primaryDark p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={toDate || undefined}
            className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-accent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate || undefined}
            className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-accent"
          />
        </div>
        {hasFilter && (
          <button
            onClick={clearFilter}
            className="self-end px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Clear
          </button>
        )}
        {hasFilter && (
          <p className="self-end text-xs text-gray-400 dark:text-gray-500">
            {rows.length} of {trips.length} trip{trips.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">Loading trips...</div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-500">
          {hasFilter ? "No trips match the selected date range." : "No trips found."}
        </div>
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
                <div className="flex items-center gap-2">
                  {trip.rating != null && <StarDisplay rating={trip.rating} />}
                  <span className={`px-2 py-1 text-xs rounded-full ${statusStyle(trip.status)}`}>
                    {String(trip.status || "").replace("_", " ")}
                  </span>
                </div>
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
