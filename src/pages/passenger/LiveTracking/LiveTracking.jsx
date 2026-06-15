/* global google */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";
import api, { updateRideStatus } from "../../../services/api";
import { useRideSocket } from "../../../hooks/useRideSocket";
import { useParams, useNavigate } from "react-router-dom";
import { isNative } from "../../../utils/platform";
import { App } from "@capacitor/app";

const getPassengerRideStage = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "REQUESTED") {
    return {
      title: "Finding your Wizer",
      description: "We are looking for nearby drivers for your ride.",
      tone: "searching",
    };
  }
  if (normalized === "DRIVER_ASSIGNED") {
    return {
      title: "Driver matched",
      description: "Your Wizer accepted the ride and is heading to pickup.",
      tone: "matched",
    };
  }
  if (normalized === "EN_ROUTE") {
    return {
      title: "Driver is on the way",
      description: "Your Wizer is navigating to your pickup point.",
      tone: "matched",
    };
  }
  if (normalized === "ARRIVED") {
    return {
      title: "Driver has arrived",
      description: "Meet your Wizer at the pickup point.",
      tone: "arrived",
    };
  }
  if (normalized === "ON_TRIP") {
    return {
      title: "Trip in progress",
      description: "You are on your way to the dropoff.",
      tone: "trip",
    };
  }
  return {
    title: "Ride status",
    description: "We are updating your trip information.",
    tone: "neutral",
  };
};

