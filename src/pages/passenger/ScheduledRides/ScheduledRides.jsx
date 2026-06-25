import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaClock, FaUsers, FaSearch, FaPlus, FaArrowRight, FaCalendarAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../../services/api";

// ── Helpers ────────────────────────────────────────────────────────────────

const formatScheduled = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const localDatetimeValue = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Minimum 15 min from now
const minDatetimeValue = () => {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  return localDatetimeValue(d);
};

// ── Sub-components ─────────────────────────────────────────────────────────

const TabBar = ({ tab, setTab }) => (
  <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
    {[
      { id: "create", label: "Create a Ride", icon: <FaPlus className="text-xs" /> },
      { id: "search", label: "Find a Ride",   icon: <FaSearch className="text-xs" /> },
      { id: "my",     label: "My Scheduled",  icon: <FaCalendarAlt className="text-xs" /> },
    ].map(({ id, label, icon }) => (
      <button
        key={id}
        onClick={() => setTab(id)}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
          tab === id
            ? "bg-townwize-primary text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        {icon}
        {label}
      </button>
    ))}
  </div>
);

const RideCard = ({ ride, onJoin, joining }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-townwize-accent" />
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-1">
            {ride.pickup}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug line-clamp-1">
            {ride.dropoff}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-base font-extrabold text-townwize-primary dark:text-townwize-accent">
          {Number(ride.farePerSeat).toLocaleString()} PKR
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">per seat</p>
      </div>
    </div>

    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
      <span className="flex items-center gap-1">
        <FaClock className="text-townwize-primary" />
        {formatScheduled(ride.scheduledAt)}
      </span>
      <span className="flex items-center gap-1">
        <FaUsers className="text-townwize-primary" />
        {ride.seatsLeft} of {ride.maxSeats} seats left
      </span>
    </div>

    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-gray-400">
        By <span className="font-medium text-gray-600 dark:text-gray-300">{ride.creatorName}</span>
        {" · "}{ride.carType || "Economy"}
      </p>
      <button
        onClick={() => onJoin(ride.rideId)}
        disabled={joining === ride.rideId}
        className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-townwize-primary text-white disabled:opacity-60 flex items-center gap-1.5"
      >
        {joining === ride.rideId ? "Joining…" : (
          <>Join <FaArrowRight className="text-[10px]" /></>
        )}
      </button>
    </div>
  </div>
);

