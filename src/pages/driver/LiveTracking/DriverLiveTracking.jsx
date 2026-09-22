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
import { registerPlugin } from "@capacitor/core";
const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

// Three-layer accidental-tap protection: pointer-capture drag → 8-second undo window.
const SlideToEndTrip = ({ onConfirm, disabled }) => {
  const trackRef  = useRef(null);
  const thumbRef  = useRef(null);
  const dragging  = useRef(false);
  const startX    = useRef(0);
  const offsetRef = useRef(0);
  const timerRef  = useRef(null);

  const [phase,     setPhase]     = useState("idle"); // "idle" | "countdown"
  const [countdown, setCountdown] = useState(8);

  const maxSlide = () => (trackRef.current?.offsetWidth || 280) - 56 - 4;

  const snapBack = () => {
    if (!thumbRef.current) return;
    thumbRef.current.style.transition = "transform 0.25s ease";
    thumbRef.current.style.transform  = "translateX(0px)";
    offsetRef.current = 0;
    setTimeout(() => { if (thumbRef.current) thumbRef.current.style.transition = ""; }, 260);
  };

  const startCountdown = () => {
    setPhase("countdown");
    let remaining = 8;
    setCountdown(remaining);
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) { clearInterval(timerRef.current); onConfirm(); }
    }, 1000);
  };

  const handleUndo = () => {
    clearInterval(timerRef.current);
    setPhase("idle");
    setCountdown(8);
    snapBack();
  };

  const getClientX = (e) =>
    e.touches ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX : e.clientX;

  const onDragStart = (e) => {
    if (disabled || phase !== "idle") return;
    dragging.current = true;
    startX.current   = getClientX(e);
  };

  const onDragMove = (e) => {
    if (!dragging.current) return;
    if (e.cancelable) e.preventDefault();
    const delta = Math.max(0, Math.min(maxSlide(), getClientX(e) - startX.current));
    if (thumbRef.current) {
      thumbRef.current.style.transition = "none";
      thumbRef.current.style.transform  = `translateX(${delta}px)`;
    }
    offsetRef.current = delta;
  };

  const onDragEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (offsetRef.current >= maxSlide() * 0.82) {
      if (thumbRef.current) {
        thumbRef.current.style.transition = "transform 0.15s ease";
        thumbRef.current.style.transform  = `translateX(${maxSlide()}px)`;
      }
      startCountdown();
    } else {
      snapBack();
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  if (phase === "countdown") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
        <span className="flex-1 text-sm font-semibold text-red-700 dark:text-red-400">
          Ending trip in {countdown}s…
        </span>
        <button
          onClick={handleUndo}
          className="rounded-lg border border-red-300 bg-white px-4 py-1.5 text-sm font-semibold text-red-600 dark:border-red-700 dark:bg-gray-800 dark:text-red-400"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className={`relative h-14 w-full select-none overflow-hidden rounded-xl bg-red-100 dark:bg-red-900/30 ${disabled ? "pointer-events-none opacity-50" : ""}`}
      onTouchStart={onDragStart}
      onTouchMove={onDragMove}
      onTouchEnd={onDragEnd}
      onTouchCancel={onDragEnd}
      onMouseDown={onDragStart}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-red-500 dark:text-red-400">
        Slide to End Trip →
      </span>
      <div
        ref={thumbRef}
        className="absolute start-0.5 top-0.5 bottom-0.5 flex w-14 cursor-grab items-center justify-center rounded-lg bg-red-600 text-white shadow-md active:cursor-grabbing"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

const DriverLiveTracking = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const storedTrip = localStorage.getItem("activeDriverTrip");
  const [activeRequest, setActiveRequest] = useState(() => state?.request || (storedTrip && JSON.parse(storedTrip)));
  const request = activeRequest;
  const rideId = request?.rideId || request?._id;

  const [rideStatus, setRideStatus] = useState(request?.status);
  const [poolPickupStage, setPoolPickupStage] = useState(request?.poolPickupStage ?? null);
  const [sharedPassengers, setSharedPassengers] = useState(request?.sharedPassengers || []);
  const [lastKnownPosition, setLastKnownPosition] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const [driverHeading, setDriverHeading] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [nearPickup, setNearPickup] = useState(false);
  const [nearDropoff, setNearDropoff] = useState(true);
  const [distToDropoffKm, setDistToDropoffKm] = useState(null);
  const [earlyEndConfirm, setEarlyEndConfirm] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [driverCancelReason, setDriverCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [arrivedElapsedSec, setArrivedElapsedSec] = useState(0);
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const [poolStageLoading, setPoolStageLoading] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [allAboard, setAllAboard] = useState(false);
  const [dropoffStage, setDropoffStage] = useState(1);
  const [showCoRiderReportConfirm, setShowCoRiderReportConfirm] = useState(false);
  const [coRiderReportSubmitting, setCoRiderReportSubmitting] = useState(false);
  const [gpsStale, setGpsStale] = useState(false);
  const [socketDisconnected, setSocketDisconnected] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);   // manual Polyline — replaces DirectionsRenderer
  const routePathRef = useRef([]);          // decoded step-path for real-time trimming
  const lastRouteKeyRef = useRef(null);
  const lastRouteOriginRef = useRef(null);
  const rideStatusRef = useRef(rideStatus);
  const poolStageRef = useRef(poolPickupStage);
  const tripDistanceKmRef = useRef(0);
  const lastTripPositionRef = useRef(null);
  const lastHeadingRef = useRef(null);
  const prevDriverPositionRef = useRef(null);
  const currentPositionRef = useRef(null);
  const pickupCoordsRef = useRef(null); // populated from Directions API when en route to pickup
  const routeFetchInFlightRef = useRef(false); // prevents concurrent DirectionsService floods
  const socketWasConnectedRef = useRef(false); // tracks first connect vs. reconnect for resync
  const lastGpsTimeRef = useRef(null);          // timestamp of last GPS update (stale detection)
  const lastPositionForSpeedRef = useRef(null); // { lat, lng, t } for speed sanity filter
  const dropoffStageRef = useRef(1);            // mirrors dropoffStage for proximity check inside effects

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

  const persistActiveTrip = (next) => {
    setActiveRequest(next);
    localStorage.setItem("activeDriverTrip", JSON.stringify(next));
  };

  const hasRequest = Boolean(request);
  const pickupAddress = request?.pickup;
  const dropoffAddress = request?.dropoff;
  const pickupCoords = request?.pickupCoords;
  const dropoffCoords = request?.dropoffCoords;
  const rideType = request?.rideType;
  const fare = request?.fare;
  const passengerName = request?.passengerName || null;
  const passengerPhone = request?.passengerPhone || null;
  const isPooled = rideType === "RIDETOGETHER" && sharedPassengers.length > 0;
  const sp = sharedPassengers[0];

  useEffect(() => {
    rideStatusRef.current = rideStatus;
    if (rideStatus === "ON_TRIP") {
      tripDistanceKmRef.current = 0;
      // Seed with last known GPS position so the very first fix accumulates distance
      // rather than being wasted setting the starting point from null
      lastTripPositionRef.current = currentPositionRef.current;
      lastHeadingRef.current = null;
    }
  }, [rideStatus]);

  useEffect(() => {
    poolStageRef.current = poolPickupStage;
  }, [poolPickupStage]);

  useEffect(() => {
    dropoffStageRef.current = dropoffStage;
  }, [dropoffStage]);

  useEffect(() => {
    if (!request) return;
    setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
  }, [request, setDriverMode]);

  // Mount-time check: only catches the race where a passenger cancelled between
  // navigation and this component mounting/joining the socket room.
  // Never updates rideStatus — doing so would revert driver's local progress.
  const mountStatusCheckedRef = useRef(false);
  useEffect(() => {
    if (!rideId || mountStatusCheckedRef.current) return;
    mountStatusCheckedRef.current = true;
    api.get(`/rides/${rideId}`).then((res) => {
      const status = String(res?.data?.data?.status || "").toUpperCase();
      if (status === "CANCELLED") {
        localStorage.removeItem("activeDriverTrip");
        setDriverMode(DRIVER_MODES.ONLINE_IDLE);
        toast.info("The passenger has cancelled the ride.");
        navigate("/driver/home", { replace: true });
      }
    }).catch(() => {});
  }, [rideId]);

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
          localStorage.removeItem("activeDriverTrip");
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
          sharedPassengers: activeRide.sharedPassengers || [],
          poolPickupStage: activeRide.poolPickupStage ?? null,
          passengerName: activeRide.passengerName || null,
          passengerPhone: activeRide.passengerPhone || null,
        };
        persistActiveTrip(recovered);
        setRideStatus(recovered.status);
        setSharedPassengers(recovered.sharedPassengers);
        setPoolPickupStage(recovered.poolPickupStage);
        setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [navigate, request, setDriverMode]);

  // Fetch full ride on load to get sharedPassengers + poolPickupStage
  useEffect(() => {
    if (!rideId) return;
    api
      .get(`/rides/${rideId}`)
      .then((res) => {
        const data = res?.data?.data;
        if (!data?.status) return;
        setRideStatus(data.status);
        const spArr = data.sharedPassengers || [];
        const stage = data.poolPickupStage ?? null;
        setSharedPassengers(spArr);
        setPoolPickupStage(stage);
        persistActiveTrip({ ...request, status: data.status, sharedPassengers: spArr, poolPickupStage: stage });
      })
      .catch(() => {});
  }, [rideId]);

  // Keep screen awake while driver has an active trip (Uber Driver behaviour)
  // Uses @capacitor-community/keep-awake which calls native APIs on both
  // Android (FLAG_KEEP_SCREEN_ON) and iOS (isIdleTimerDisabled).
  useEffect(() => {
    if (!isNative()) return;
    import("@capacitor-community/keep-awake")
      .then(({ KeepAwake }) => { KeepAwake.keepAwake().catch(() => {}); })
      .catch(() => {});
    return () => {
      import("@capacitor-community/keep-awake")
        .then(({ KeepAwake }) => { KeepAwake.allowSleep().catch(() => {}); })
        .catch(() => {});
    };
  }, []);

  useEffect(() => {
    let cleanup = () => {};

    const onPosition = (lat, lng, heading, gpsSpeedMs = null) => {
      const now = Date.now();
      const coords = { lat, lng };

      // Speed sanity filter — discard GPS jumps implying > 150 km/h.
      if (lastPositionForSpeedRef.current) {
        const { lat: pLat, lng: pLng, t: pTime } = lastPositionForSpeedRef.current;
        const timeDeltaS = (now - pTime) / 1000;
        if (timeDeltaS > 0) {
          const distM = haversineM({ lat: pLat, lng: pLng }, coords);
          const speedKmh = (distM / timeDeltaS) * 3.6;
          if (speedKmh > 150) return;
        }
      }
      lastPositionForSpeedRef.current = { lat, lng, t: now };
      lastGpsTimeRef.current = now;

      setDriverPosition(coords);
      setLastKnownPosition(coords);
      currentPositionRef.current = coords;
      if (heading != null && !isNaN(heading)) setDriverHeading(heading);
      if (rideStatusRef.current === "ON_TRIP") {
        if (lastTripPositionRef.current) {
          const distM = haversineM(lastTripPositionRef.current, coords);
          // GPS drift filter: a phone sitting still reports small position changes.
          // Use chip-reported speed when available (most reliable); fall back to a
          // 30 m minimum-displacement gate so accumulated drift never counts as travel.
          // The baseline only advances when we actually count the movement — this
          // prevents "drift reset" where each small jitter resets the starting point.
          const chipMoving = gpsSpeedMs != null ? gpsSpeedMs >= 0.5 : null;
          const countIt = chipMoving === true || (chipMoving === null && distM >= 30);
          if (countIt && distM >= 5) {
            tripDistanceKmRef.current += distM / 1000;
            lastTripPositionRef.current = coords;
          }
          // else: baseline stays fixed — next reading still measures from this point
        } else {
          lastTripPositionRef.current = coords;  // seed on first fix
        }
      }
      if (rideId) {
        api.post("/driver/location", { rideId, lat, lng, heading: heading ?? null }).catch(() => {});
      }
    };

    if (isNative()) {
      // Background geolocation: keeps GPS alive during phone calls, background, and screen lock.
      // Shows a persistent foreground-service notification on Android so the OS never kills the process.
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Wizer is tracking your trip location.",
          backgroundTitle: "Wizer — Trip Active",
          requestPermissions: true,
          stale: false,
          distanceFilter: 3,
        },
        (position, error) => {
          if (error || !position) return;
          onPosition(position.latitude, position.longitude, position.bearing,
            position.speed != null && position.speed >= 0 ? position.speed : null);
        }
      ).then((watcherId) => {
        cleanup = () => BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => {});
      }).catch(() => {
        toast.error("Enable location permissions");
      });
    } else {
      if (!navigator.geolocation) { toast.error("Location services not supported"); return; }
      const watchId = navigator.geolocation.watchPosition(
        (pos) => onPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.heading,
            pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed : null),
        () => toast.error("Enable location permissions"),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      cleanup = () => navigator.geolocation.clearWatch(watchId);
    }

    return () => cleanup();
  }, [rideId]);

  // Stale GPS detection — checks every 3s; marks stale if no update for 15s
  useEffect(() => {
    if (!rideId) return;
    lastGpsTimeRef.current = Date.now();
    const check = setInterval(() => {
      if (!lastGpsTimeRef.current) return;
      setGpsStale(Date.now() - lastGpsTimeRef.current > 15000);
    }, 3000);
    return () => { clearInterval(check); setGpsStale(false); };
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("join", `ride:${rideId}`);

    const onConnect = () => {
      // Re-join room on every reconnect (socket.io drops subscriptions on disconnect)
      socket.emit("join", `ride:${rideId}`);
      setSocketDisconnected(false);
      // On reconnect (not the initial connect), resync ride state from REST in case
      // a status change was missed while the socket was down
      if (socketWasConnectedRef.current) {
        api.get(`/rides/${rideId}`).then((res) => {
          const fresh = res?.data?.data;
          if (!fresh?.status) return;
          setRideStatus(fresh.status);
          if (String(fresh.status).toUpperCase() === "CANCELLED") {
            localStorage.removeItem("activeDriverTrip");
            setDriverMode(DRIVER_MODES.ONLINE_IDLE);
            navigate("/driver/home", { replace: true });
          }
        }).catch(() => {});
      }
      socketWasConnectedRef.current = true;
    };

    const onDisconnect = () => setSocketDisconnected(true);

    const onRideUpdated = (payload) => {
      if (String(payload?.rideId) !== String(rideId) || !payload?.status) return;
      const status = payload.status;
      setRideStatus(status);
      if (String(status).toUpperCase() === "CANCELLED") {
        localStorage.removeItem("activeDriverTrip");
        setDriverMode(DRIVER_MODES.ONLINE_IDLE);
        toast.info("The passenger has cancelled the ride.");
        navigate("/driver/home", { replace: true });
        return;
      }
      if (String(status).toUpperCase() === "COMPLETED") {
        localStorage.removeItem("activeDriverTrip");
        setDriverMode(DRIVER_MODES.ONLINE_IDLE);
        return;
      }
      persistActiveTrip({ ...request, status });
    };

    const onPoolExited = (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      setSharedPassengers([]);
      setPoolPickupStage(null);
      toast.info(`${payload.exitedPassengerName || "Co-passenger"} exited the shared ride. Continuing solo.`);
    };

    const onPoolAllAboard = (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      setAllAboard(true);
      setPoolPickupStage(null);
      toast.success("All passengers aboard. You may start the trip.");
    };

    const onDestinationChanged = (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      toast.info(`Passenger updated destination to: ${payload.dropoff}`, { autoClose: 4000 });
      // Update the active trip cache so the new dropoff persists across re-renders
      const updatedRequest = {
        ...request,
        dropoff: payload.dropoff,
        dropoffCoords: payload.dropoffCoords,
        fare: payload.fareEstimate ?? request?.fare,
      };
      persistActiveTrip(updatedRequest);
      // Move the destination marker
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.position = payload.dropoffCoords;
      }
      // Force route re-fetch
      lastRouteOriginRef.current = null;
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("ride:updated", onRideUpdated);
    socket.on("ride:pool_exited", onPoolExited);
    socket.on("ride:pool_all_aboard", onPoolAllAboard);
    socket.on("ride:destination_changed", onDestinationChanged);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("ride:updated", onRideUpdated);
      socket.off("ride:pool_exited", onPoolExited);
      socket.off("ride:pool_all_aboard", onPoolAllAboard);
      socket.off("ride:destination_changed", onDestinationChanged);
    };
  }, [rideId, request, setDriverMode]);

  useEffect(() => {
    const position = driverPosition || lastKnownPosition;
    if (!position || mapInstanceRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(async () => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        await google.maps.importLibrary("maps");
        await google.maps.importLibrary("marker");
        if (cancelled || mapInstanceRef.current) return;
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: position, zoom: 15,
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
          renderingType: "VECTOR",
          gestureHandling: "greedy", streetViewControl: false, mapTypeControl: false,
        });
        setMapReady(true);
        await google.maps.importLibrary("marker");
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        const iconEl = document.createElement("img");
        iconEl.src = "/favicon-96x96-wizer-marker.png";
        iconEl.style.cssText = "width:32px;height:32px;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.45);display:block;";
        driverMarkerRef.current = new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position,
          content: iconEl,
        });
      })
      .catch(() => toast.error("Failed to load Google Maps"));
    return () => { cancelled = true; };
  }, [driverPosition, lastKnownPosition]);

  useEffect(() => {
    if (!driverMarkerRef.current || !driverPosition) return;
    driverMarkerRef.current.position = driverPosition;

    // Use only computed bearing — GPS heading from WebView is unreliable on Android
    if (prevDriverPositionRef.current && haversineM(prevDriverPositionRef.current, driverPosition) > 3) {
      lastHeadingRef.current = bearingDeg(prevDriverPositionRef.current, driverPosition);
    }
    prevDriverPositionRef.current = driverPosition;

    // Enable "Arrived" button only when within 300m of pickup
    if (rideStatusRef.current === "DRIVER_ASSIGNED" && pickupCoordsRef.current) {
      setNearPickup(haversineM(driverPosition, pickupCoordsRef.current) <= 300);
    }

    // Enable "End Trip" slider only when within 200m of the active dropoff.
    // For pooled stage 2, gate against the co-passenger's dropoff coords if available.
    if (rideStatusRef.current === "ON_TRIP") {
      const spCoords = dropoffStageRef.current === 2 ? sp?.dropoffCoords : null;
      const targetCoords = spCoords?.lat ? spCoords : dropoffCoords;
      const distM = targetCoords ? haversineM(driverPosition, targetCoords) : 0;
      setNearDropoff(!targetCoords || distM <= 200);
      setDistToDropoffKm(targetCoords ? distM / 1000 : null);
    }

    // Real-time polyline trimming — consume route from the front as driver advances,
    // no API call needed, eliminates the "route trails behind marker" visual bug
    const path = routePathRef.current;
    if (path.length > 1 && routePolylineRef.current) {
      let minDist = Infinity;
      let nearestIdx = 0;
      for (let i = 0; i < path.length; i++) {
        const d = haversineM(driverPosition, path[i]);
        if (d < minDist) { minDist = d; nearestIdx = i; }
      }
      if (minDist < 120 && nearestIdx < path.length - 1) {
        routePolylineRef.current.setPath(path.slice(nearestIdx));
      } else if (nearestIdx < path.length - 1) {
        // Driver is off-route (>120m from nearest point) — force immediate re-fetch
        lastRouteOriginRef.current = null;
      }
    }

    const effectiveHeading = lastHeadingRef.current;

    if (!mapInstanceRef.current) return;
    const isOnTrip = rideStatusRef.current === "ON_TRIP";
    if (isOnTrip && effectiveHeading !== null && !isNaN(effectiveHeading)) {
      mapInstanceRef.current.setHeading(effectiveHeading);
      mapInstanceRef.current.setTilt(0);
      mapInstanceRef.current.setZoom(16);
      mapInstanceRef.current.panTo(driverPosition);
    } else {
      mapInstanceRef.current.setHeading(0);
      mapInstanceRef.current.setTilt(0);
      mapInstanceRef.current.setZoom(14);
      mapInstanceRef.current.setCenter(driverPosition);
    }
  }, [driverPosition, driverHeading]);

  // Route polyline — manual Polyline + real-time trimming (no DirectionsRenderer lag)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.google?.maps || !driverPosition) return;

    const stage = poolStageRef.current;
    let destination = null;
    let destinationPin = null; // exact coords for marker placement
    if (rideStatus === "DRIVER_ASSIGNED") {
      destination = pickupCoords ? { lat: pickupCoords.lat, lng: pickupCoords.lng } : pickupAddress;
      destinationPin = pickupCoords ? { lat: pickupCoords.lat, lng: pickupCoords.lng } : null;
    } else if (rideStatus === "ARRIVED" && isPooled && (stage === 2 || stage === 3) && sp?.pickupAddress) {
      destination = sp.pickupAddress;
      destinationPin = null;
    } else if (rideStatus === "ON_TRIP") {
      destination = dropoffCoords ? { lat: dropoffCoords.lat, lng: dropoffCoords.lng } : dropoffAddress;
      destinationPin = dropoffCoords ? { lat: dropoffCoords.lat, lng: dropoffCoords.lng } : null;
    }

    const routeKey = `${rideStatus}-${stage}`;
    const statusChanged = lastRouteKeyRef.current !== routeKey;

    // In-flight guard — always checked first, regardless of polyline state.
    // Without this, status-change ticks (where routePolylineRef is null) bypass the guard
    // and fire concurrent requests that later create duplicate destination markers.
    if (routeFetchInFlightRef.current) return;

    if (!statusChanged && routePolylineRef.current) {
      if (lastRouteOriginRef.current && haversineM(driverPosition, lastRouteOriginRef.current) < 100) return;
    }

    lastRouteKeyRef.current = routeKey;
    lastRouteOriginRef.current = driverPosition;

    if (!destination) {
      if (routePolylineRef.current) { routePolylineRef.current.setMap(null); routePolylineRef.current = null; }
      if (destinationMarkerRef.current) { destinationMarkerRef.current.map = null; destinationMarkerRef.current = null; }
      routePathRef.current = [];
      return;
    }
    if (destinationMarkerRef.current) { destinationMarkerRef.current.map = null; destinationMarkerRef.current = null; }

    const fetchingForKey = routeKey;
    const capturedPin = destinationPin;
    routeFetchInFlightRef.current = true;
    new google.maps.DirectionsService().route(
      { origin: driverPosition, destination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        routeFetchInFlightRef.current = false;
        // Discard stale callbacks — rideStatus changed since this request was fired
        if (fetchingForKey !== lastRouteKeyRef.current) return;
        if (status !== "OK" || !mapInstanceRef.current) return;

        // Decode detailed step-by-step path (much finer than overview_path)
        const path = [];
        result.routes[0]?.legs?.forEach(leg => {
          leg.steps.forEach(step => {
            step.path.forEach(p => path.push({ lat: p.lat(), lng: p.lng() }));
          });
        });
        routePathRef.current = path;

        // Create or update the manual Polyline
        if (routePolylineRef.current) {
          routePolylineRef.current.setPath(path);
        } else {
          routePolylineRef.current = new google.maps.Polyline({
            path,
            map: mapInstanceRef.current,
            strokeColor: "#17BEBB",
            strokeWeight: 5,
            strokeOpacity: 0.85,
            clickable: false,
          });
        }

        // Use road-snapped endLatLng only for pickup proximity gate
        const legs = result.routes[0]?.legs;
        const endLatLng = legs?.[legs.length - 1]?.end_location;
        if (endLatLng && rideStatusRef.current === "DRIVER_ASSIGNED") {
          pickupCoordsRef.current = { lat: endLatLng.lat(), lng: endLatLng.lng() };
        }

        // Destination pin — place at exact ride coords, not road-snapped endLatLng
        if (destinationMarkerRef.current) { destinationMarkerRef.current.map = null; destinationMarkerRef.current = null; }
        const pinPos = capturedPin || (endLatLng ? { lat: endLatLng.lat(), lng: endLatLng.lng() } : null);
        if (pinPos) {
          const pinEl = document.createElement("div");
          pinEl.style.cssText = "width:14px;height:14px;border-radius:50%;background:#EF4444;border:2px solid #fff;box-shadow:0 0 0 3px rgba(239,68,68,0.3)";
          destinationMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current, position: pinPos, content: pinEl,
          });
        }
      }
    );
  }, [rideStatus, poolPickupStage, driverPosition, mapReady, pickupAddress, dropoffAddress, pickupCoords, dropoffCoords, isPooled, sp]);

  useEffect(() => {
    if (!incomingRide?.status) return;
    if (incomingRide?.rideId && String(incomingRide.rideId) !== String(rideId)) return;
    setRideStatus(incomingRide.status);
  }, [incomingRide?.rideId, incomingRide?.status, rideId]);

  useEffect(() => {
    if (rideStatus !== "ARRIVED") { setArrivedElapsedSec(0); return; }
    const t = setInterval(() => setArrivedElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rideStatus]);

  const openNavigation = (address) => {
    if (!address) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank");
  };

  const handleArrivedAtPickup = async () => {
    if (!rideId || rideStatus !== "DRIVER_ASSIGNED" || arriving) return;
    setArriving(true);
    try {
      await api.post(`/rides/${rideId}/status`, { status: "ARRIVED" });
      setRideStatus("ARRIVED");
      const stage = isPooled ? 1 : null;
      setPoolPickupStage(stage);
      persistActiveTrip({ ...request, status: "ARRIVED", poolPickupStage: stage });
    } catch {
      setArriving(false);
    }
  };

  const handlePoolStage = async (action) => {
    if (poolStageLoading) return;
    setPoolStageLoading(true);
    try {
      const res = await api.post(`/rides/${rideId}/pool-stage`, { action });
      const newStage = res?.data?.data?.stage ?? null;
      setPoolPickupStage(newStage);
      if (action === "board_secondary") setAllAboard(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not advance stage. Try again.");
    } finally {
      setPoolStageLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!rideId || rideStatus !== "ARRIVED" || startingTrip) return;
    if (isPooled && !allAboard) {
      toast.info("Complete the sequential pickup before starting the trip.");
      return;
    }
    setStartingTrip(true);
    try {
      await api.post(`/rides/${rideId}/status`, { status: "ON_TRIP" });
      setRideStatus("ON_TRIP");
      setPoolPickupStage(null);
      persistActiveTrip({ ...request, status: "ON_TRIP", poolPickupStage: null });
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
      localStorage.removeItem("activeDriverTrip");
      setDriverMode(DRIVER_MODES.ONLINE_IDLE);
      setTimeout(() => {
        navigate("/driver/trip-summary", { replace: true, state: { trip: tripSummaryPayload } });
      }, 800);
    } catch {
      toast.error("Failed to complete trip");
      setEndingTrip(false);
    }
  };

  const handleCancelRide = async () => {
    if (!driverCancelReason || cancelling) return;
    setCancelling(true);
    try {
      await api.post(`/rides/${rideId}/status`, { status: "CANCELLED", reason: driverCancelReason });
      toast.info("Ride cancelled.");
    } catch {
      toast.error("Could not cancel ride. Please try again.");
      setCancelling(false);
      return;
    }
    localStorage.removeItem("activeDriverTrip");
    setDriverMode(DRIVER_MODES.ONLINE_IDLE);
    navigate("/driver/home", { replace: true });
  };

  const handleNoShow = async () => {
    try {
      await api.post(`/rides/${rideId}/no-show`);
      toast.info("No-show recorded. Ride cancelled.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not record no-show.");
      setShowNoShowConfirm(false);
      return;
    }
    localStorage.removeItem("activeDriverTrip");
    setDriverMode(DRIVER_MODES.ONLINE_IDLE);
    navigate("/driver/home", { replace: true });
  };

  const handleReportExtra = async () => {
    if (reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await api.post(`/rides/${rideId}/report-extra`, { details: "Extra unbooked passenger observed" });
      toast.success("Report submitted. Thank you for keeping Townwize safe.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not submit report.");
    } finally {
      setReportSubmitting(false);
      setShowReportConfirm(false);
    }
  };

  const handleReportCoRider = async () => {
    if (coRiderReportSubmitting || !sp) return;
    setCoRiderReportSubmitting(true);
    try {
      await api.post(`/rides/${rideId}/report-extra`, {
        details: "Co-rider behaviour report",
        reportedUserId: sp.userId,
      });
      toast.success("Co-rider report submitted.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not submit report.");
    } finally {
      setCoRiderReportSubmitting(false);
      setShowCoRiderReportConfirm(false);
    }
  };

  const getInitials = (name) => {
    const parts = String(name || "?").trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0][0] || "?").toUpperCase();
  };

  const AVATAR_COLORS = ["bg-violet-500", "bg-blue-500", "bg-teal-500", "bg-emerald-500", "bg-orange-500"];
  const getAvatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  if (!hasRequest) return null;

  // ── Status label ──────────────────────────────────────────────────────
  const poolStatusLabel = () => {
    if (!isPooled || rideStatus !== "ARRIVED") return null;
    if (poolPickupStage === 1) return `At primary pickup — awaiting boarding`;
    if (poolPickupStage === 2) return `En route to ${sp?.name || "co-passenger"}'s pickup`;
    if (poolPickupStage === 3) return `At ${sp?.name || "co-passenger"}'s pickup`;
    return null;
  };

  const statusLabel =
    (rideStatus === "DRIVER_ASSIGNED" && "En route to pickup") ||
    (rideStatus === "ARRIVED" && (poolStatusLabel() || "Arrived at pickup")) ||
    (rideStatus === "ON_TRIP" && "On trip") ||
    "";

  // ── Passenger manifest (shown during ARRIVED / ON_TRIP for pooled rides) ──
  const passengerManifest = isPooled && ["ARRIVED", "ON_TRIP"].includes(rideStatus) ? (
    <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3 space-y-3">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Passenger Manifest</p>

      {/* Primary passenger */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-townwize-primary flex items-center justify-center text-xs font-bold text-white">
          P1
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Primary Towner</p>
          <p className="text-xs text-green-500 font-medium">Seat 1 · Boarded ✓</p>
        </div>
      </div>

      {/* Co-rider */}
      {sp && (
        <>
          <div className="h-px bg-blue-100 dark:bg-blue-800" />
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(sp.name)}`}>
              {getInitials(sp.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{sp.name}</p>
              <p className={`text-xs font-medium ${sp.boarded ? "text-green-500" : "text-yellow-500"}`}>
                Seat 2 · {sp.boarded ? "Boarded ✓" : "Not yet boarded"}
              </p>
            </div>
            <button
              onClick={() => setShowCoRiderReportConfirm(true)}
              className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              Report
            </button>
          </div>

          {/* Co-rider report confirmation */}
          {showCoRiderReportConfirm && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 space-y-2">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">Report {sp.name}?</p>
              <p className="text-xs text-red-700 dark:text-red-400">
                Use this only for genuine misconduct or safety concerns. Repeated false reports may affect your account.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCoRiderReportConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportCoRider}
                  disabled={coRiderReportSubmitting}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white disabled:opacity-60"
                >
                  {coRiderReportSubmitting ? "Reporting…" : "Confirm Report"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  // ── Report extra passenger ─────────────────────────────────────────────
  const reportExtraSection = isPooled && ["ARRIVED", "ON_TRIP"].includes(rideStatus) ? (
    showReportConfirm ? (
      <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-3 space-y-2">
        <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">Report unbooked extra passenger?</p>
        <p className="text-xs text-orange-700 dark:text-orange-400">
          Only report if you see a passenger not in the manifest. 3 cumulative reports auto-flag the account.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowReportConfirm(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            Back
          </button>
          <button onClick={handleReportExtra} disabled={reportSubmitting} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-orange-600 text-white disabled:opacity-60">
            {reportSubmitting ? "Reporting…" : "Confirm Report"}
          </button>
        </div>
      </div>
    ) : (
      <button
        onClick={() => setShowReportConfirm(true)}
        className="w-full py-2 rounded-xl text-xs font-medium text-orange-500 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
      >
        Report Extra Passenger
      </button>
    )
  ) : null;

  // ── Sequential pickup buttons (during ARRIVED for pooled rides) ────────
  const poolPickupButtons = isPooled && rideStatus === "ARRIVED" ? (
    <div className="space-y-2">
      {poolPickupStage === 1 && (
        <>
          <div className="rounded-lg bg-townwize-primary/10 dark:bg-townwize-primary/20 px-3 py-2 text-xs text-townwize-primary dark:text-townwize-accent">
            At primary pickup — confirm when passenger 1 boards.
          </div>
          <button
            onClick={() => handlePoolStage("board_primary")}
            disabled={poolStageLoading}
            className={`w-full rounded-xl py-3 font-semibold ${poolStageLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 text-white"}`}
          >
            {poolStageLoading ? "Processing…" : "Confirm Passenger 1 Boarded"}
          </button>
        </>
      )}
      {poolPickupStage === 2 && sp && (
        <>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            Navigate to {sp.name}&apos;s pickup: {sp.pickupAddress || "co-passenger pickup"}
          </div>
          <button
            onClick={() => openNavigation(sp.pickupAddress)}
            className="w-full rounded-xl py-3 font-semibold bg-townwize-primary text-white"
          >
            Navigate to {sp.name}
          </button>
          <button
            onClick={() => handlePoolStage("arrived_secondary")}
            disabled={poolStageLoading}
            className={`w-full rounded-xl py-3 font-semibold ${poolStageLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 text-white"}`}
          >
            {poolStageLoading ? "Processing…" : `Arrived at ${sp.name}'s Pickup`}
          </button>
        </>
      )}
      {poolPickupStage === 3 && sp && (
        <>
          <div className="rounded-lg bg-townwize-primary/10 dark:bg-townwize-primary/20 px-3 py-2 text-xs text-townwize-primary dark:text-townwize-accent">
            At {sp.name}&apos;s pickup — confirm when {sp.name} boards.
          </div>
          <button
            onClick={() => handlePoolStage("board_secondary")}
            disabled={poolStageLoading}
            className={`w-full rounded-xl py-3 font-semibold ${poolStageLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 text-white"}`}
          >
            {poolStageLoading ? "Processing…" : `Confirm ${sp.name} Boarded`}
          </button>
        </>
      )}
      {poolPickupStage === null && allAboard && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-300">
          All passengers aboard — ready to start.
        </div>
      )}
    </div>
  ) : null;

  // ── Dual dropoff info during ON_TRIP (sequential stages) ────────────────
  const dualDropoffInfo = isPooled && rideStatus === "ON_TRIP" && sp ? (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-3 text-sm">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Drop-off Stops</p>

      {/* Stop 1 */}
      <div className={`flex items-start gap-2 rounded-lg p-2 ${dropoffStage === 1 ? "bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800" : "opacity-50"}`}>
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dropoffStage === 1 ? "bg-red-500" : "bg-green-500"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">Stop 1 — Primary Towner {dropoffStage === 2 ? "✓" : ""}</p>
          <p className="font-medium leading-snug text-gray-800 dark:text-gray-100">{dropoffAddress}</p>
        </div>
      </div>

      {/* Stop 2 */}
      <div className={`flex items-start gap-2 rounded-lg p-2 ${dropoffStage === 2 ? "bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-200 dark:ring-orange-800" : "opacity-50"}`}>
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dropoffStage === 2 ? "bg-orange-500" : "bg-gray-300"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">Stop 2 — {sp.name}</p>
          <p className="font-medium leading-snug text-gray-800 dark:text-gray-100">{sp.dropoffAddress || "Co-passenger dropoff"}</p>
        </div>
      </div>

      {dropoffStage === 1 && (
        <div className="flex gap-2">
          <button
            onClick={() => openNavigation(dropoffAddress)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            Navigate Stop 1
          </button>
          <button
            onClick={() => { setDropoffStage(2); openNavigation(sp.dropoffAddress || dropoffAddress); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-townwize-primary text-white"
          >
            Stop 1 Done →
          </button>
        </div>
      )}

      {dropoffStage === 2 && (
        <button
          onClick={() => openNavigation(sp.dropoffAddress || dropoffAddress)}
          className="w-full py-2 rounded-xl text-xs font-semibold bg-townwize-primary text-white"
        >
          Navigate to Stop 2
        </button>
      )}
    </div>
  ) : null;

  const gpsWarningBanner = rideStatus === "ON_TRIP" && gpsStale ? (
    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      📡 GPS signal weak — distance paused until signal is restored.
    </div>
  ) : null;

  const connectionWarningBanner = socketDisconnected ? (
    <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
      ⚡ Reconnecting to server…
    </div>
  ) : null;

  // ── Standard action buttons ────────────────────────────────────────────
  const actionButtons = (
    <div className="flex flex-wrap gap-3">
      {rideStatus === "DRIVER_ASSIGNED" && (
        <>
          <button
            onClick={() => openNavigation(pickupAddress)}
            className="min-w-[180px] flex-1 rounded-xl bg-townwize-primary py-3 font-semibold text-white"
          >
            Navigate to Pickup
          </button>
          <button
            onClick={handleArrivedAtPickup}
            disabled={arriving || !nearPickup}
            className={`flex-1 rounded-xl py-3 font-semibold ${(arriving || !nearPickup) ? "cursor-not-allowed bg-gray-400 text-gray-200" : "bg-green-600 text-white"}`}
          >
            {arriving ? "Arriving…" : nearPickup ? "Arrived" : "Get closer to pickup"}
          </button>
        </>
      )}
      {rideStatus === "ARRIVED" && (
        <>
          {poolPickupButtons}
          {(!isPooled || allAboard) && (
            <button
              onClick={handleStartTrip}
              disabled={startingTrip}
              className={`w-full rounded-xl py-3 font-semibold ${startingTrip ? "cursor-not-allowed bg-gray-400" : "bg-townwize-primary text-white"}`}
            >
              Start Trip
            </button>
          )}
        </>
      )}
      {rideStatus === "ON_TRIP" && (!isPooled || dropoffStage === 2) && (
        <>
          <SlideToEndTrip
            onConfirm={() => {
              if (nearDropoff) {
                handleCompleteTrip();
              } else {
                setEarlyEndConfirm(true);
              }
            }}
            disabled={endingTrip}
          />
          {!nearDropoff && distToDropoffKm !== null && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400 -mt-1">
              {distToDropoffKm.toFixed(1)} km from booked destination
            </p>
          )}
          {earlyEndConfirm && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 pb-8 px-4">
              <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-xl">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">End trip here?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  You are{" "}
                  {distToDropoffKm !== null ? `${distToDropoffKm.toFixed(1)} km` : "some distance"}{" "}
                  from the booked destination. The passenger will only be charged for the actual distance traveled.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 py-3 font-semibold text-gray-700 dark:text-gray-300"
                    onClick={() => setEarlyEndConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 rounded-xl bg-townwize-primary py-3 font-semibold text-white"
                    onClick={() => { setEarlyEndConfirm(false); handleCompleteTrip(); }}
                  >
                    End Trip Here
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {passengerPhone ? (
        <a
          href={`tel:${passengerPhone}`}
          className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0"
          title={`Call ${passengerName || "Passenger"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.57 1 1 0 01-.25 1.01l-2.2 2.21z"/>
          </svg>
        </a>
      ) : null}
    </div>
  );

  const noShowEligible = rideStatus === "ARRIVED" && arrivedElapsedSec >= 360;
  const noShowRemainingSec = rideStatus === "ARRIVED" ? Math.max(0, 360 - arrivedElapsedSec) : 0;

  const cancelSection = (
    <div className="space-y-2">
      {rideStatus === "ARRIVED" && (
        noShowEligible ? (
          showNoShowConfirm ? (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-3 space-y-2">
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">Report passenger no-show?</p>
              <p className="text-xs text-orange-700 dark:text-orange-400">A 120 PKR no-show fee will be recorded. The ride will be cancelled.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowNoShowConfirm(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Back</button>
                <button onClick={handleNoShow} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-orange-600 text-white">Confirm No-Show</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNoShowConfirm(true)} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400">
              Passenger No-Show
            </button>
          )
        ) : (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            No-show option available in {Math.ceil(noShowRemainingSec / 60)} min {noShowRemainingSec % 60}s
          </p>
        )
      )}

      {!showNoShowConfirm && (
        rideStatus === "ON_TRIP" ? (
          <button
            onClick={() => navigate("/driver/support", { state: { linkedRideId: rideId } })}
            className="w-full py-2 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
          >
            Report Issue
          </button>
        ) : showCancelModal ? (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Why are you cancelling?</p>
            <select
              value={driverCancelReason}
              onChange={(e) => setDriverCancelReason(e.target.value)}
              disabled={cancelling}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none"
            >
              <option value="">Select a reason…</option>
              <option>Passenger not reachable</option>
              <option>Incorrect pickup location</option>
              <option>Vehicle breakdown / issue</option>
              <option>Personal emergency</option>
              <option>Passenger behaviour issue</option>
              <option>Other</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => { setShowCancelModal(false); setDriverCancelReason(""); }} disabled={cancelling} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-60">Back</button>
              <button onClick={handleCancelRide} disabled={cancelling || !driverCancelReason} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white disabled:opacity-50">
                {cancelling ? "Cancelling…" : "Cancel Ride"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCancelModal(true)} className="w-full py-2 rounded-xl text-xs font-medium text-red-500 dark:text-red-400 hover:underline">
            Cancel ride
          </button>
        )
      )}
    </div>
  );

  // ─── Mobile (Capacitor) ───────────────────────────────────────────────────
  if (isNative()) {
    return (
      <div className="fixed inset-0 bg-gray-900">
        <div
          className="absolute top-0 start-0 end-0 z-10 border-b border-gray-200 bg-white shadow-sm dark:bg-townwize-primaryDark px-4 pb-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Active Trip</h1>
            {isPooled && <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">RideTogether</span>}
          </div>
          {passengerName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Passenger: <span className="font-semibold text-gray-700 dark:text-gray-200">{passengerName}</span></p>
          )}
          {statusLabel && <span className="text-sm text-gray-500">{statusLabel}</span>}
        </div>

        <div ref={mapRef} className="absolute inset-0 top-[76px] z-0" />

        <div
          className="absolute bottom-0 start-0 end-0 z-50 rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:bg-townwize-primaryDark px-4 pt-4"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3" />
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pb-2">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-townwize-accent" />
                <p className="font-medium truncate min-w-0">{pickupAddress}</p>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-red-500" />
                <p className="text-gray-500 truncate min-w-0">{dropoffAddress}</p>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>{rideType}</span>
                <span className="font-semibold text-townwize-primary dark:text-white">{fare} PKR</span>
              </div>
            </div>
            {passengerManifest}
            {dualDropoffInfo}
            {connectionWarningBanner}
            {gpsWarningBanner}
            {actionButtons}
            <div className="space-y-2">
              {reportExtraSection}
              {cancelSection}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Web ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-[calc(100vh-120px)] bg-gray-50">
      <div className="z-10 border-b border-gray-200 bg-white p-4 shadow-sm dark:bg-townwize-primaryDark flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">Active Trip</h1>
          {passengerName && <p className="text-sm text-gray-500 dark:text-gray-400">Passenger: <span className="font-semibold text-gray-700 dark:text-gray-200">{passengerName}</span></p>}
          {statusLabel && <span className="text-sm text-gray-500">{statusLabel}</span>}
        </div>
        {isPooled && <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">RideTogether</span>}
      </div>

      <div ref={mapRef} className="absolute inset-0 top-[72px] z-0" />

      <div className="pointer-events-auto absolute bottom-0 z-50 w-full rounded-t-2xl border-t border-gray-200 bg-white p-4 shadow-2xl dark:bg-townwize-primaryDark max-h-[65vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="grid gap-2 text-sm md:grid-cols-2 flex-1">
            {passengerName && (
              <p className="md:col-span-2"><strong>Passenger:</strong> {passengerName}</p>
            )}
            <p className="truncate"><strong>Pickup:</strong> {pickupAddress}</p>
            <p className="truncate"><strong>Dropoff:</strong> {dropoffAddress}</p>
            <p><strong>Ride Type:</strong> {rideType}</p>
            <p><strong>Fare:</strong> {fare} PKR</p>
          </div>
          {passengerPhone && (
            <a
              href={`tel:${passengerPhone}`}
              className="flex items-center justify-center h-11 w-11 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0"
              title={`Call ${passengerName || "Passenger"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.57 1 1 0 01-.25 1.01l-2.2 2.21z"/>
              </svg>
            </a>
          )}
        </div>
        <div className="mt-3 space-y-3">
          {passengerManifest}
          {dualDropoffInfo}
          {connectionWarningBanner}
          {gpsWarningBanner}
          {actionButtons}
          <div className="space-y-2">
            {reportExtraSection}
            {cancelSection}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverLiveTracking;
