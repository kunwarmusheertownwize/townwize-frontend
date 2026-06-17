// townwize-frontend/src/pages/passenger/Booking/Booking.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../services/api";
import { useRideSocket } from "../../../hooks/useRideSocket";

const DRIVER_SEARCH_TIMEOUT_SEC = 30;
const DEFAULT_POOL_WINDOW_SEC = 180; // 3 min — overridden by backend response

const Booking = () => {
  const hasRequestedRef = useRef(false);
  const navigate = useNavigate();
  const { state } = useLocation();

  const isRideTogether = state?.rideType === "RideTogether";

  const [rideId, setRideId] = useState(null);
  const [primaryRideId, setPrimaryRideId] = useState(null); // set when pool_matched
  const [pooling, setPooling] = useState(false);
  const [poolMatched, setPoolMatched] = useState(false);
  const [poolWindowSec, setPoolWindowSec] = useState(DEFAULT_POOL_WINDOW_SEC);
  const [poolCountdown, setPoolCountdown] = useState(DEFAULT_POOL_WINDOW_SEC);
  const [poolTimedOut, setPoolTimedOut] = useState(false);
  const [dispatchingSolo, setDispatchingSolo] = useState(false);
  const [driverSearchSec, setDriverSearchSec] = useState(DRIVER_SEARCH_TIMEOUT_SEC);
  const [driverTimedOut, setDriverTimedOut] = useState(false);
  const payloadRef = useRef(null);

  const activeRideId = primaryRideId || rideId;

  // ❌ Guard: redirect if route data missing
  useEffect(() => {
    if (
      !state?.pickupCoords ||
      !state?.dropoffCoords ||
      typeof state?.distanceKm !== "number" ||
      typeof state?.fare !== "number" ||
      typeof state?.etaMinutes !== "number"
    ) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  // Build payload once
  if (
    !payloadRef.current &&
    state?.pickupCoords?.lat != null &&
    state?.dropoffCoords?.lat != null
  ) {
    payloadRef.current = {
      pickup: state.pickup,
      dropoff: state.dropoff,
      pickupCoords: { lat: state.pickupCoords.lat, lng: state.pickupCoords.lng },
      dropoffCoords: { lat: state.dropoffCoords.lat, lng: state.dropoffCoords.lng },
      rideType: state.rideType,
      carType: state.carType || state.vehicleClass || "economy",
      fareEstimate: state.fare,
      distanceKm: state.distanceKm,
      etaMinutes: state.etaMinutes,
    };
  }

  // POST /rides once
  useEffect(() => {
    if (!payloadRef.current || rideId || hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    api.post("/rides", payloadRef.current)
      .then((res) => {
        const data = res?.data?.data;
        if (!data?.rideId) return;

        setRideId(data.rideId);

        if (data.pooling && !data.matched) {
          // Sitting in POOLING — start countdown
          const windowSec = (data.matchWindowMinutes || 3) * 60;
          setPoolWindowSec(windowSec);
          setPoolCountdown(windowSec);
          setPooling(true);
        } else if (data.pooling && data.matched) {
          // Already matched before the response came back (rare but possible)
          setPrimaryRideId(data.primaryRideId);
          setPoolMatched(true);
          setPooling(false);
        }
        // If !pooling → normal private ride, just wait for driver
      })
      .catch(() => {});
  }, [rideId]);

  // ── Pool countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!pooling || poolTimedOut || poolMatched) return;
    if (poolCountdown <= 0) {
      setPoolTimedOut(true);
      return;
    }
    const t = setTimeout(() => setPoolCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [pooling, poolCountdown, poolTimedOut, poolMatched]);

  // ── Driver search countdown (private ride or after solo dispatch) ──────
  useEffect(() => {
    if (pooling && !dispatchingSolo) return; // not in driver search phase
    if (!activeRideId || driverTimedOut) return;
    if (driverSearchSec <= 0) {
      setDriverTimedOut(true);
      return;
    }
    const t = setTimeout(() => setDriverSearchSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [activeRideId, driverSearchSec, driverTimedOut, pooling, dispatchingSolo]);

  const goToTracking = useCallback((rId) => {
    navigate("/passenger/live-tracking", {
      replace: true,
      state: {
        rideId: rId,
        pickup: state.pickup,
        dropoff: state.dropoff,
        pickupCoords: state.pickupCoords,
        dropoffCoords: state.dropoffCoords,
        fare: state.fare,
        distanceKm: state.distanceKm,
        etaMinutes: state.etaMinutes,
      },
    });
  }, [navigate, state]);

  // Socket
  useRideSocket({
    joinRideId: activeRideId,
    onRideAccepted: () => goToTracking(activeRideId),
    onRideUpdated: (payload) => {
      if (payload?.status === "DRIVER_ASSIGNED") goToTracking(activeRideId);
    },
    onPoolMatched: (payload) => {
      if (payload?.rideId) {
        setPrimaryRideId(payload.rideId);
        setPoolMatched(true);
        setPooling(false);
      }
    },
  });

  const handleDispatchSolo = async () => {
    if (!rideId) return;
    setDispatchingSolo(true);
    setDriverSearchSec(DRIVER_SEARCH_TIMEOUT_SEC);
    try {
      await api.post(`/rides/${rideId}/pool-dispatch`);
    } catch {
      // ride may have already been dispatched or expired — cancel gracefully
      navigate("/", { replace: true });
    }
  };

  const handleCancel = () => navigate("/", { replace: true });

  const fmtCountdown = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // ── Pool match found: now waiting for a Wizer ──
  if (poolMatched) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 px-4 text-center">
        <div className="text-5xl">🤝</div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Match found!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          You've been grouped with another Towner on the same route. Finding your Wizer now.
        </p>
        <div className="w-20 h-20 border-4 border-townwize-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Fare is split — you pay less.</p>
        <button onClick={handleCancel} className="text-sm text-gray-400 hover:text-townwize-danger hover:underline">
          Cancel
        </button>
      </div>
    );
  }

  // ── Pool timed out: no match found ──
  if (poolTimedOut && !dispatchingSolo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-5 px-4 text-center">
        <div className="text-5xl">🕐</div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">No match found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          No other Towners were heading your way right now. You can proceed with a private Wizer at the RideTogether fare.
        </p>
        <button
          onClick={handleDispatchSolo}
          className="w-full max-w-xs rounded-2xl bg-townwize-primary py-3 font-semibold text-white"
        >
          Proceed Solo (same fare)
        </button>
        <button onClick={handleCancel} className="text-sm text-gray-400 hover:text-townwize-danger hover:underline">
          Cancel ride
        </button>
      </div>
    );
  }

  // ── Driver timed out ──
  if (driverTimedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4 text-center px-4">
        <div className="text-4xl">⏱</div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          No drivers available right now
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          We could not find a Wizer nearby. Please try again in a few minutes.
        </p>
        <button
          onClick={handleCancel}
          className="mt-4 w-full max-w-xs rounded-2xl bg-townwize-primary py-3 font-semibold text-white"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // ── Pooling: looking for a match ──
  if (pooling) {
    const progress = ((poolWindowSec - poolCountdown) / poolWindowSec) * 100;
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 px-4 text-center">
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 border-4 border-townwize-accent border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-townwize-primary dark:text-white">
              {fmtCountdown(poolCountdown)}
            </span>
          </div>
        </div>
        <h2 className="font-semibold text-xl text-gray-800 dark:text-white">
          Looking for a match…
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Checking for other Towners heading your way. If we find one, you'll split the fare automatically.
        </p>
        <div className="w-full max-w-xs">
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-townwize-accent transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="text-sm text-gray-400 hover:text-townwize-danger hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Normal driver search (private ride or after solo dispatch) ──
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 px-4">
      <div className="w-20 h-20 border-4 border-townwize-accent border-t-transparent rounded-full animate-spin" />
      <h2 className="font-semibold text-xl text-gray-800 dark:text-white">
        {dispatchingSolo ? "Finding your Wizer…" : "Searching for a driver…"}
      </h2>

      {activeRideId && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-28 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-townwize-accent transition-all duration-1000"
              style={{ width: `${((DRIVER_SEARCH_TIMEOUT_SEC - driverSearchSec) / DRIVER_SEARCH_TIMEOUT_SEC) * 100}%` }}
            />
          </div>
          <span>{driverSearchSec}s</span>
        </div>
      )}

      <button
        onClick={handleCancel}
        className="text-sm text-gray-400 hover:text-townwize-danger hover:underline transition"
      >
        Cancel search
      </button>
    </div>
  );
};

export default Booking;
