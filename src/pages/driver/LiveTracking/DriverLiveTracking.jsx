/* global google */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDriverMode } from "../../../contexts/useDriverMode";
import { DRIVER_MODES } from "../../../contexts/driverModes";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";
import api from "../../../services/api";
import { getSocket } from "../../../hooks/useRideSocket";
import { isNative } from "../../../utils/platform";

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
  const [mapReady, setMapReady] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeRendererRef = useRef(null);
  const lastRouteStatusRef = useRef(null);
  const lastRouteOriginRef = useRef(null);
  const rideStatusRef = useRef(rideStatus);
  const tripDistanceKmRef = useRef(0);
  const lastTripPositionRef = useRef(null);
  const lastHeadingRef = useRef(null);
  const prevDriverPositionRef = useRef(null);

  const { setDriverMode, incomingRide } = useDriverMode();

  const haversineM = (a, b) => {
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(s));
  };

  const bearingDeg = (from, to) => {
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  const lookAhead = (pos, heading, distMeters) => {
    const R = 6371000;
    const bRad = (heading * Math.PI) / 180;
    const latRad = (pos.lat * Math.PI) / 180;
    const lngRad = (pos.lng * Math.PI) / 180;
    const d = distMeters / R;
    const newLat = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
        Math.cos(latRad) * Math.sin(d) * Math.cos(bRad)
    );
    const newLng =
      lngRad +
      Math.atan2(
        Math.sin(bRad) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * Math.sin(newLat)
      );
    return { lat: (newLat * 180) / Math.PI, lng: (newLng * 180) / Math.PI };
  };

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
    rideStatusRef.current = rideStatus;
    if (rideStatus === "ON_TRIP") {
      tripDistanceKmRef.current = 0;
      lastTripPositionRef.current = null;
      lastHeadingRef.current = null;
    }
  }, [rideStatus]);

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

        if (rideStatusRef.current === "ON_TRIP") {
          if (lastTripPositionRef.current) {
            const distM = haversineM(lastTripPositionRef.current, coords);
            if (distM > 5) tripDistanceKmRef.current += distM / 1000;
          }
          lastTripPositionRef.current = coords;
        }

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

  // One-time map + marker initialization — runs when first GPS fix arrives
  useEffect(() => {
    const position = driverPosition || lastKnownPosition;
    if (!position || mapInstanceRef.current) return; // skip if already initialized

    let cancelled = false;
    loadGoogleMaps()
      .then(async () => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        await google.maps.importLibrary("maps");
        await google.maps.importLibrary("marker");
        if (cancelled || mapInstanceRef.current) return;

        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: position,
          zoom: 15,
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
          gestureHandling: "greedy",
          streetViewControl: false,
          mapTypeControl: false,
        });
        setMapReady(true);

        const markerEl = document.createElement("div");
        markerEl.style.width = "16px";
        markerEl.style.height = "16px";
        markerEl.style.borderRadius = "50%";
        markerEl.style.background = "#103139";
        markerEl.style.border = "2px solid #fff";

        driverMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position,
          content: markerEl,
        });
      })
      .catch(() => toast.error("Failed to load Google Maps"));

    return () => { cancelled = true; };
  }, [driverPosition, lastKnownPosition]);

  // Marker + camera update — navigation mode during ON_TRIP, standard follow otherwise
  useEffect(() => {
    if (!driverMarkerRef.current || !driverPosition) return;
    driverMarkerRef.current.position = driverPosition;

    if (!mapInstanceRef.current) return;

    const isOnTrip = rideStatusRef.current === "ON_TRIP";

    // Update heading whenever driver moves at least 5m (filters GPS jitter)
    if (
      prevDriverPositionRef.current &&
      haversineM(prevDriverPositionRef.current, driverPosition) > 5
    ) {
      lastHeadingRef.current = bearingDeg(prevDriverPositionRef.current, driverPosition);
    }
    prevDriverPositionRef.current = driverPosition;

    const heading = lastHeadingRef.current;

    if (isOnTrip && heading !== null) {
      // Navigation mode: rotate to heading, tilt 45°, zoom 18, driver at bottom-third
      mapInstanceRef.current.setHeading(heading);
      mapInstanceRef.current.setTilt(45);
      mapInstanceRef.current.setZoom(18);
      mapInstanceRef.current.panTo(lookAhead(driverPosition, heading, 120));
    } else {
      // Standard follow mode: north-up, no tilt, zoom 15
      mapInstanceRef.current.setHeading(0);
      mapInstanceRef.current.setTilt(0);
      mapInstanceRef.current.setZoom(15);
      mapInstanceRef.current.setCenter(driverPosition);
    }
  }, [driverPosition]);

  // Route polyline — redraws on status change or when driver moves >150 m
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.google?.maps) return;
    if (!driverPosition) return;

    const statusChanged = lastRouteStatusRef.current !== rideStatus;

    // Skip reroute if status unchanged and driver hasn't moved >150 m
    if (!statusChanged && routeRendererRef.current) {
      if (lastRouteOriginRef.current && haversineM(driverPosition, lastRouteOriginRef.current) < 40) return;
    }

    lastRouteStatusRef.current = rideStatus;
    lastRouteOriginRef.current = driverPosition;

    // Clear previous route
    if (routeRendererRef.current) {
      routeRendererRef.current.setMap(null);
      routeRendererRef.current = null;
    }

    const destination =
      rideStatus === "DRIVER_ASSIGNED" ? pickupAddress :
      rideStatus === "ON_TRIP" ? dropoffAddress : null;

    if (!destination) return;

    // Clear previous destination marker
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.map = null;
      destinationMarkerRef.current = null;
    }

    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: rideStatus === "ON_TRIP" ? "#03311C" : "#17BEBB",
        strokeWeight: 5,
        strokeOpacity: 0.85,
      },
    });
    renderer.setMap(mapInstanceRef.current);
    routeRendererRef.current = renderer;

    new google.maps.DirectionsService().route(
      {
        origin: driverPosition,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== "OK" || !routeRendererRef.current) return;
        routeRendererRef.current.setDirections(result);

        // Place a destination pin at the last leg's end location
        const legs = result.routes[0]?.legs;
        const endLatLng = legs?.[legs.length - 1]?.end_location;
        if (endLatLng && mapInstanceRef.current) {
          const pinEl = document.createElement("div");
          pinEl.style.cssText = "width:14px;height:14px;border-radius:50%;background:#EF4444;border:2px solid #fff;box-shadow:0 0 0 3px rgba(239,68,68,0.3)";
          destinationMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: endLatLng,
            content: pinEl,
          });
        }
      }
    );
  }, [rideStatus, driverPosition, mapReady, pickupAddress, dropoffAddress]);

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
      await api.post(`/rides/${rideId}/status`, {
        status: "COMPLETED",
        actualDistanceKm: parseFloat(tripDistanceKmRef.current.toFixed(3)),
      });
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

  const statusLabel =
    (rideStatus === "DRIVER_ASSIGNED" && "En route to pickup") ||
    (rideStatus === "ARRIVED" && "Arrived at pickup") ||
    (rideStatus === "ON_TRIP" && "On trip") ||
    "";

  const actionButtons = (
    <div className="flex flex-wrap gap-3">
      {rideStatus === "DRIVER_ASSIGNED" && (
        <>
          <button
            onClick={openNavigation}
            className="min-w-[180px] flex-1 rounded-xl bg-townwize-primary py-3 font-semibold text-white"
          >
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
      <button
        onClick={() => toast.info("Calling passenger...")}
        className="rounded-xl bg-gray-200 px-4 py-3 text-sm dark:bg-gray-700"
      >
        Call
      </button>
    </div>
  );

  // ─── Mobile (Capacitor) — full-screen map + floating bottom card ──────────
  if (isNative()) {
    return (
      <div className="fixed inset-0 bg-gray-900">
        {/* Status header — respects safe-area notch */}
        <div
          className="absolute top-0 left-0 right-0 z-10 border-b border-gray-200 bg-white shadow-sm dark:bg-townwize-primaryDark px-4 pb-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          <h1 className="text-lg font-bold">Active Trip</h1>
          {statusLabel && (
            <span className="text-sm text-gray-500">{statusLabel}</span>
          )}
        </div>

        {/* Map fills screen below header */}
        <div ref={mapRef} className="absolute inset-0 top-[76px] z-0" />

        {/* Bottom action card */}
        <div
          className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:bg-townwize-primaryDark px-4 pt-4"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3" />
          <div className="space-y-1 text-sm mb-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-townwize-accent" />
              <p className="font-medium leading-snug">{pickupAddress}</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
              <p className="text-gray-500 leading-snug">{dropoffAddress}</p>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>{rideType}</span>
              <span className="font-semibold text-townwize-primary dark:text-white">
                {fare} PKR
              </span>
            </div>
          </div>
          {actionButtons}
        </div>
      </div>
    );
  }

  // ─── Web ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-[calc(100vh-120px)] bg-gray-50">
      <div className="z-10 border-b border-gray-200 bg-white p-4 shadow-sm dark:bg-townwize-primaryDark">
        <h1 className="text-lg font-bold">Active Trip</h1>
        {statusLabel && <span className="text-sm text-gray-500">{statusLabel}</span>}
      </div>

      <div ref={mapRef} className="absolute inset-0 top-[72px] z-0" />

      <div className="pointer-events-auto absolute bottom-0 z-50 w-full space-y-2 rounded-t-2xl border-t border-gray-200 bg-white p-4 shadow-2xl dark:bg-townwize-primaryDark">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p><strong>Pickup:</strong> {pickupAddress}</p>
          <p><strong>Dropoff:</strong> {dropoffAddress}</p>
          <p><strong>Ride Type:</strong> {rideType}</p>
          <p><strong>Fare:</strong> {fare} PKR</p>
        </div>
        <div className="mt-4">{actionButtons}</div>
      </div>
    </div>
  );
};

export default DriverLiveTracking;
