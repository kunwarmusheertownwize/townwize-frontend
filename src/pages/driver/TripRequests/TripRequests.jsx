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
  const { driverMode, setDriverMode, incomingRide, setIncomingRide } = useDriverMode();

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
          localStorage.setItem("activeDriverTrip", JSON.stringify(activeTrip));
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
    return () => { mounted = false; };
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
      localStorage.setItem("activeDriverTrip", JSON.stringify(activeTrip));
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
            <button onClick={closeToast} className="px-3 py-1 text-gray-500 hover:underline">
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

  // Live location broadcast while online
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
        latestCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
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

  // ── Timer urgency colour ────────────────────────────────────────────────────
  const timerPct = (timeLeft / REQUEST_TIMEOUT) * 100;
  const timerColor =
    timerPct > 50 ? "bg-townwize-accent" : timerPct > 25 ? "bg-amber-400" : "bg-red-500";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto mt-8 max-w-lg space-y-4">

      {/* ── Waiting / Searching ── */}
      {!request && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:bg-townwize-primaryDark">
          <div className="mb-5 flex items-center justify-center">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-townwize-accent/10">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-townwize-accent opacity-30" />
              <span className="inline-block h-6 w-6 rounded-full bg-townwize-accent" />
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {searching ? "Searching…" : "Waiting for Requests"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searching
              ? "Looking for nearby ride requests"
              : "You're online. Ride requests will appear here."}
          </p>

          <button
            onClick={handleGoOffline}
            className="mt-8 rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Go Offline
          </button>
        </div>
      )}

      {/* ── Incoming Request ── */}
      {request && (
        <div className="rounded-2xl border border-townwize-accent/40 bg-white shadow-md dark:bg-townwize-primaryDark">
          {/* Header */}
          <div className="rounded-t-2xl bg-townwize-accent/10 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-townwize-accent">
              New Ride Request
            </p>
            <div className="mt-1 flex items-end justify-between">
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                {request.fare} <span className="text-base font-semibold">PKR</span>
              </span>
              <span className="rounded-full bg-townwize-primary/10 px-3 py-1 text-xs font-semibold text-townwize-primary dark:bg-white/10 dark:text-white">
                {request.rideType}
              </span>
            </div>
          </div>

          {/* Route */}
          <div className="space-y-3 px-6 py-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="h-3 w-3 rounded-full bg-townwize-accent" />
                <span className="my-1 h-8 w-px bg-gray-300 dark:bg-gray-600" />
                <span className="h-3 w-3 rounded-full bg-townwize-primary dark:bg-white" />
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pickup</p>
                  <p className="font-medium text-gray-900 dark:text-white">{request.pickup}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Dropoff</p>
                  <p className="font-medium text-gray-900 dark:text-white">{request.dropoff}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-white/5">
              <div className="text-center">
                <p className="text-xs text-gray-400">Distance</p>
                <p className="font-semibold text-gray-900 dark:text-white">{request.distanceKm} km</p>
              </div>
              <div className="w-px bg-gray-200 dark:bg-gray-600" />
              <div className="text-center">
                <p className="text-xs text-gray-400">ETA to pickup</p>
                <p className="font-semibold text-gray-900 dark:text-white">{request.etaToPickup}</p>
              </div>
              <div className="w-px bg-gray-200 dark:bg-gray-600" />
              <div className="text-center">
                <p className="text-xs text-gray-400">Est. earning</p>
                <p className="font-semibold text-townwize-accent">
                  PKR {Math.round(Number(request.fare || 0) * 0.8).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Timer bar */}
          <div className="px-6">
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full transition-all ${timerColor}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
            <p className="mt-1 text-end text-xs text-gray-400">
              Expires in {timeLeft}s
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 p-6 pt-3">
            <button
              onClick={handleReject}
              className="rounded-xl border border-gray-300 py-3.5 font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="rounded-xl bg-townwize-accent py-3.5 font-semibold text-townwize-primary shadow-md shadow-townwize-accent/30 transition hover:brightness-110 active:scale-[0.98]"
            >
              Accept
            </button>
          </div>

          {/* Separate go-offline link */}
          <div className="border-t border-gray-100 px-6 py-3 text-center dark:border-gray-700">
            <button
              onClick={handleGoOffline}
              className="text-xs text-gray-400 hover:text-townwize-danger hover:underline"
            >
              Go offline instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripRequests;
