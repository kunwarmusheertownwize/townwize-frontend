// townwize-frontend/src/pages/passenger/Booking/Booking.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../services/api";
import { useRideSocket } from "../../../hooks/useRideSocket";

const SEARCH_TIMEOUT_SEC = 30;

const Booking = () => {
  const hasRequestedRef = useRef(false);

  const navigate = useNavigate();
  const { state } = useLocation();

  const [rideId, setRideId] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(SEARCH_TIMEOUT_SEC);
  const [timedOut, setTimedOut] = useState(false);
  const payloadRef = useRef(null);

  // ❌ HARD STOP if route data missing
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

  // ✅ Build payload ONCE, correctly
  if (
    !payloadRef.current &&
    state?.pickupCoords?.lat != null &&
    state?.pickupCoords?.lng != null &&
    state?.dropoffCoords?.lat != null &&
    state?.dropoffCoords?.lng != null
  ) {
    payloadRef.current = {
      pickup: state.pickup,
      dropoff: state.dropoff,
      pickupCoords: {
        lat: state.pickupCoords.lat,
        lng: state.pickupCoords.lng,
      },
      dropoffCoords: {
        lat: state.dropoffCoords.lat,
        lng: state.dropoffCoords.lng,
      },
      rideType: state.rideType,
      carType: state.carType || state.vehicleClass || "economy",
      fareEstimate: state.fare,
      distanceKm: state.distanceKm,
      etaMinutes: state.etaMinutes,
    };
  }

  // ✅ POST ONLY WHEN PAYLOAD IS VALID
  useEffect(() => {
    if (!payloadRef.current || rideId || hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    api.post("/rides", payloadRef.current)
      .then((res) => {
        const data = res?.data?.data;
        if (data?.rideId) {
          setRideId(data.rideId);
        }
      })
      .catch(() => {});
  }, [rideId]);

  // ⏱ Countdown timer — starts once ride is created
  useEffect(() => {
    if (!rideId || timedOut) return;
    if (secondsLeft <= 0) {
      setTimedOut(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [rideId, secondsLeft, timedOut]);

  // ✅ Socket transition
  useRideSocket({
    joinRideId: rideId,
    onRideAccepted: () => {
      navigate("/passenger/live-tracking", {
        replace: true,
        state: {
          rideId,
          pickup: state.pickup,
          dropoff: state.dropoff,
          pickupCoords: state.pickupCoords,
          dropoffCoords: state.dropoffCoords,
          fare: state.fare,
          distanceKm: state.distanceKm,
          etaMinutes: state.etaMinutes,
        },
      });
    },
    onRideUpdated: (payload) => {
      if (payload?.status === "DRIVER_ASSIGNED") {
        navigate("/passenger/live-tracking", {
          replace: true,
          state: {
            rideId,
            pickup: state.pickup,
            dropoff: state.dropoff,
            pickupCoords: state.pickupCoords,
            dropoffCoords: state.dropoffCoords,
            fare: state.fare,
            distanceKm: state.distanceKm,
            etaMinutes: state.etaMinutes,
          },
        });
      }
    },
  });

  const handleCancel = () => navigate("/", { replace: true });

  // ── Timed out ──
  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4 text-center px-4">
        <div className="text-4xl">⏱</div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          No drivers available right now
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          We could not find a driver nearby. Please try again in a few minutes.
        </p>
        <button
          onClick={handleCancel}
          className="mt-4 w-full max-w-xs rounded-2xl bg-townwize-primary py-3 font-semibold text-white hover:bg-townwize-primaryDark transition"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // ── Searching ──
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 px-4">
      <div className="w-20 h-20 border-4 border-townwize-accent border-t-transparent rounded-full animate-spin" />
      <h2 className="font-semibold text-xl text-gray-800 dark:text-white">
        Searching for a driver…
      </h2>

      {rideId && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-28 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-townwize-accent transition-all duration-1000"
              style={{ width: `${((SEARCH_TIMEOUT_SEC - secondsLeft) / SEARCH_TIMEOUT_SEC) * 100}%` }}
            />
          </div>
          <span>{secondsLeft}s</span>
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
