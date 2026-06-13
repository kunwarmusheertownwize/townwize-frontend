import { useNavigate } from "react-router-dom";
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

const DriverHome = () => {
  const navigate = useNavigate();
  const { driverMode, setDriverMode, driverEligibility } = useDriverMode();

  const handleToggle = async () => {
    if (driverMode !== DRIVER_MODES.OFFLINE) {
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
      navigate("/driver/home", { replace: true });
      return;
    }

    const { registrationComplete, documentsSubmitted, verificationStatus, blockedReason } = driverEligibility;

    if (!registrationComplete) {
      alert("Complete your registration before going online.");
      return;
    }
    if (!documentsSubmitted) {
      alert("Submit all required documents before going online.");
      return;
    }
    if (verificationStatus !== "APPROVED") {
      alert(
        verificationStatus === "REJECTED"
          ? blockedReason || "Verification failed. Contact support."
          : "Your documents are under review. Please wait for approval."
      );
      return;
    }

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      await new Promise((resolve) => socket.once("connect", resolve));
    }

    let coords;
    try {
      coords = await getCurrentPosition();
    } catch (err) {
      alert(err?.message || "Please allow location access to go online.");
      return;
    }

    await api.post(
      "/driver/online",
      coords,
      {
        headers: {
          "x-socket-id": socket.id,
        },
      }
    );

    setDriverMode(DRIVER_MODES.ONLINE_IDLE);
    navigate("/driver/trip-requests", { replace: true });
  };

  const isOnline = driverMode !== DRIVER_MODES.OFFLINE;

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200 dark:bg-townwize-primaryDark">
      <h1 className="mb-2 text-2xl font-bold">Driver Status</h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">Go online to start receiving ride requests</p>

      <div className="mx-auto mb-6 max-w-md rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Mode</span>
          <span className={`font-semibold ${isOnline ? "text-green-700" : "text-gray-700"}`}>{isOnline ? "Online" : "Offline"}</span>
        </div>
      </div>

      <button
        onClick={handleToggle}
        className={`w-full rounded-2xl py-4 text-lg font-semibold transition-all duration-300 ${
          isOnline ? "bg-townwize-primary text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        }`}
      >
        {isOnline ? "Go Offline" : "Go Online"}
      </button>

      {isOnline ? <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Waiting for ride requests...</p> : null}

      <p className="mt-8 text-xs text-gray-400">Make sure your location services are enabled</p>
    </div>
  );
};

export default DriverHome;
