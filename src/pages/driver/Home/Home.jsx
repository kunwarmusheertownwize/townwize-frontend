import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDriverMode } from "../../../contexts/useDriverMode";
import { DRIVER_MODES } from "../../../contexts/driverModes";
import api from "../../../services/api";
import { getSocket } from "../../../hooks/useRideSocket";

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => reject(new Error("Please allow location access to go online.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  });

const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v8H4z"
    />
  </svg>
);

const fmt = (n) => Number(n || 0).toLocaleString();

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WeeklyChart({ breakdown }) {
  const today = new Date();
  const slots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const entry = (breakdown || []).find((b) => b.date === key);
    return { label: DAYS[d.getDay()], date: key, total: entry?.total ?? 0, trips: entry?.trips ?? 0 };
  });
  const max = Math.max(...slots.map((s) => s.total), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {slots.map((s, i) => {
        const isToday = i === 6;
        const pct = Math.max(4, Math.round((s.total / max) * 100));
        return (
          // h-full + a flex-1 track: a percentage height needs a parent with a
          // DEFINITE height to resolve against. This column had none, so every
          // bar computed to zero and this chart has always been blank.
          <div key={s.date} className="flex-1 h-full flex flex-col items-center gap-1">
            <div className="w-full flex-1 flex items-end">
              <div className="w-full rounded-t-sm" style={{ height: `${pct}%`, background: isToday ? "#17BEBB" : "#d1fae5" }} title={`${s.label}: ${fmt(s.total)} PKR (${s.trips} trips)`} />
            </div>
            <span className={`text-[9px] font-semibold ${isToday ? "text-townwize-accent" : "text-gray-400"}`}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Returns a human-readable blocked reason for the "Go Online" blocked state
function getBlockedDetails(driverEligibility) {
  const {
    registrationComplete,
    documentsSubmitted,
    verificationStatus,
    conditionStatus,
    hasMTag,
    blockedReason,
  } = driverEligibility || {};

  if (!registrationComplete) {
    return { icon: "📋", title: "Registration incomplete", body: "Complete your driver profile before going online." };
  }
  if (!documentsSubmitted) {
    return { icon: "📄", title: "Documents missing", body: "Upload all required documents to get verified." };
  }
  if (verificationStatus === "REJECTED") {
    return { icon: "❌", title: "Verification rejected", body: blockedReason || "One or more documents were rejected. Please re-upload or contact support." };
  }
  if (verificationStatus === "PENDING" || verificationStatus === "UNDER_REVIEW") {
    return { icon: "⏳", title: "Under review", body: "Your documents are being reviewed. You will be notified once approved." };
  }
  if (conditionStatus && conditionStatus !== "pass") {
    return {
      icon: "🚗",
      title: "Vehicle condition check pending",
      body: conditionStatus === "needs_recheck"
        ? "Your vehicle condition photos need re-inspection."
        : "Complete the vehicle condition inspection to go online.",
    };
  }
  if (hasMTag !== true) {
    // Deliberately does not claim M-9 rejects untagged vehicles — cash lanes
    // exist and Wizers know it. This is a Townwize requirement, so say so.
    return {
      icon: "🏷️",
      title: "M-Tag not verified",
      body: blockedReason || "Townwize requires a verified M-Tag before you can go online. Add a photo of the M-Tag on your windscreen from your profile.",
    };
  }
  return null;
}

const DriverHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const { driverMode, setDriverMode, driverEligibility } = useDriverMode();

  useEffect(() => {
    let mounted = true;
    api.get("/driver/earnings")
      .then((res) => { if (mounted) setEarnings(res?.data?.data || null); })
      .catch(() => {})
      .finally(() => { if (mounted) setEarningsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleToggle = async () => {
    if (loading) return;

    if (driverMode !== DRIVER_MODES.OFFLINE) {
      setLoading(true);
      const socket = getSocket();
      if (socket?.connected) {
        try {
          await api.post(
            "/driver/offline",
            {},
            { headers: { "x-socket-id": socket.id } }
          );
        } catch {
          // keep local mode fallback even if offline API fails transiently
        }
      }
      setDriverMode(DRIVER_MODES.OFFLINE);
      setLoading(false);
      navigate("/driver/home", { replace: true });
      return;
    }

    const { registrationComplete, documentsSubmitted, verificationStatus, blockedReason } =
      driverEligibility;

    if (!registrationComplete) {
      toast.error("Complete your registration before going online.");
      return;
    }
    if (!documentsSubmitted) {
      toast.error("Submit all required documents before going online.");
      return;
    }
    if (verificationStatus !== "APPROVED") {
      toast.error(
        verificationStatus === "REJECTED"
          ? blockedReason || "Verification failed. Contact support."
          : "Your documents are under review. Please wait for approval."
      );
      return;
    }

    setLoading(true);
    try {
      const socket = getSocket();
      if (!socket.connected) {
        socket.connect();
        // This used to be a bare `once("connect", resolve)` with no timeout and
        // no error path. When the server rejected the socket's origin, the
        // promise simply never settled: the button spun "Connecting…" forever
        // and said nothing. A Wizer had no way to tell that from a slow network.
        await new Promise((resolve, reject) => {
          const done = (err) => {
            clearTimeout(timer);
            socket.off("connect", ok);
            socket.off("connect_error", fail);
            err ? reject(err) : resolve();
          };
          const ok = () => done();
          const fail = (err) =>
            done(new Error(err?.message || "Could not reach the server"));
          const timer = setTimeout(
            () => done(new Error("Connection timed out. Check your internet and try again.")),
            15000
          );
          socket.once("connect", ok);
          socket.once("connect_error", fail);
        });
      }

      const coords = await getCurrentPosition();

      await api.post("/driver/online", coords, {
        headers: { "x-socket-id": socket.id },
      });

      setDriverMode(DRIVER_MODES.ONLINE_IDLE);
      navigate("/driver/trip-requests", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Could not go online. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isOnline = driverMode !== DRIVER_MODES.OFFLINE;

  const todayKey = new Date().toISOString().slice(0, 10);
  const tripsToday = earnings?.breakdown?.find((d) => d.date === todayKey)?.trips ?? 0;

  // Determine if the driver is blocked from going online (and why)
  const isApproved = driverEligibility?.verificationStatus === "APPROVED";
  const blockedDetails = !isOnline && !isApproved ? getBlockedDetails(driverEligibility) : null;

  return (
    <div className="mx-auto mt-6 max-w-md space-y-4">
      {/* Today's earnings card */}
      <div className="rounded-2xl bg-townwize-primary dark:bg-townwize-primaryDark p-5 text-white shadow-lg">
        {earningsLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 w-24 rounded bg-white/20" />
            <div className="h-8 w-36 rounded bg-white/20" />
            <div className="h-3 w-48 rounded bg-white/20 mt-3" />
          </div>
        ) : (
          <>
            <p className="text-xs text-white/60 uppercase tracking-widest">Today&apos;s Earnings</p>
            <p className="text-4xl font-extrabold mt-1">{fmt(earnings?.today)} <span className="text-lg font-semibold text-white/60">PKR</span></p>
            <div className="flex gap-5 mt-3 border-t border-white/10 pt-3">
              <div>
                <p className="text-[10px] text-white/50">This week</p>
                <p className="text-sm font-bold">{fmt(earnings?.week)} PKR</p>
              </div>
              <div>
                <p className="text-[10px] text-white/50">This month</p>
                <p className="text-sm font-bold">{fmt(earnings?.month)} PKR</p>
              </div>
              <div>
                <p className="text-[10px] text-white/50">Trips today</p>
                <p className="text-sm font-bold">{tripsToday}</p>
              </div>
              <div className="ms-auto">
                {/* "Balance" beside a negative number is ambiguous — a driver
                    cannot tell whether they owe it or are owed it. The Earnings
                    screen already calls the same figure "Commission owed"; this
                    now agrees with it. */}
                <p className="text-[10px] text-white/50">
                  {Number(earnings?.balance) < 0 ? "Commission owed" : "Balance"}
                </p>
                <p className={`text-sm font-bold ${Number(earnings?.balance) < 0 ? "text-red-300" : "text-townwize-accent"}`}>{fmt(earnings?.balance)} PKR</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 7-day chart */}
      <div className="rounded-2xl bg-white dark:bg-townwize-primaryDark p-4 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Last 7 days</p>
        {earningsLoading ? (
          <div className="h-20 flex items-end gap-1.5 animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-gray-100 dark:bg-gray-700" style={{ height: `${30 + Math.random() * 60}%` }} />
            ))}
          </div>
        ) : (
          <WeeklyChart breakdown={earnings?.breakdown} />
        )}
      </div>

      {/* Blocked state detail banner */}
      {blockedDetails && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {blockedDetails.icon} {blockedDetails.title}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">{blockedDetails.body}</p>
        </div>
      )}

      {/* Online/Offline toggle.
          The status dot and word used to repeat here, roughly a screen below
          the identical indicator in the layout header — the same fact stated
          twice, which reads as an oversight rather than emphasis. The header
          owns the status; this card owns the action. */}
      <div className="rounded-2xl bg-white dark:bg-townwize-primaryDark p-6 text-center shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">

        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {isOnline ? "You are online. Waiting for ride requests." : "Go online to start receiving ride requests"}
        </p>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={[
            "relative w-full rounded-2xl py-4 text-lg font-semibold transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            loading ? "cursor-not-allowed opacity-70" : "active:scale-[0.98]",
            isOnline
              ? "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400 shadow-md"
              : "bg-townwize-accent text-townwize-primary hover:brightness-110 focus-visible:ring-townwize-accent shadow-lg shadow-townwize-accent/30",
          ].join(" ")}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner />
              {isOnline ? "Going offline…" : "Connecting…"}
            </span>
          ) : isOnline ? "Go Offline" : "Go Online"}
        </button>

        {!isOnline && !loading && (
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">Make sure your location services are enabled</p>
        )}
      </div>
    </div>
  );
};

export default DriverHome;
