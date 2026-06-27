// townwize-frontend/src/pages/passenger/TripRequest/TripRequest.jsx

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { createRide as createRideAPI, updateRideStatus } from "../../../services/api";
import { isNative } from "../../../utils/platform";
import { App } from "@capacitor/app";
import { getSocket } from "../../../hooks/useRideSocket";
import { useRideSocket } from "../../../hooks/useRideSocket";

const TripRequest = () => {
  useRideSocket();

  const { state } = useLocation();
  const navigate = useNavigate();
  const hasRequestedRef = useRef(false);

  const [rideId, setRideId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [slowSearch, setSlowSearch] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlowSearch(true), 30000);
    return () => clearTimeout(t);
  }, []);

  // ── Native (Android/Capacitor) ──────────────────────────────────────────────
  // App.addListener intercepts the hardware back button at the Capacitor bridge
  // level — before the WebView ever checks canGoBack(). This is the official
  // Capacitor approach; pushState/popstate tricks are unreliable on Android WebView
  // because same-URL pushStates are not always counted by canGoBack().
  useEffect(() => {
    if (!isNative()) return;
    let handle;
    App.addListener("backButton", () => {
      setConfirmCancel(true);
    }).then((h) => {
      handle = h;
    });
    return () => {
      handle?.remove();
    };
  }, []);

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

        const id = res.data.data.rideId;
        setRideId(id);

        const socket = getSocket();
        if (socket) {
          socket.emit("join", `ride:${id}`);
        }

      } catch (err) {
        console.error("Ride creation failed", err);
        const apiMsg = err?.response?.data?.error?.message;
        sessionStorage.setItem(
          "passengerBookingError",
          apiMsg || "Could not book your ride. Please try again."
        );
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
      sessionStorage.setItem("activePassengerRideId", payload.rideId);
      navigate(`/passenger/live-tracking/${payload.rideId}`, { replace: true });
    };

    socket.on("ride:accepted", onRideAccepted);
    return () => socket.off("ride:accepted", onRideAccepted);
  }, [navigate]);

  const handleKeepWaiting = () => {
    setConfirmCancel(false);
  };

  const handleCancelRide = async () => {
    setCancelling(true);
    if (rideId) {
      try {
        await updateRideStatus(rideId, "CANCELLED");
      } catch (err) {
        console.error("Cancel failed", err);
      }
    }
    localStorage.removeItem("activePassengerRideId");
    navigate("/passenger/home", { replace: true });
  };

  // ─── Mobile (Capacitor) — full-screen branded searching screen ───────────────
  // Portal to document.body so position:fixed is viewport-relative,
  // bypassing Android WebView's overflow-y:auto fixed-positioning bug.
  if (isNative()) {
    return createPortal(
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "#03311C" }}
        className="flex flex-col"
      >
        <div
          className="flex-1 flex flex-col items-center justify-center px-6 space-y-6"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="w-20 h-20 rounded-full border-4 border-townwize-accent/30 border-t-townwize-accent animate-spin" />

          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-white">Finding your Wizer</h2>
            <p className="text-white/60 text-sm mt-2">Searching for nearby drivers…</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-4 w-full space-y-3">
            <div className="flex justify-between text-sm gap-3">
              <span className="text-white/60 shrink-0">Pickup</span>
              <span className="text-white font-medium text-right truncate">{state?.pickup}</span>
            </div>
            <div className="flex justify-between text-sm gap-3">
              <span className="text-white/60 shrink-0">Dropoff</span>
              <span className="text-white font-medium text-right truncate">{state?.dropoff}</span>
            </div>
            <div className="flex justify-between text-sm gap-3">
              <span className="text-white/60 shrink-0">Type</span>
              <span className="text-white font-medium">{state?.rideType}</span>
            </div>
            <div className="flex justify-between text-sm gap-3">
              <span className="text-white/60 shrink-0">Est. Fare</span>
              <span className="text-townwize-accent font-bold">{state?.fare} PKR</span>
            </div>
          </div>
        </div>

        <div
          className="px-6 pb-6"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        >
          {confirmCancel ? (
            <div className="space-y-2">
              <p className="text-white/70 text-sm text-center">Cancel this ride request?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleKeepWaiting}
                  disabled={cancelling}
                  className="flex-1 py-3 rounded-xl font-semibold bg-white/20 text-white disabled:opacity-60"
                >
                  Keep Waiting
                </button>
                <button
                  onClick={handleCancelRide}
                  disabled={cancelling}
                  className="flex-1 py-3 rounded-xl font-semibold bg-red-600 text-white disabled:opacity-60"
                >
                  {cancelling ? "Cancelling…" : "Yes, Cancel"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full py-3 rounded-xl font-semibold bg-white/15 text-white/80"
            >
              Cancel Request
            </button>
          )}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white dark:bg-townwize-primaryDark rounded-2xl shadow p-8 text-center space-y-6">
      <h2 className="text-2xl font-bold text-townwize-primary dark:text-townwize-accent">
        Finding a Driver
      </h2>

      <p className="text-gray-600 dark:text-gray-300">
        {slowSearch
          ? "Still searching — this is taking longer than usual. Please keep waiting or cancel and try again."
          : "We're searching for nearby drivers. This usually takes a few seconds."}
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

      {confirmCancel ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Cancel this ride request?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleKeepWaiting}
              disabled={cancelling}
              className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-60"
            >
              Keep Waiting
            </button>
            <button
              onClick={handleCancelRide}
              disabled={cancelling}
              className="flex-1 py-3 rounded-xl font-semibold bg-red-600 text-white disabled:opacity-60"
            >
              {cancelling ? "Cancelling…" : "Yes, Cancel"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmCancel(true)}
          className="w-full py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
        >
          Cancel Ride
        </button>
      )}
    </div>
  );
};

export default TripRequest;