const MyRideCard = ({ ride }) => {
  const navigate = useNavigate();
  const scheduledLabel = ride.scheduledAt ? formatScheduled(ride.scheduledAt) : "—";

  return (
    <div
      onClick={() => {
        if (["COMPLETED", "CANCELLED"].includes(ride.status)) {
          navigate(`/passenger/trip-receipt/${ride._id}`);
        } else if (["REQUESTED", "DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"].includes(ride.status)) {
          navigate(`/passenger/live-tracking/${ride._id}`);
        }
      }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-1">
            {ride.pickup?.address || ride.pickup || "—"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            → {ride.dropoff?.address || ride.dropoff || "—"}
          </p>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Scheduled
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <FaClock /> {scheduledLabel}
        </span>
        <span className="flex items-center gap-1">
          <FaUsers /> {ride.bookedSeats}/{ride.maxSeats} seats
        </span>
        <span className="ml-auto font-semibold text-townwize-primary dark:text-white">
          {Number(ride.farePerSeat || ride.fareEstimate || 0).toLocaleString()} PKR
        </span>
      </div>
    </div>
  );
};

// ── Tabs ────────────────────────────────────────────────────────────────────

const CreateTab = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    pickup: "", dropoff: "", scheduledAt: "", maxSeats: 2,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pickup.trim() || !form.dropoff.trim()) {
      toast.error("Please enter pickup and dropoff locations");
      return;
    }
    if (!form.scheduledAt) {
      toast.error("Please select a departure time");
      return;
    }
    if (new Date(form.scheduledAt) <= new Date()) {
      toast.error("Departure time must be in the future");
      return;
    }

    setSubmitting(true);
    try {
      // Get a fare quote first (requires coords — fall back to address-based placeholder)
      // We navigate to SelectRide with scheduled info so the full booking flow runs
      navigate("/passenger/select-ride", {
        state: {
          pickup: form.pickup,
          dropoff: form.dropoff,
          scheduledAt: form.scheduledAt,
          maxSeats: Number(form.maxSeats),
          mode: "SCHEDULED",
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Create a Shared Ride</h3>

        <div className="space-y-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pickup location</label>
          <input
            type="text"
            value={form.pickup}
            onChange={(e) => handleChange("pickup", e.target.value)}
            placeholder="e.g. DHA Phase 6, Karachi"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Dropoff location</label>
          <input
            type="text"
            value={form.dropoff}
            onChange={(e) => handleChange("dropoff", e.target.value)}
            placeholder="e.g. Saddar, Karachi"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Departure</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              min={minDatetimeValue()}
              onChange={(e) => handleChange("scheduledAt", e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Max seats</label>
            <select
              value={form.maxSeats}
              onChange={(e) => handleChange("maxSeats", Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
        You will confirm the route and fare on the next screen. The ride will be posted so others can join before departure.
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-xl font-semibold bg-townwize-primary text-white disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? "Creating…" : <><FaPlus className="text-xs" /> Continue to Booking</>}
      </button>
    </form>
  );
};

const SearchTab = () => {
  const [form, setForm] = useState({
    pickupText: "", dropoffText: "", scheduledAt: "",
  });
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (form.pickupText.trim()) params.pickupText = form.pickupText.trim();
      if (form.dropoffText.trim()) params.dropoffText = form.dropoffText.trim();
      if (form.scheduledAt) params.scheduledAt = new Date(form.scheduledAt).toISOString();
      const res = await api.get("/rides/shared/available", { params });
      setResults(res?.data?.data?.rides || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (rideId) => {
    setJoining(rideId);
    try {
      await api.post(`/rides/${rideId}/join`);
      toast.success("You have joined the shared ride!");
      setResults((prev) => prev.filter((r) => r.rideId !== rideId));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not join ride.");
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Search Available Rides</h3>

        <div className="space-y-2">
          <input
            type="text"
            value={form.pickupText}
            onChange={(e) => setForm((f) => ({ ...f, pickupText: e.target.value }))}
            placeholder="Pickup area (e.g. DHA)"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
          />
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={form.dropoffText}
            onChange={(e) => setForm((f) => ({ ...f, dropoffText: e.target.value }))}
            placeholder="Dropoff area (e.g. Saddar)"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
          />
        </div>

        <div className="space-y-2">
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
          />
          <p className="text-[10px] text-gray-400">Searches ±90 minutes around your selected time</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold bg-townwize-primary text-white disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? "Searching…" : <><FaSearch className="text-xs" /> Search Rides</>}
        </button>
      </form>

      {searched && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No matching rides found. Try creating one!
            </div>
          ) : (
            results.map((ride) => (
              <RideCard key={ride.rideId} ride={ride} onJoin={handleJoin} joining={joining} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const MyTab = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/rides/my", { params: { limit: 20 } })
      .then((res) => {
        const all = res?.data?.data?.items || [];
        setRides(all.filter((r) => r.status === "SCHEDULED"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div key={n} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
        No scheduled rides. Create or join one above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rides.map((ride) => <MyRideCard key={ride._id} ride={ride} />)}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const ScheduledRides = () => {
  const [tab, setTab] = useState("search");

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-townwize-primary dark:text-white">
          Scheduled Rides
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Plan ahead — create or join a shared RideTogether at a future date and time.
        </p>
      </div>

      <TabBar tab={tab} setTab={setTab} />

      {tab === "create" && <CreateTab />}
      {tab === "search" && <SearchTab />}
      {tab === "my"     && <MyTab />}
    </div>
  );
};

export default ScheduledRides;
