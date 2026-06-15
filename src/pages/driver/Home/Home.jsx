import { useState } from "react";
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

const DriverHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { driverMode, setDriverMode, driverEligibility } = useDriverMode();

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
        await new Promise((resolve) => socket.once("connect", resolve));
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

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200 dark:bg-townwize-primaryDark">
      {/* Status dot + label */}
      <div className="mb-6 flex items-center justify-center gap-2">
        <span
          className={`inline-block h-3 w-3 rounded-full ${
            isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span
          className={`text-sm font-semibold ${
            isOnline ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
        Driver Status
      </h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        {isOnline
          ? "You are online. Waiting for ride requests."
          : "Go online to start receiving ride requests"}
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
        ) : isOnline ? (
          "Go Offline"
        ) : (
          "Go Online"
        )}
      </button>

      {!isOnline && !loading && (
        <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
          Make sure your location services are enabled
        </p>
      )}
    </div>
  );
};

export default DriverHome;