const LiveTracking = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();

  //const navigate = useNavigate();

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const routeRendererRef = useRef(null);

  const [ride, setRide] = useState(null);
  const rideRef = useRef(null);
  const [fetchError, setFetchError] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const [availability, setAvailability] = useState({
    loading: false,
    matchingDrivers: null,
    nearestDistanceKm: null,
    estimatedPickupMinutes: null,
    message: "",
  });

  const lastRouteStatusRef = useRef(null);
  const lastRouteOriginRef = useRef(null); // lat/lng used for last Directions call during ON_TRIP
  const hasFitBoundsRef = useRef(false);
  const altRoutesRef = useRef([]);
  const tripZoomAppliedRef = useRef(false); // set exactly once when ON_TRIP begins

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [tripBlocked, setTripBlocked] = useState(false);

  // ─────────────────────────────────────────────
  // Keep rideRef in sync with ride state
  // ─────────────────────────────────────────────
  useEffect(() => {
    rideRef.current = ride;
  }, [ride]);


  // ─────────────────────────────────────────────
  // Fetch active ride (authoritative backend state)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) return;

    let cancelled = false;

    const fetchRide = () => {
      api
        .get(`/rides/${rideId}`)
        .then((res) => {
          if (!cancelled && res?.data?.data) {
            // Preserve driver GPS coords — they live in the in-memory registry,
            // not in the DB, so the poll response never includes them.
            setRide((prev) => {
              const fresh = res.data.data;
              return {
                ...fresh,
                driver: {
                  ...(fresh.driver || {}),
                  ...(prev?.driver?.lat != null
                    ? { lat: prev.driver.lat, lng: prev.driver.lng }
                    : {}),
                },
              };
            });
            setFetchError(false);
          }
        })
        .catch((err) => {
          if (err?.response?.status === 401) return;
          if (!cancelled) setFetchError(true);
        });
    };

    fetchRide();
    const intervalId = window.setInterval(fetchRide, 5000);
    window.addEventListener("focus", fetchRide);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", fetchRide);
    };
  }, [rideId]);

  useEffect(() => {
    if (!ride || String(ride.status).toUpperCase() !== "REQUESTED") return;
    if (!ride.pickup?.lat || !ride.pickup?.lng) return;

    let cancelled = false;

    const fetchAvailability = () => {
      setAvailability((prev) => ({ ...prev, loading: true, message: "" }));
      api
        .post("/rides/availability", {
          pickupCoords: {
            lat: ride.pickup.lat,
            lng: ride.pickup.lng,
          },
          carType: ride.carType || "economy",
        })
        .then((res) => {
          if (cancelled) return;
          const data = res?.data?.data || {};
          setAvailability({
            loading: false,
            matchingDrivers: Number(data.matchingDrivers ?? 0),
            nearestDistanceKm: data.nearestDistanceKm ?? null,
            estimatedPickupMinutes: data.estimatedPickupMinutes ?? null,
            message: "",
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setAvailability({
            loading: false,
            matchingDrivers: null,
            nearestDistanceKm: null,
            estimatedPickupMinutes: null,
            message:
              err?.response?.data?.error?.message ||
              err?.response?.data?.message ||
              "Driver availability is being refreshed.",
          });
        });
    };

    fetchAvailability();
    const intervalId = window.setInterval(fetchAvailability, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [ride?.status, ride?.pickup?.lat, ride?.pickup?.lng, ride?.carType]);


  // ─────────────────────────────────────────────
  // Socket updates (status + driver position)
  // ─────────────────────────────────────────────
  useRideSocket({
    joinRideId: rideId,

    onRideUpdated: (payload) => {
      setRide((prev) => {
        if (!prev) return prev;
        if (String(payload?.rideId) !== String(rideId)) return prev;

        return {
          ...prev,
          status: payload.status ?? prev.status,
          driverId: payload.driverId ?? prev.driverId,
        };
      });
    },

    onRideAccepted: (payload) => {
      setRide((prev) => {
        if (!prev) return prev;
        if (String(payload?.rideId) !== String(rideId)) return prev;

        return {
          ...prev,
          status: payload.status ?? "DRIVER_ASSIGNED",
          driverId: payload.driverId ?? prev.driverId,
        };
      });
    },

    onDriverLocation: ({ lat, lng, rideId: locationRideId }) => {
      if (locationRideId && String(locationRideId) !== String(rideId)) return;

      setRide((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          driver: {
            ...(prev.driver || {}),
            lat,
            lng,
          },
        };
      });
    },
  });

  // ─────────────────────────────────────────────
  // Initialize map ONCE (pickup-centered)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!ride || mapInstanceRef.current || !mapRef.current) return;

    let mounted = true;

    loadGoogleMaps()
      .then(async () => {
        if (!mounted || mapInstanceRef.current) return;

        await google.maps.importLibrary("maps");
        await google.maps.importLibrary("marker");

        const pickupLatLng = {
          lat: ride.pickup.lat,
          lng: ride.pickup.lng,
        };

        const map = new google.maps.Map(mapRef.current, {
          center: pickupLatLng,
          zoom: 15,
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
          disableDefaultUI: true,
        });

        mapInstanceRef.current = map;

        // Force Google Maps to re-measure the container — on Android WebView the
        // dimensions of a fixed/absolute div may not be committed to layout yet
        // when the Maps constructor runs, causing a blank grey tile area.
        if (isNative()) {
          setTimeout(() => {
            google.maps.event.trigger(map, "resize");
            map.setCenter(pickupLatLng);
          }, 150);
        }

        // Pickup marker
        const pickupEl = document.createElement("div");
        pickupEl.style.width = "14px";
        pickupEl.style.height = "14px";
        pickupEl.style.borderRadius = "50%";
        pickupEl.style.background = "#6CBEED";
        pickupEl.style.border = "2px solid #000";

        pickupMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: pickupLatLng,
          content: pickupEl,
        });

        // Dropoff marker
        const dropoffEl = document.createElement("div");
        dropoffEl.style.width = "14px";
        dropoffEl.style.height = "14px";
        dropoffEl.style.borderRadius = "50%";
        dropoffEl.style.background = "#D50000";
        dropoffEl.style.border = "2px solid #000";

        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: {
            lat: ride.dropoff.lat,
            lng: ride.dropoff.lng,
          },
          content: dropoffEl,
        });
      })
      .catch(() => {
        if (mounted) setMapsError(true);
      });

    return () => {
      mounted = false;
    };
  }, [ride]);


  // ─────────────────────────────────────────────
  // Status-driven map behavior
  // ─────────────────────────────────────────────

  const pickupLat = ride?.pickup?.lat;
  const pickupLng = ride?.pickup?.lng;
  const dropoffLat = ride?.dropoff?.lat;
  const dropoffLng = ride?.dropoff?.lng;


  const rideStatus = ride?.status;
  const driverLat = ride?.driver?.lat;
  const driverLng = ride?.driver?.lng;

  // Haversine distance in metres between two {lat,lng} points
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

  // Effect A: draws/reroutes — fires on status change or driver GPS update
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;

    const statusNeedsRoute = rideStatus === "DRIVER_ASSIGNED" || rideStatus === "ON_TRIP";

    // Clear alt route polylines
    altRoutesRef.current.forEach((p) => p.setMap(null));
    altRoutesRef.current = [];

    if (!statusNeedsRoute) {
      if (routeRendererRef.current) {
        routeRendererRef.current.setMap(null);
        routeRendererRef.current = null;
      }
      lastRouteStatusRef.current = null;
      lastRouteOriginRef.current = null;
      tripZoomAppliedRef.current = false;
      return;
    }

    const currentRide = rideRef.current;
    const dLat = currentRide?.driver?.lat;
    const dLng = currentRide?.driver?.lng;

    let origin = null;
    let destination = null;

    if (rideStatus === "DRIVER_ASSIGNED") {
      // Wait for real GPS — avoids locking in a pickup→pickup zero-distance route
      if (dLat && dLng) {
        origin      = { lat: dLat, lng: dLng };
        destination = currentRide?.pickup?.lat
          ? { lat: currentRide.pickup.lat, lng: currentRide.pickup.lng }
          : null;
      }
    } else if (rideStatus === "ON_TRIP") {
      // Only use a confirmed driver GPS as origin — no fallback to pickup.
      // If GPS is momentarily absent (e.g., right after a poll resets state),
      // we return early below and keep the existing route unchanged.
      if (dLat && dLng) {
        origin = { lat: dLat, lng: dLng };
      }
      destination = currentRide?.dropoff?.lat
        ? { lat: currentRide.dropoff.lat, lng: currentRide.dropoff.lng }
        : null;
    }

    if (!origin || !destination) return;

    const statusChanged = lastRouteStatusRef.current !== rideStatus;

    // When trip starts: zoom in, center on driver, hide the static pickup dot
    if (statusChanged && rideStatus === "ON_TRIP" && mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(14);
      mapInstanceRef.current.panTo(origin);
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.map = null; // remove from map — pickup is now behind us
      }
    }

    if (!statusChanged) {
      // Reroute only if driver has moved >150 m from the last drawn origin —
      // applies to both DRIVER_ASSIGNED and ON_TRIP to keep route in sync
      if (routeRendererRef.current) {
        if (lastRouteOriginRef.current && haversineM(origin, lastRouteOriginRef.current) < 150) return;
      }
    }

    lastRouteStatusRef.current = rideStatus;
    lastRouteOriginRef.current = origin;

    // Capture snapshot of origin for the async callback so stale closures don't
    // accidentally clear a newer renderer that replaced this one mid-flight
    const capturedOrigin = origin;

    new google.maps.DirectionsService().route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: rideStatus !== "ON_TRIP",
      },
      (result, reqStatus) => {
        if (reqStatus !== "OK") return;
        // Ignore stale response if driver has already moved further
        if (lastRouteOriginRef.current !== capturedOrigin) return;

        // Swap renderer only when the new result is ready — no visual flicker
        if (routeRendererRef.current) {
          routeRendererRef.current.setMap(null);
        }
        const renderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          // During ON_TRIP let Effect B control the viewport via panTo/setZoom.
          // Without this the renderer resets the map to fit the full route on
          // every reroute call, overriding our zoom-14 navigation view.
          preserveViewport: rideStatus === "ON_TRIP",
        });
        renderer.setMap(map);
        renderer.setDirections(result);
        routeRendererRef.current = renderer;

        // After setDirections the renderer may shift the viewport even with
        // preserveViewport:true on some browsers. Force navigation view again.
        if (rideStatus === "ON_TRIP") {
          map.setZoom(14);
          map.panTo(capturedOrigin);
        }

        // Alt routes only during DRIVER_ASSIGNED (not needed once trip is moving)
        if (rideStatus !== "ON_TRIP") {
          for (let i = 1; i < result.routes.length; i++) {
            const alt = new google.maps.Polyline({
              path: result.routes[i].overview_path,
              map,
              strokeColor: "#93C5FD",
              strokeWeight: 3,
              strokeOpacity: 0.7,
            });
            altRoutesRef.current.push(alt);
          }
        }
      }
    );
  }, [rideStatus, driverLat, driverLng]);

  // Effect B: location-driven — updates marker position only (no API call)
  useEffect(() => {
    if (!mapInstanceRef.current || !driverLat || !driverLng || !window.google?.maps) return;
    const map = mapInstanceRef.current;
    const pos = { lat: driverLat, lng: driverLng };

    if (!driverMarkerRef.current) {
      const driverEl = document.createElement("div");
      driverEl.style.cssText = [
        "width:20px", "height:20px", "border-radius:50%",
        "background:#17BEBB",          // townwize-accent teal
        "border:3px solid #fff",
        "box-shadow:0 0 0 3px #17BEBB,0 2px 6px rgba(0,0,0,0.4)",
      ].join(";");
      driverMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: pos,
        content: driverEl,
      });
    } else {
      driverMarkerRef.current.position = pos;
    }

    const currentStatus = rideRef.current?.status;

    if (currentStatus === "ON_TRIP") {
      // Set navigation zoom exactly once when the first ON_TRIP GPS arrives.
      // Using a ref (not getZoom()) avoids the race where the map is at zoom
      // 15 from init (so the < 13 guard never fires) or where the renderer's
      // async setDirections call resets the viewport before we can check.
      if (!tripZoomAppliedRef.current) {
        map.setZoom(14);
        tripZoomAppliedRef.current = true;
      }
      map.panTo(pos);
    } else if (!hasFitBoundsRef.current) {
      // Before trip starts: fit bounds once to show driver + pickup + dropoff
      const currentRide = rideRef.current;
      const pickup  = currentRide?.pickup;
      const dropoff = currentRide?.dropoff;
      if (pickup?.lat && pickup?.lng && dropoff?.lat && dropoff?.lng) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: pickup.lat, lng: pickup.lng });
        bounds.extend({ lat: dropoff.lat, lng: dropoff.lng });
        bounds.extend(pos);
        map.fitBounds(bounds, 80);
        hasFitBoundsRef.current = true;
      }
    }
  }, [driverLat, driverLng]); // Fires on every GPS update — only moves marker, no API calls
  // ─────────────────────────────────────────────
  // STEP-4.5 — Clear active passenger ride on COMPLETION
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!ride?.status) return;

    if (ride.status === "COMPLETED") {
      localStorage.removeItem("activePassengerRideId");
      navigate(`/passenger/trip-receipt/${rideId}`, { replace: true });
      return;
    }

    if (ride.status === "CANCELLED") {
      localStorage.removeItem("activePassengerRideId");
      navigate("/passenger/home", { replace: true });
    }
  }, [ride?.status, rideId, navigate]);

  // ─────────────────────────────────────────────
  // BACK BUTTON GUARD
  // Block the hardware/browser back button while a ride is active.
  // historyAction=POP = back pressed; PUSH/REPLACE (our own navigates) are not blocked.
  // ─────────────────────────────────────────────
  const ACTIVE_STATUSES = ["REQUESTED", "DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"];

  // ── Native (Android/Capacitor) ──────────────────────────────────────────────
  // App.addListener intercepts the hardware back button at the Capacitor bridge
  // level — before the WebView ever checks canGoBack(). This is the official
  // Capacitor approach; pushState/popstate tricks are unreliable on Android WebView
  // because same-URL pushStates are not always counted by canGoBack().
  useEffect(() => {
    if (!isNative()) return;
    let handle;
    App.addListener("backButton", () => {
      const status = String(rideRef.current?.status || "").toUpperCase();
      if (["ARRIVED", "ON_TRIP"].includes(status)) {
        setTripBlocked(true);
      } else if (ACTIVE_STATUSES.includes(status)) {
        setConfirmCancel(true);
      }
      // COMPLETED/CANCELLED: no block — the status watcher navigates away automatically
    }).then((h) => {
      handle = h;
    });
    return () => {
      handle?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ─────────────────────────────────────────────
  // CANCEL RIDE
  // ─────────────────────────────────────────────
  const CANCELLABLE = ["REQUESTED", "DRIVER_ASSIGNED", "EN_ROUTE"];
  const canCancel = CANCELLABLE.includes(String(ride?.status || "").toUpperCase());

  const handleKeepRide = () => {
    setConfirmCancel(false);
    setTripBlocked(false);
  };

  const handleCancelRide = async () => {
    setCancelling(true);
    try {
      await updateRideStatus(rideId, "CANCELLED");
    } catch (err) {
      console.error("Cancel failed", err);
    }
    localStorage.removeItem("activePassengerRideId");
    navigate("/passenger/home", { replace: true });
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  if (!ride) {
    if (isNative()) {
      // Portal to document.body so position:fixed is relative to the viewport,
      // not an overflow-y:auto ancestor (Android WebView bug).
      return createPortal(
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "#03311C" }}
          className="flex flex-col items-center justify-center"
        >
          <div className="w-14 h-14 border-4 border-townwize-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm mt-4">Loading your ride...</p>
          {fetchError && (
            <p className="text-white/40 text-xs mt-2">Connection issue — retrying…</p>
          )}
        </div>,
        document.body
      );
    }
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-townwize-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stage = getPassengerRideStage(ride.status);
  const isSearching = String(ride.status || "").toUpperCase() === "REQUESTED";

  // ─── Mobile (Capacitor) — full-screen map with floating bottom card ───────
  // Use explicit top/left/width/height instead of CSS `inset` shorthand —
  // the `inset` shorthand has incomplete support in older Android WebView,
  // which causes Google Maps to receive a 0×0 container and render blank.
  if (isNative()) {
    return createPortal(
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "#1a2332" }}
      >
        {/* Map fills the entire screen — explicit width/height for WebView compat */}
        {mapsError ? (
          <div
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            className="flex items-center justify-center bg-gray-900"
          >
            <p className="text-white/50 text-sm text-center px-6">
              Map unavailable. Your ride is still active.
            </p>
          </div>
        ) : (
          <div
            ref={mapRef}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          />
        )}

        {/* Status pill — floats at top, respects safe-area notch */}
        <div
          style={{ position: "absolute", left: 16, right: 16, top: "calc(env(safe-area-inset-top, 0px) + 16px)", zIndex: 10 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2">
              {isSearching ? (
                <span className="h-2.5 w-2.5 rounded-full bg-townwize-primary animate-pulse" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              )}
              <span className="font-bold text-townwize-primary dark:text-white text-sm">
                {stage.title}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-4">
              {stage.description}
            </p>
          </div>
        </div>

        {/* Bottom sheet */}
        <div
          className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-3" />

          <div className="px-5 pt-3 pb-4 space-y-4">
            {/* Route addresses */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-townwize-accent" />
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">
                  {ride.pickup?.address}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
                  {ride.dropoff?.address}
                </p>
              </div>
            </div>

            {/* Fare + ETA */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-townwize-primary dark:text-white">
                {ride.fareEstimate} PKR
              </span>
              {isSearching && availability.estimatedPickupMinutes != null && (
                <span className="text-xs text-gray-500">
                  · ~{availability.estimatedPickupMinutes} min pickup ETA
                </span>
              )}
              {isSearching && availability.matchingDrivers != null && (
                <span className="text-xs text-gray-500">
                  · {availability.matchingDrivers} drivers nearby
                </span>
              )}
            </div>

            {/* Trip-in-progress block (ARRIVED / ON_TRIP back-button guard) */}
            {tripBlocked && (
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  Trip in progress — you cannot go back.
                </p>
                <button
                  onClick={handleKeepRide}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-townwize-primary text-white"
                >
                  Got it
                </button>
              </div>
            )}

            {/* Cancel flow */}
            {!tripBlocked && canCancel && (
              confirmCancel ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-gray-700 dark:text-gray-300">
                    Cancel this ride?
                    {String(ride.status).toUpperCase() !== "REQUESTED" && (
                      <span className="block text-xs text-gray-500 mt-0.5">
                        Your driver will be notified.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleKeepRide}
                      disabled={cancelling}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-60"
                    >
                      Keep Ride
                    </button>
                    <button
                      onClick={handleCancelRide}
                      disabled={cancelling}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white disabled:opacity-60"
                    >
                      {cancelling ? "Cancelling…" : "Yes, Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Cancel Ride
                </button>
              )
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {isSearching ? (
                <span className="h-3 w-3 rounded-full bg-townwize-primary animate-pulse" />
              ) : (
                <span className="h-3 w-3 rounded-full bg-green-500" />
              )}
              <h2 className="text-xl font-bold text-townwize-primary dark:text-townwize-accent">
                {stage.title}
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {stage.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs min-w-full lg:min-w-[360px]">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2">
              <p className="text-gray-500">Status</p>
              <p className="mt-1 font-bold text-townwize-primary dark:text-white">
                {isSearching ? "Searching" : String(ride.status || "-").replaceAll("_", " ")}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2">
              <p className="text-gray-500">Drivers nearby</p>
              <p className="mt-1 font-bold text-townwize-primary dark:text-white">
                {isSearching
                  ? availability.loading || availability.matchingDrivers == null
                    ? "-"
                    : availability.matchingDrivers
                  : ride.driverId
                    ? "Assigned"
                    : "-"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2">
              <p className="text-gray-500">Pickup ETA</p>
              <p className="mt-1 font-bold text-townwize-primary dark:text-white">
                {isSearching
                  ? availability.estimatedPickupMinutes == null
                    ? "-"
                    : `${availability.estimatedPickupMinutes} min`
                  : driverLat && driverLng
                    ? "Updating"
                    : "-"}
              </p>
            </div>
          </div>
        </div>

        {isSearching ? (
          <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-townwize-primary dark:text-townwize-accent">
                Finding a driver
              </span>
              <span className="text-gray-500">
                {availability.nearestDistanceKm == null
                  ? "Checking nearby drivers"
                  : `Nearest driver about ${Number(availability.nearestDistanceKm).toFixed(1)} km away`}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["Checking nearby drivers", "Sending ride request", "Waiting for a driver"].map(
                (label, index) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        index === 0 || Number(availability.matchingDrivers || 0) > 0
                          ? "bg-townwize-primary"
                          : "bg-gray-300"
                      }`}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
                  </div>
                )
              )}
            </div>
            {availability.message ? (
              <p className="mt-2 text-xs text-amber-700">{availability.message}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {fetchError && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Having trouble reaching the server. Retrying...
        </div>
      )}

      {mapsError ? (
        <div className="w-full h-96 rounded-xl border border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-sm text-gray-500">
          Map unavailable. Your ride is still active.
        </div>
      ) : (
        <div
          ref={mapRef}
          className="w-full h-96 rounded-xl shadow border border-gray-300 dark:border-gray-700"
        />
      )}

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow space-y-2">
        <p className="text-sm">
          <strong>Status:</strong> {ride.status}
        </p>
        <p className="text-sm">
          <strong>Pickup:</strong> {ride.pickup.address}
        </p>
        <p className="text-sm">
          <strong>Dropoff:</strong> {ride.dropoff.address}
        </p>
        <p className="text-sm">
          <strong>Fare:</strong> {ride.fareEstimate} PKR
        </p>
      </div>

      {/* Back-button blocked during ARRIVED/ON_TRIP */}
      {tripBlocked && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 space-y-3 border border-amber-200 dark:border-amber-700">
          <p className="text-sm font-medium text-center text-gray-700 dark:text-gray-300">
            Your trip is in progress.
            <span className="block text-xs text-gray-500 mt-1">
              You cannot go back while the ride is active.
            </span>
          </p>
          <button
            onClick={handleKeepRide}
            className="w-full py-3 rounded-xl font-semibold bg-townwize-primary text-white"
          >
            Got it
          </button>
        </div>
      )}

      {canCancel && (
        confirmCancel ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 space-y-3">
            <p className="text-sm font-medium text-center text-gray-700 dark:text-gray-300">
              Cancel this ride?
              {String(ride.status).toUpperCase() !== "REQUESTED" && (
                <span className="block text-xs text-gray-500 mt-1">
                  Your driver will be notified.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleKeepRide}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-60"
              >
                Keep Ride
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
        )
      )}
    </div>
  );
};

export default LiveTracking;

