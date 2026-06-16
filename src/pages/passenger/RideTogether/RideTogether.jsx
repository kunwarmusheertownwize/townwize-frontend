import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaCalendarAlt, FaClock, FaCrosshairs, FaUserFriends, FaSearch, FaPlus,
} from "react-icons/fa";
import {
    Popover, Listbox, ListboxButton, ListboxOptions, ListboxOption,
} from "@headlessui/react";
import {
    addMonths, subMonths, format, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, addDays, isSameDay, isBefore,
} from "date-fns";
import { toast } from "react-toastify";
import { searchSharedRides, createSharedRide, joinSharedRide, dispatchSharedRide } from "../../../services/api";

// ── Helpers ────────────────────────────────────────────────────────────────

const toMoney = (n) => `${Number(n || 0).toLocaleString()} PKR`;

const fmtScheduled = (iso) =>
    iso
        ? new Date(iso).toLocaleString("en-PK", {
              weekday: "short", month: "short", day: "numeric",
              hour: "numeric", minute: "2-digit",
          })
        : "—";

const buildScheduledAt = (date, timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
};

// ── Sub-components ─────────────────────────────────────────────────────────

function CalendarPicker({ date, onChange }) {
    const [month, setMonth] = useState(new Date());
    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(month));
        const end = endOfWeek(endOfMonth(month));
        const arr = [];
        let d = start;
        while (d <= end) { arr.push(d); d = addDays(d, 1); }
        return arr;
    }, [month]);

    return (
        <div className="p-3 w-72">
            <div className="flex justify-between items-center mb-2">
                <button type="button" onClick={() => setMonth(subMonths(month, 1))} className="px-2 text-lg text-gray-600 dark:text-gray-300">‹</button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{format(month, "MMMM yyyy")}</span>
                <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="px-2 text-lg text-gray-600 dark:text-gray-300">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                    <div key={d} className="text-[10px] font-medium text-gray-400">{d}</div>
                ))}
                {days.map((day, i) => {
                    const disabled = isBefore(day, new Date().setHours(0,0,0,0));
                    const selected = isSameDay(day, date);
                    return (
                        <button
                            key={i} type="button" disabled={disabled}
                            onClick={() => onChange(day)}
                            className={`w-9 h-9 rounded-full text-sm flex items-center justify-center transition
                                ${disabled ? "text-gray-300 cursor-not-allowed" :
                                  selected ? "bg-townwize-primary text-white" :
                                  "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"}`}
                        >
                            {format(day, "d")}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function TimeSelect({ value, onChange }) {
    const slots = useMemo(() => {
        const arr = [];
        const now = new Date();
        const start = new Date(now);
        const add = (15 - (now.getMinutes() % 15)) % 15 || 15;
        start.setMinutes(now.getMinutes() + add, 0, 0);
        for (let i = 0; i < 48; i++) {
            const t = new Date(start.getTime() + i * 15 * 60 * 1000);
            arr.push({
                value: t.toTimeString().slice(0, 5),
                label: t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            });
        }
        return arr;
    }, []);

    return (
        <Listbox value={value} onChange={onChange}>
            <div className="relative">
                <ListboxButton className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 w-full text-sm text-gray-800 dark:text-gray-100">
                    <FaClock className="text-gray-400 shrink-0" />
                    {slots.find((s) => s.value === value)?.label || "Select time"}
                </ListboxButton>
                <ListboxOptions className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 text-sm focus:outline-none">
                    {slots.map((s) => (
                        <ListboxOption key={s.value} value={s.value}
                            className={({ active }) =>
                                `cursor-pointer py-2.5 px-4 ${active ? "bg-gray-50 dark:bg-gray-700" : ""}`}>
                            {s.label}
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </div>
        </Listbox>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────

const RideTogether = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState("find"); // "find" | "offer"

    // Shared form state
    const [pickup, setPickup]   = useState("");
    const [dropoff, setDropoff] = useState("");
    const [date, setDate]       = useState(new Date());
    const [time, setTime]       = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30, 0, 0);
        return now.toTimeString().slice(0, 5);
    });
    const [seats, setSeats]   = useState(2);

    // Offer-specific
    const [fareEstimate, setFareEstimate] = useState("");
    const [distanceKm, setDistanceKm]     = useState("");
    const [etaMinutes, setEtaMinutes]     = useState("");

    // State
    const [searching, setSearching]   = useState(false);
    const [results, setResults]       = useState(null); // null = not searched yet
    const [submitting, setSubmitting] = useState(false);
    const [offered, setOffered]       = useState(null); // { rideId, farePerSeat, scheduledAt }
    const [joining, setJoining]       = useState(null); // rideId being joined
    const [dispatching, setDispatching] = useState(false);

    const useMyLocation = useCallback(() => {
        if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setPickup(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            },
            () => toast.error("Could not get location")
        );
    }, []);

    // ── Find a Ride ─────────────────────────────────────────────────────────

    const handleSearch = async () => {
        if (!pickup.trim() || !dropoff.trim()) { toast.error("Enter pickup and dropoff"); return; }
        setSearching(true);
        setResults(null);
        try {
            const scheduledAt = buildScheduledAt(date, time);
            const res = await searchSharedRides({ pickupText: pickup, dropoffText: dropoff, scheduledAt, seats });
            setResults(res?.data?.data?.rides || []);
        } catch (e) {
            toast.error(e?.response?.data?.error?.message || "Search failed");
        } finally {
            setSearching(false);
        }
    };

    const handleJoin = async (rideId) => {
        setJoining(rideId);
        try {
            const res = await joinSharedRide(rideId);
            const data = res?.data?.data;
            toast.success(`Joined! Your fare: ${toMoney(data?.farePerSeat)}`);
            if (data?.isDispatched) {
                navigate(`/passenger/live-tracking/${rideId}`);
            } else {
                // Ride still waiting for more passengers or creator dispatch
                navigate(`/passenger/trips`);
            }
        } catch (e) {
            toast.error(e?.response?.data?.error?.message || "Could not join ride");
        } finally {
            setJoining(null);
        }
    };

    // ── Offer a Ride ────────────────────────────────────────────────────────

    const handleOffer = async () => {
        if (!pickup.trim() || !dropoff.trim()) { toast.error("Enter pickup and dropoff"); return; }
        if (!fareEstimate || !distanceKm || !etaMinutes) { toast.error("Enter fare, distance and ETA"); return; }

        setSubmitting(true);
        try {
            const scheduledAt = buildScheduledAt(date, time);
            // Use pickup text as address; lat/lng from geolocation if available
            let pickupCoords = { lat: 0, lng: 0 };
            let dropoffCoords = { lat: 0, lng: 0 };

            // Try to parse lat,lng from text (if user used "use my location")
            const latLngRe = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
            const pMatch = pickup.match(latLngRe);
            const dMatch = dropoff.match(latLngRe);
            if (pMatch) { pickupCoords = { lat: parseFloat(pMatch[1]), lng: parseFloat(pMatch[2]) }; }
            if (dMatch) { dropoffCoords = { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) }; }
            // Fallback: use 0,0 if no coords — backend stores address for search
            if (!pickupCoords.lat) pickupCoords = { lat: 0.0001, lng: 0.0001 };
            if (!dropoffCoords.lat) dropoffCoords = { lat: 0.0002, lng: 0.0002 };

            const res = await createSharedRide({
                pickup: pickup.trim(),
                dropoff: dropoff.trim(),
                pickupCoords,
                dropoffCoords,
                carType: "economy",
                fareEstimate: Number(fareEstimate),
                distanceKm: Number(distanceKm),
                etaMinutes: Number(etaMinutes),
                scheduledAt,
                maxSeats: seats,
            });
            const data = res?.data?.data;
            setOffered({
                rideId: data.rideId,
                farePerSeat: data.farePerSeat,
                scheduledAt: data.scheduledAt,
                maxSeats: data.maxSeats,
            });
            toast.success("Shared ride posted!");
        } catch (e) {
            toast.error(e?.response?.data?.error?.message || "Could not create ride");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDispatch = async () => {
        if (!offered?.rideId) return;
        setDispatching(true);
        try {
            await dispatchSharedRide(offered.rideId);
            toast.success("Ride dispatched! Finding your Wizer…");
            navigate(`/passenger/live-tracking/${offered.rideId}`);
        } catch (e) {
            toast.error(e?.response?.data?.error?.message || "Could not dispatch ride");
        } finally {
            setDispatching(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
            <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-extrabold text-townwize-primary dark:text-white">RideTogether</h1>
                    <p className="text-sm text-gray-500 mt-1">Share a ride, split the fare</p>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-xl bg-gray-200 dark:bg-gray-700 p-1 gap-1">
                    {[["find","Find a Ride"], ["offer","Offer a Ride"]].map(([m, label]) => (
                        <button
                            key={m} type="button"
                            onClick={() => { setMode(m); setResults(null); setOffered(null); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                                mode === m
                                    ? "bg-white dark:bg-gray-800 text-townwize-primary shadow-sm"
                                    : "text-gray-500 dark:text-gray-300"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Form card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">

                    {/* Pickup */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-townwize-primary" />
                        <input
                            type="text" value={pickup} onChange={(e) => setPickup(e.target.value)}
                            placeholder="Pickup location"
                            className="w-full pl-8 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-townwize-primary"
                        />
                        <button type="button" onClick={useMyLocation}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-townwize-primary"
                            title="Use current location">
                            <FaCrosshairs />
                        </button>
                    </div>

                    {/* Dropoff */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-townwize-accent rounded-sm" />
                        <input
                            type="text" value={dropoff} onChange={(e) => setDropoff(e.target.value)}
                            placeholder="Dropoff location"
                            className="w-full pl-8 pr-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-townwize-primary"
                        />
                    </div>

                    {/* Date + Time + Seats */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Date */}
                        <Popover className="relative col-span-1">
                            <Popover.Button className="flex items-center gap-2 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 w-full text-sm text-gray-800 dark:text-gray-100">
                                <FaCalendarAlt className="text-gray-400 shrink-0" />
                                <span className="truncate">{format(date, "MMM d")}</span>
                            </Popover.Button>
                            <Popover.Panel className="absolute z-20 mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                                <CalendarPicker date={date} onChange={setDate} />
                            </Popover.Panel>
                        </Popover>

                        {/* Time */}
                        <div className="col-span-1">
                            <TimeSelect value={time} onChange={setTime} />
                        </div>

                        {/* Seats */}
                        <Listbox value={seats} onChange={setSeats}>
                            <div className="relative col-span-1">
                                <ListboxButton className="flex items-center gap-2 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 w-full text-sm text-gray-800 dark:text-gray-100">
                                    <FaUserFriends className="text-gray-400 shrink-0" />
                                    <span>{seats} seat{seats > 1 ? "s" : ""}</span>
                                </ListboxButton>
                                <ListboxOptions className="absolute z-20 mt-1 w-full rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 text-sm focus:outline-none">
                                    {[1,2,3,4].map((n) => (
                                        <ListboxOption key={n} value={n}
                                            className={({ active }) =>
                                                `cursor-pointer py-2.5 px-4 ${active ? "bg-gray-50 dark:bg-gray-700" : ""}`}>
                                            {n} seat{n > 1 ? "s" : ""}
                                        </ListboxOption>
                                    ))}
                                </ListboxOptions>
                            </div>
                        </Listbox>
                    </div>

                    {/* Offer-specific fields */}
                    {mode === "offer" && (
                        <div className="grid grid-cols-3 gap-3 pt-1">
                            {[
                                { label: "Fare (PKR)", value: fareEstimate, set: setFareEstimate, placeholder: "e.g. 600" },
                                { label: "Distance (km)", value: distanceKm, set: setDistanceKm, placeholder: "e.g. 8" },
                                { label: "ETA (min)", value: etaMinutes, set: setEtaMinutes, placeholder: "e.g. 15" },
                            ].map(({ label, value, set, placeholder }) => (
                                <div key={label}>
                                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                                    <input
                                        type="number" min="0" value={value}
                                        onChange={(e) => set(e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-townwize-primary"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* CTA */}
                    {mode === "find" ? (
                        <button
                            type="button" onClick={handleSearch} disabled={searching}
                            className="w-full py-3.5 rounded-xl bg-townwize-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <FaSearch /> {searching ? "Searching…" : "Search Rides"}
                        </button>
                    ) : (
                        <button
                            type="button" onClick={handleOffer} disabled={submitting || !!offered}
                            className="w-full py-3.5 rounded-xl bg-townwize-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <FaPlus /> {submitting ? "Posting…" : "Post Shared Ride"}
                        </button>
                    )}
                </div>

                {/* ── Offer confirmation ───────────────────────────────────── */}
                {mode === "offer" && offered && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-5 space-y-3">
                        <h2 className="font-bold text-green-800 dark:text-green-300">Ride Posted!</h2>
                        <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                            <p>Scheduled: <strong>{fmtScheduled(offered.scheduledAt)}</strong></p>
                            <p>Max seats: <strong>{offered.maxSeats}</strong></p>
                            <p>Fare per seat: <strong>{toMoney(offered.farePerSeat)}</strong></p>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-500">
                            Other passengers can now find and join your ride. Once ready, dispatch to find a Wizer.
                        </p>
                        <button
                            type="button" onClick={handleDispatch} disabled={dispatching}
                            className="w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold disabled:opacity-60"
                        >
                            {dispatching ? "Dispatching…" : "Dispatch Now — Find a Wizer"}
                        </button>
                    </div>
                )}

                {/* ── Search results ───────────────────────────────────────── */}
                {mode === "find" && results !== null && (
                    <div className="space-y-3">
                        <h2 className="text-base font-bold text-gray-800 dark:text-white">
                            {results.length === 0 ? "No rides found" : `${results.length} ride${results.length !== 1 ? "s" : ""} available`}
                        </h2>

                        {results.length === 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
                                <p className="text-gray-400 text-sm">No shared rides match your route and time.</p>
                                <button
                                    type="button"
                                    onClick={() => { setMode("offer"); setResults(null); }}
                                    className="mt-3 text-sm font-medium text-townwize-primary hover:underline"
                                >
                                    Offer a ride instead →
                                </button>
                            </div>
                        )}

                        {results.map((r) => (
                            <div key={r.rideId}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{r.creatorName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{fmtScheduled(r.scheduledAt)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-base font-bold text-townwize-primary dark:text-townwize-accent">
                                            {toMoney(r.farePerSeat)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">per seat</p>
                                    </div>
                                </div>

                                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    <p><span className="font-medium text-gray-700 dark:text-gray-300">From:</span> {r.pickup}</p>
                                    <p><span className="font-medium text-gray-700 dark:text-gray-300">To:</span> {r.dropoff}</p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        {r.seatsLeft} seat{r.seatsLeft !== 1 ? "s" : ""} left · {String(r.carType || "economy").toLowerCase()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleJoin(r.rideId)}
                                        disabled={joining === r.rideId}
                                        className="px-4 py-2 rounded-xl bg-townwize-primary text-white text-sm font-semibold disabled:opacity-60"
                                    >
                                        {joining === r.rideId ? "Joining…" : "Join Ride"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default RideTogether;
