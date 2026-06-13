// townwize-frontend/src/pages/passenger/Booking/Booking.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../services/api";
import { useRideSocket } from "../../../hooks/useRideSocket";


const Booking = () => {
  const hasRequestedRef = useRef(false);

  const navigate = useNavigate();
  const { state } = useLocation();
  console.log("BOOKING STATE =", state);

  const [rideId, setRideId] = useState(null);
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

    hasRequestedRef.current = true; // 🔒 PREVENT DOUBLE POST

    api.post("/rides", payloadRef.current)
      .then((res) => {
        const data = res?.data?.data;
        if (data?.rideId) {
          setRideId(data.rideId);
        }
      })
      .catch(() => { });
  }, [rideId]);


  // ✅ Socket transition
  useRideSocket(rideId, (payload) => {
    if (payload.status === "DRIVER_ASSIGNED") {
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
  });


  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
      <div className="w-20 h-20 border-4 border-townwize-accent border-t-transparent rounded-full animate-spin" />
      <h2 className="font-semibold text-xl">Searching for a driver…</h2>
    </div>
  );
};

export default Booking;
