import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../services/api";
import { useDriverMode } from "../../../contexts/useDriverMode";
import { DRIVER_MODES } from "../../../contexts/driverModes";
import { getSocket } from "../../../hooks/useRideSocket";

const REQUEST_TIMEOUT = 15;

const TripRequests = () => {
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [timeLeft, setTimeLeft] = useState(REQUEST_TIMEOUT);
  const [searching, setSearching] = useState(false);
  const [driverEmail, setDriverEmail] = useState("");
  const { driverMode, setDriverMode, incomingRide, setIncomingRide } = useDriverMode();

  useEffect(() => {
    try {
      const auth = JSON.parse(localStorage.getItem("auth") || "{}");
      setDriverEmail(auth?.user?.email || "");
    } catch {
      setDriverEmail("");
    }
  }, []);

  useEffect(() => {
    if (!incomingRide) {
      setRequest(null);
      return;
    }
    setRequest(incomingRide);
    setTimeLeft(REQUEST_TIMEOUT);
    setSearching(false);
  }, [incomingRide]);

  useEffect(() => {
    let mounted = true;
    const hydrateFromActiveRide = async () => {
      try {
        const res = await api.get("/driver/active-ride");
        const active = res?.data?.data;
        if (!mounted || !active?.rideId) return;

        const activeStatus = String(active.status || "").toUpperCase();
        if (["DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"].includes(activeStatus)) {
          const activeTrip = {
            rideId: active.rideId,
            status: active.status,
            pickup: active?.pickup?.address || "-",
            dropoff: active?.dropoff?.address || "-",
            rideType: active?.rideType || "PRIVATE",
            fare: Number(active?.fare || 0),
            distanceKm: Number(active?.distanceKm || 0),
            etaToPickup: `${Number(active?.etaMinutes || 0)} mins`,
          };
          sessionStorage.setItem("activeDriverTrip", JSON.stringify(activeTrip));
          setIncomingRide(null);
          setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
          navigate("/driver/live-tracking", { replace: true, state: { request: activeTrip } });
        } else {
          setSearching(true);
          setDriverMode(DRIVER_MODES.ONLINE_IDLE);
        }
      } catch {
        // keep default UI state
      }
    };

    hydrateFromActiveRide();
    return () => {
      mounted = false;
    };
  }, [navigate, setDriverMode, setIncomingRide]);

  useEffect(() => {
    if (!request) return;
    if (timeLeft <= 0) {
      setRequest(null);
      setSearching(true);
      setDriverMode(DRIVER_MODES.ONLINE_IDLE);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, request, setDriverMode]);

  useEffect(() => {
    if (request) return undefined;
    if (driverMode === DRIVER_MODES.OFFLINE || driverMode === DRIVER_MODES.ACTIVE_TRIP) {
      return undefined;
    }

    let mounted = true;

    const fetchWaitingRequest = async () => {
      try {
        const res = await api.get("/driver/pending-request");
        const pending = res?.data?.data;
        if (!mounted || !pending?.rideId) return;
        setIncomingRide(pending);
        setDriverMode(DRIVER_MODES.INCOMING_REQUEST);
        setSearching(false);
      } catch {
        // Keep the waiting screen quiet. The next poll or socket event can recover.
      }
    };

    fetchWaitingRequest();
    const intervalId = window.setInterval(fetchWaitingRequest, 3000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [request, driverMode, setIncomingRide, setDriverMode]);

  const handleAccept = async () => {
    if (!request?.rideId) {
      toast.error("Invalid ride request");
      return;
    }

    try {
      await api.post(`/rides/${request.rideId}/accept`);
      const activeTrip = { ...request, status: "DRIVER_ASSIGNED" };
      sessionStorage.setItem("activeDriverTrip", JSON.stringify(activeTrip));
      setIncomingRide(null);
      setRequest(null);
      setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
      navigate("/driver/live-tracking", { replace: true, state: { request: activeTrip } });
    } catch {
      toast.error("Ride already accepted or unavailable");
      setRequest(null);
      setIncomingRide(null);
      setDriverMode(DRIVER_MODES.ONLINE_IDLE);
    }
  };

  const handleReject = async () => {
    const rideId = request?.rideId;
    setRequest(null);
    setIncomingRide(null);
    setDriverMode(DRIVER_MODES.ONLINE_IDLE);
    if (rideId) {
      await api.post(`/rides/${rideId}/reject`).catch(() => {});
    }
    toast.info("Request declined");
  };

  const handleGoOffline = () => {
    if (request) {
      toast.warning("You cannot go offline while responding to a request.");
      return;
    }

    toast(
      ({ closeToast }) => (
        <div className="text-sm">
          <p className="mb-3">Go offline? You will not receive new ride requests.</p>
          <div className="flex justify-end gap-3">
            <button onClick={closeToast} className="px-3 py-1 text-townwize-danger hover:underline">
              Cancel
            </button>
            <button
              onClick={async () => {
                closeToast();
                const socket = getSocket();
                if (socket?.connected) {
                  try {
                    await api.post(
                      "/driver/offline",
                      {},
                      { headers: { "x-socket-id": socket.id } }
                    );
                  } catch {
                    // keep local mode fallback
                  }
                }
                setDriverMode(DRIVER_MODES.OFFLINE);
                navigate("/driver/home", { replace: true });
              }}
              className="rounded bg-townwize-primary px-3 py-1 font-semibold text-white"
            >
              Go Offline
            </button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false, closeButton: false }
    );
  };

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    let latestCoords = null;
    let mounted = true;

    const sendLocation = () => {
      if (!latestCoords || !mounted) return;
      api.post("/driver/location", latestCoords).catch(() => {});
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        latestCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        sendLocation();
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );

    const intervalId = window.setInterval(sendLocation, 10000);

    return () => {
      mounted = false;
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Incoming Ride</h1>
        <p className="mt-1 text-sm text-gray-500">New trip request nearby</p>
        {driverEmail && (
          <p className="mt-1 text-xs text-gray-500">Signed in as {driverEmail}</p>
        )}

        {searching ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-townwize-primary" />
            <p className="text-sm">Searching for nearby ride requests...</p>
          </div>
        ) : !request ? (
          <>
            <div className="py-12 text-center text-gray-500">Waiting for ride requests...</div>
            <div className="mt-6 flex justify-center">
              <button onClick={handleGoOffline} className="rounded-xl bg-townwize-danger px-6 py-3 font-semibold text-white">
                Go Offline
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="font-semibold">Pickup:</span> {request.pickup}</p>
                <p><span className="font-semibold">Dropoff:</span> {request.dropoff}</p>
                <p><span className="font-semibold">Distance:</span> {request.distanceKm} km</p>
                <p><span className="font-semibold">ETA to pickup:</span> {request.etaToPickup}</p>
                <p><span className="font-semibold">Fare:</span> {request.fare} PKR</p>
                <p><span className="font-semibold">Ride Type:</span> {request.rideType}</p>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded bg-gray-200">
              <div className="h-full bg-townwize-primary transition-all" style={{ width: `${(timeLeft / REQUEST_TIMEOUT) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">Auto-expiring in {timeLeft}s</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button onClick={handleReject} className="rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                Reject
              </button>
              <button onClick={handleAccept} className="rounded-xl bg-townwize-primary py-3 font-semibold text-white">
                Accept
              </button>
              <button onClick={handleGoOffline} className="rounded-xl bg-townwize-danger py-3 text-sm font-semibold text-white">
                Go Offline
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TripRequests;
