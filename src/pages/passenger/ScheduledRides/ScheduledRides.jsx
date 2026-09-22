import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaClock, FaUsers, FaSearch, FaPlus, FaArrowRight, FaCalendarAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../../services/api";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";

// ── Helpers ────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");

const formatScheduled = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Minimum time on a given date (15 min from now if today, else "00:00")
const minTimeForDate = (dateStr) => {
  if (!dateStr || dateStr !== todayStr()) return "00:00";
  const d = new Date(Date.now() + 15 * 60 * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Combine "YYYY-MM-DD" + "HH:MM" → ISO datetime-local string
const combineDateTime = (date, time) => (date && time ? `${date}T${time}` : "");

// Split ISO datetime-local string → { date, time }
const splitDateTime = (val) => val
  ? { date: val.slice(0, 10), time: val.slice(11, 16) }
  : { date: "", time: "" };

// ── Lightweight Places autocomplete input ──────────────────────────────────
const PlacesInput = ({ value, onChange, placeholder, className, allowCurrentLocation = false }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [mapsReady, setMapsReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const wrapperRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    loadGoogleMaps().then(() => setMapsReady(true)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback((input) => {
    if (!mapsReady || !input.trim()) { setSuggestions([]); return; }
    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      { input, componentRestrictions: { country: "pk" } },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions.map((p) => ({ text: p.description, placeId: p.place_id })));
        } else {
          setSuggestions([]);
        }
      }
    );
  }, [mapsReady]);

  const handleChange = (e) => {
    onChange(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(e.target.value), 400);
  };

  const handleSelect = (suggestion) => {
    onChange(suggestion.text);
    setSuggestions([]);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    if (!mapsReady) { toast.error("Maps not ready yet"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: latLng }, (results, status) => {
          setLocating(false);
          if (status === "OK" && results[0]) {
            onChange(results[0].formatted_address);
          } else {
            toast.error("Could not determine address from your location");
          }
        });
      },
      () => { setLocating(false); toast.error("Unable to get your location"); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className} ${allowCurrentLocation ? "pe-10" : ""}`}
      />
      {allowCurrentLocation && (
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={locating}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-townwize-primary hover:text-townwize-primaryDark disabled:opacity-50 transition"
          title="Use current location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${locating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /><circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
          </svg>
        </button>
      )}
      {suggestions.length > 0 && (
        <ul className="absolute z-50 start-0 end-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              onMouseDown={() => handleSelect(s)}
              className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Native-friendly date+time picker ───────────────────────────────────────
const inputCls = "w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary";

function DateTimePicker({ value, onChange, required = false }) {
  const initial = splitDateTime(value);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const minDate = todayStr();

  const handleDate = (e) => {
    const newDate = e.target.value;
    setDate(newDate);
    if (newDate && time) onChange(combineDateTime(newDate, time));
    else if (!newDate) onChange("");
  };

  const handleTime = (e) => {
    const newTime = e.target.value;
    setTime(newTime);
    if (date && newTime) onChange(combineDateTime(date, newTime));
  };

  const combined = date && time ? combineDateTime(date, time) : null;
  const preview = combined
    ? new Date(combined).toLocaleString("en-PK", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          min={minDate}
          onChange={handleDate}
          required={required}
          className={inputCls}
        />
        <input
          type="time"
          value={time}
          min={minTimeForDate(date)}
          onChange={handleTime}
          required={required && !!date}
          className={inputCls}
        />
      </div>
      {date && !time && (
        <p className="text-[11px] text-gray-400 ps-1">Now select a time →</p>
      )}
      {preview && (
        <p className="text-[11px] text-townwize-accent font-medium ps-1">{preview}</p>
      )}
    </div>
  );
}

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
      <div className="shrink-0 text-end">
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
        <span className="ms-auto font-semibold text-townwize-primary dark:text-white">
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
          <PlacesInput
            value={form.pickup}
            onChange={(v) => handleChange("pickup", v)}
            placeholder="e.g. DHA Phase 6, Karachi"
            className={inputCls}
            allowCurrentLocation
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Dropoff location</label>
          <PlacesInput
            value={form.dropoff}
            onChange={(v) => handleChange("dropoff", v)}
            placeholder="e.g. Saddar, Karachi"
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Departure date & time</label>
          <DateTimePicker
            value={form.scheduledAt}
            onChange={(v) => handleChange("scheduledAt", v)}
            required
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
          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Departure time (optional)</label>
          <DateTimePicker
            value={form.scheduledAt}
            onChange={(v) => setForm((f) => ({ ...f, scheduledAt: v }))}
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
