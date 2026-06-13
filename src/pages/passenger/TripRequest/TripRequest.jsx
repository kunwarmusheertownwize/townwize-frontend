// townwize-frontend/src/pages/passenger/TripRequest/TripRequest.jsx

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createRide as createRideAPI } from "../../../services/api";
import { getSocket } from "../../../hooks/useRideSocket";
import { useRideSocket } from "../../../hooks/useRideSocket";

const TripRequest = () => {
  useRideSocket();

  const { state } = useLocation();
  const navigate = useNavigate();
  const hasRequestedRef = useRef(false);

  // 1️⃣ Create ride ONCE
  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    if (
      !state?.pickup ||
      !state?.dropoff ||
      !state?.pickupCoords ||
      !state?.dropoffCoords ||
      typeof state?.distanceKm !== "number" ||
      typeof state?.etaMinutes !== "number" ||
      !state?.rideType ||
      state?.fare == null
    ) {
      navigate("/passenger/home", { replace: true });
      return;
    }

    const submitRideRequest = async () => {
      try {
        const res = await createRideAPI({
          pickup: state.pickup,
          dropoff: state.dropoff,
          pickupCoords: state.pickupCoords,
          dropoffCoords: state.dropoffCoords,
          rideType: state.rideType,
          fareEstimate: state.fare,
          distanceKm: state.distanceKm,
          etaMinutes: state.etaMinutes,
        });

        const rideId = res.data.data.rideId;
        console.log("Ride created:", rideId);

        const socket = getSocket();
        if (socket) {
          socket.emit("join", `ride:${rideId}`);
          console.log("📥 Passenger joined room:", `ride:${rideId}`);
        }

      } catch (err) {
        console.error("Ride creation failed", err);
        navigate("/passenger/select-ride", { replace: true });
      }
    };

    submitRideRequest();
  }, [state, navigate]);

  // 2️⃣ Listen for driver acceptance
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onRideAccepted = (payload) => {
      console.log("🚕 Passenger received ride accepted:", payload);
      sessionStorage.setItem(
        "activePassengerRideId",
        payload.rideId
      );
      navigate(`/passenger/live-tracking/${payload.rideId}`, {
        replace: true,
      });
    };

    socket.on("ride:accepted", onRideAccepted);
    return () => socket.off("ride:accepted", onRideAccepted);
  }, [navigate]);

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white dark:bg-townwize-primaryDark rounded-2xl shadow p-8 text-center space-y-6">
      <h2 className="text-2xl font-bold text-townwize-primary dark:text-townwize-accent">
        Finding a Driver
      </h2>

      <p className="text-gray-600 dark:text-gray-300">
        We’re searching for nearby drivers. This usually takes a few seconds.
      </p>

      <div className="flex justify-center">
        <div className="w-24 h-24 border-2 border-townwize-primary border-t-transparent rounded-full animate-spin" />
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-left space-y-1 border border-gray-200 dark:border-gray-700">
        <p><strong>Pickup:</strong> {state?.pickup}</p>
        <p><strong>Dropoff:</strong> {state?.dropoff}</p>
        <p><strong>Ride Type:</strong> {state?.rideType}</p>
        <p><strong>Estimated Fare:</strong> {state?.fare} PKR</p>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="w-full py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700"
      >
        Cancel Ride
      </button>
    </div>
  );
};

export default TripRequest;