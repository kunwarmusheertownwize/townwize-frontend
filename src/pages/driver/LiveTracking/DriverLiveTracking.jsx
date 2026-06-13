/* global google */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDriverMode } from "../../../contexts/useDriverMode";
import { DRIVER_MODES } from "../../../contexts/driverModes";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";
import api from "../../../services/api";
import { getSocket } from "../../../hooks/useRideSocket";

const DriverLiveTracking = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const storedTrip = sessionStorage.getItem("activeDriverTrip");
  const [activeRequest, setActiveRequest] = useState(() => state?.request || (storedTrip && JSON.parse(storedTrip)));
  const request = activeRequest;
  const rideId = request?.rideId || request?._id;

  const [rideStatus, setRideStatus] = useState(request?.status);
  const [lastKnownPosition, setLastKnownPosition] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const [arriving, setArriving] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);

  const { setDriverMode, incomingRide } = useDriverMode();

  const persistActiveTrip = (next) => {
    setActiveRequest(next);
    sessionStorage.setItem("activeDriverTrip", JSON.stringify(next));
  };

  const hasRequest = Boolean(request);
  const pickupAddress = request?.pickup;
  const dropoffAddress = request?.dropoff;
  const rideType = request?.rideType;
  const fare = request?.fare;

  useEffect(() => {
    if (!request) return;
    setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
  }, [request, setDriverMode]);

  useEffect(() => {
    if (request) return;

    let mounted = true;
    api
      .get("/driver/active-ride")
      .then((res) => {
        if (!mounted) return;
        const activeRide = res?.data?.data;
        const activeStatuses = ["DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"];
        if (!activeRide?.rideId || !activeStatuses.includes(String(activeRide.status).toUpperCase())) {
          sessionStorage.removeItem("activeDriverTrip");
          setDriverMode(DRIVER_MODES.ONLINE_IDLE);
          navigate("/driver/trip-requests", { replace: true });
          return;
        }

        const recovered = {
          rideId: activeRide.rideId,
          status: activeRide.status,
          pickup: activeRide.pickup?.address || activeRide.pickup,
          dropoff: activeRide.dropoff?.address || activeRide.dropoff,
          rideType: activeRide.rideType,
          fare: activeRide.fare,
          distanceKm: activeRide.distanceKm,
          etaMinutes: activeRide.etaMinutes,
        };

        persistActiveTrip(recovered);
        setRideStatus(recovered.status);
        setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [navigate, request, setDriverMode]);

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Location services not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverPosition(coords);
        setLastKnownPosition(coords);

        if (driverMarkerRef.current) driverMarkerRef.current.position = coords;
        if (mapInstanceRef.current) mapInstanceRef.current.setCenter(coords);

        if (rideId) {
          api.post("/driver/location", { rideId, lat: coords.lat, lng: coords.lng }).catch(() => {});
        }
      },
      () => toast.error("Enable location permissions"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    api
      .get(`/rides/${rideId}`)
      .then((res) => {
        if (!res?.data?.data?.status) return;
        const status = res.data.data.status;
        setRideStatus(status);
        persistActiveTrip({ ...request, status });
      })
      .catch(() => {});
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("join", `ride:${rideId}`);

    const onRideUpdated = (payload) => {
      if (String(payload?.rideId) !== String(rideId) || !payload?.status) return;
      const status = payload.status;
      setRideStatus(status);

      const finalStatuses = ["COMPLETED", "CANCELLED"];
      if (finalStatuses.includes(String(status).toUpperCase())) {
        sessionStorage.removeItem("activeDriverTrip");
        setDriverMode(DRIVER_MODES.ONLINE_IDLE);
        return;
      }

      persistActiveTrip({ ...request, status });
    };

    socket.on("ride:updated", onRideUpdated);
    return () => {
      socket.off("ride:updated", onRideUpdated);
    };
  }, [rideId, request, setDriverMode]);

  useEffect(() => {
    const position = driverPosition || lastKnownPosition;
    if (!position) return;

    let mounted = true;
    loadGoogleMaps()
      .then(async () => {
        if (!mounted || !mapRef.current) return;
        await google.maps.importLibrary("maps");
        await google.maps.importLibrary("marker");

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: position,
            zoom: 15,
            mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
            gestureHandling: "greedy",
            streetViewControl: false,
            mapTypeControl: false,
          });
        }

        const markerEl = document.createElement("div");
        markerEl.style.width = "16px";
        markerEl.style.height = "16px";
        markerEl.style.borderRadius = "50%";
        markerEl.style.background = "#103139";
        markerEl.style.border = "2px solid #fff";

        if (!driverMarkerRef.current) {
          driverMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position,
            content: markerEl,
          });
        } else {
          driverMarkerRef.current.position = position;
        }
      })
      .catch(() => toast.error("Failed to load Google Maps"));

    return () => {
      mounted = false;
    };
  }, [driverPosition, lastKnownPosition]);

  useEffect(() => {
    if (!incomingRide?.status) return;
    if (incomingRide?.rideId && String(incomingRide.rideId) !== String(rideId)) return;
    setRideStatus(incomingRide.status);
  }, [incomingRide?.rideId, incomingRide?.status, rideId]);

  const openNavigation = () => {
    if (!pickupAddress) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupAddress)}`, "_blank");
  };

  const handleArrivedAtPickup = async () => {
    if (!rideId || rideStatus !== "DRIVER_ASSIGNED" || arriving) return;
    setArriving(true);
    try {
      await api.post(`/rides/${rideId}/status`, { status: "ARRIVED" });
      setRideStatus("ARRIVED");
      persistActiveTrip({ ...request, status: "ARRIVED" });
    } catch {
      setArriving(false);
    }
  };

  const handleStartTrip = async () => {
    if (!rideId || rideStatus !== "ARRIVED" || startingTrip) return;
    setStartingTrip(true);
    try {
      await api.post(`/rides/${rideId}/status`, { status: "ON_TRIP" });
      setRideStatus("ON_TRIP");
      persistActiveTrip({ ...request, status: "ON_TRIP" });
    } catch {
      setStartingTrip(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!rideId || rideStatus !== "ON_TRIP" || endingTrip) return;
    setEndingTrip(true);
    try {
      await api.post(`/rides/${rideId}/status`, { status: "COMPLETED" });
      toast.success("Trip completed successfully");

      const tripSummaryPayload = { pickup: pickupAddress, dropoff: dropoffAddress, rideType, fare, rideId };
      sessionStorage.removeItem("activeDriverTrip");
      setDriverMode(DRIVER_MODES.ONLINE_IDLE);

      setTimeout(() => {
        navigate("/driver/trip-summary", { replace: true, state: { trip: tripSummaryPayload } });
      }, 800);
    } catch {
      toast.error("Failed to complete trip");
      setEndingTrip(false);
    }
  };

  if (!hasRequest) return null;

  return (
    <div className="relative h-[calc(100vh-120px)] bg-gray-50">
      <div className="z-10 border-b border-gray-200 bg-white p-4 shadow-sm dark:bg-townwize-primaryDark">
        <h1 className="text-lg font-bold">Active Trip</h1>
        <span className="text-sm text-gray-500">
          {rideStatus === "DRIVER_ASSIGNED" && "En route to pickup"}
          {rideStatus === "ARRIVED" && "Arrived at pickup"}
          {rideStatus === "ON_TRIP" && "On trip"}
        </span>
      </div>

      <div ref={mapRef} className="absolute inset-0 top-[72px] z-0" />

      <div className="pointer-events-auto absolute bottom-0 z-50 w-full space-y-2 rounded-t-2xl border-t border-gray-200 bg-white p-4 shadow-2xl dark:bg-townwize-primaryDark">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p><strong>Pickup:</strong> {pickupAddress}</p>
          <p><strong>Dropoff:</strong> {dropoffAddress}</p>
          <p><strong>Ride Type:</strong> {rideType}</p>
          <p><strong>Fare:</strong> {fare} PKR</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {rideStatus === "DRIVER_ASSIGNED" && (
            <>
              <button onClick={openNavigation} className="min-w-[220px] flex-1 rounded-xl bg-townwize-primary py-3 font-semibold text-white">
                Navigate to Pickup
              </button>
              <button
                onClick={handleArrivedAtPickup}
                disabled={arriving}
                className={`flex-1 rounded-xl py-3 font-semibold ${
                  arriving ? "cursor-not-allowed bg-gray-400" : "bg-green-600 text-white"
                }`}
              >
                Arrived
              </button>
            </>
          )}

          {rideStatus === "ARRIVED" && (
            <button
              onClick={handleStartTrip}
              disabled={startingTrip}
              className={`flex-1 rounded-xl py-3 font-semibold ${
                startingTrip ? "cursor-not-allowed bg-gray-400" : "bg-townwize-primary text-white"
              }`}
            >
              Start Trip
            </button>
          )}

          {rideStatus === "ON_TRIP" && (
            <button
              onClick={handleCompleteTrip}
              disabled={endingTrip}
              className={`flex-1 rounded-xl py-3 font-semibold ${
                endingTrip ? "cursor-not-allowed bg-gray-400" : "bg-red-600 text-white"
              }`}
            >
              End Trip
            </button>
          )}

          <button onClick={() => toast.info("Calling passenger...")} className="rounded-xl bg-gray-200 px-4 py-3 text-sm dark:bg-gray-700">
            Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverLiveTracking;
