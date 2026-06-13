/* global google */
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";
import api from "../../../services/api";
import { useRideSocket } from "../../../hooks/useRideSocket";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

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
  const routeRendererRef = useRef(null);

  const [ride, setRide] = useState(null);
  const rideRef = useRef(null);
  const [availability, setAvailability] = useState({
    loading: false,
    matchingDrivers: null,
    nearestDistanceKm: null,
    estimatedPickupMinutes: null,
    message: "",
  });

  const lastRouteStatusRef = useRef(null);
  const hasFitBoundsRef = useRef(false);

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
            setRide(res.data.data);
          }
        })
        .catch((err) => {
          if (err?.response?.status === 401) return;
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
  }, [ride?.status, ride?.pickup?.lat, ride?.pickup?.lng, ride?.carType, ride]);


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

        // Pickup marker
        const pickupEl = document.createElement("div");
        pickupEl.style.width = "14px";
        pickupEl.style.height = "14px";
        pickupEl.style.borderRadius = "50%";
        pickupEl.style.background = "#6CBEED";
        pickupEl.style.border = "2px solid #000";

        new google.maps.marker.AdvancedMarkerElement({
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
        console.error("Failed to load Google Maps");
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

  useEffect(() => {
    const currentRide = rideRef.current;
    if (!currentRide || !mapInstanceRef.current || !window.google?.maps) return;

    const map = mapInstanceRef.current;

    // Fit bounds ONCE when driver first appears
    if (
      rideStatus === "DRIVER_ASSIGNED" &&
      driverLat &&
      driverLng &&
      pickupLat &&
      pickupLng &&
      dropoffLat &&
      dropoffLng &&
      !hasFitBoundsRef.current
    ) {
      const bounds = new google.maps.LatLngBounds();

      bounds.extend({ lat: pickupLat, lng: pickupLng });
      bounds.extend({ lat: dropoffLat, lng: dropoffLng });
      bounds.extend({ lat: driverLat, lng: driverLng });

      map.fitBounds(bounds, 80);
      hasFitBoundsRef.current = true;
    }

    // Only reset route when status actually changes
    if (lastRouteStatusRef.current !== rideStatus) {
      if (routeRendererRef.current) {
        routeRendererRef.current.setMap(null);
        routeRendererRef.current = null;
      }
      lastRouteStatusRef.current = rideStatus;
    }

    // Draw route only when needed
    if (
      (rideStatus === "DRIVER_ASSIGNED" || rideStatus === "ON_TRIP") &&
      driverLat &&
      driverLng
    ) {
      if (!routeRendererRef.current) {
        routeRendererRef.current = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#103139",
            strokeWeight: 5,
          },
        });

        routeRendererRef.current.setMap(map);
      }

      const directionsService = new google.maps.DirectionsService();

      const origin = { lat: driverLat, lng: driverLng };
      const destination =
        rideStatus === "DRIVER_ASSIGNED"
          ? { lat: pickupLat, lng: pickupLng }
          : { lat: dropoffLat, lng: dropoffLng };

      directionsService.route(
        { origin, destination, travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === "OK" && routeRendererRef.current) {
            routeRendererRef.current.setDirections(result);
          }
        }
      );
    }


    // Update driver marker ONLY (do not recreate map)
    if (driverLat && driverLng) {
      const pos = { lat: driverLat, lng: driverLng };

      if (!driverMarkerRef.current) {
        const driverEl = document.createElement("div");
        driverEl.style.width = "16px";
        driverEl.style.height = "16px";
        driverEl.style.borderRadius = "50%";
        driverEl.style.background = "#00C853";
        driverEl.style.border = "2px solid #000";

        driverMarkerRef.current =
          new google.maps.marker.AdvancedMarkerElement({
            map,
            position: pos,
            content: driverEl,
          });
      } else {
        driverMarkerRef.current.position = pos;
      }
    }
  }, [
    rideStatus,
    driverLat,
    driverLng,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  ]);
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
  // RENDER
  // ─────────────────────────────────────────────

  if (!ride) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-townwize-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stage = getPassengerRideStage(ride.status);
  const isSearching = String(ride.status || "").toUpperCase() === "REQUESTED";

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

      <div
        ref={mapRef}
        className="w-full h-96 rounded-xl shadow border border-gray-300 dark:border-gray-700"
      />

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
    </div>
  );
};

export default LiveTracking;

