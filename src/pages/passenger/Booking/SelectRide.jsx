//File: townwize-frontend\src\pages\passenger\Booking\SelectRide.jsx
/* global google */
import React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import LocationField from "../../../components/passenger/LocationField";
import PassengerLayout from "../../../layouts/PassengerLayout";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import useMapCore from "./hooks/useMapCore";
import useMarkers from "./hooks/useMarkers";
import useRouteEngine from "./hooks/useRouteEngine";
import api from "../../../services/api";
// Components- pages\passenger\Booking\components
import RouteLoaderOverlay from "./components/RouteLoaderOverlay";
import MapSelectionOverlay from "./components/MapSelectionOverlay";
import RideTypeCard from "./components/RideTypeCard";

//import { memo } from "react";
import {
  FaMapMarkerAlt,
  FaRoute,
  FaCarSide,
  FaUsers,
  FaClock,
  FaPlus,
  FaTimes,
  FaDotCircle,
  FaCrosshairs,
} from "react-icons/fa";

// 🧩 Auth Context
import { useContext } from "react";
import AuthContext from "../../../contexts/AuthContext";

const CAR_CLASSES = [
  {
    key: "economy",
    title: "Economy",
    description: "Affordable everyday cars",
    multiplier: 1,
  },
  {
    key: "comfort",
    title: "Comfort",
    description: "Newer cars with extra comfort",
    multiplier: 1.18,
  },
  {
    key: "xl",
    title: "XL",
    description: "Larger vehicles for families or bags",
    multiplier: 1.35,
  },
];

const toPlainLatLng = (pos) => {
  if (!pos) return null;
  return typeof pos.lat === "function"
    ? { lat: pos.lat(), lng: pos.lng() }
    : { lat: pos.lat, lng: pos.lng };
};

const SelectRide = () => {
  const navigate = useNavigate();
  // ✅ Step 5: Restore persisted ride state early (before useLocation clears)
  const lastRideState = JSON.parse(sessionStorage.getItem("selectRideStatePersist") || "{}");
  const { state: routeStateRaw } = useLocation();
  const state = routeStateRaw && Object.keys(routeStateRaw).length ? routeStateRaw : lastRideState;

  //const { state } = useLocation();

  // ✅ Step 1: Keep a copy of state so it survives reloads or login redirects
  useEffect(() => {
    if (state?.pickup && state?.dropoff) {
      sessionStorage.setItem("selectRideStatePersist", JSON.stringify(state));
    }
  }, [state]);

  // ✅ Step 2: Load the saved state if current state is missing (after login redirect)
  const persistedState = JSON.parse(sessionStorage.getItem("selectRideStatePersist") || "{}");
  const effectiveState = state && Object.keys(state).length ? state : persistedState;


  // Auth Context
  const { user, loading } = useContext(AuthContext);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Close modal on login
  useEffect(() => {
    if (user) setShowAuthModal(false);
  }, [user]);

  // 🔓 Forcefully re-enable UI once authenticated
  useEffect(() => {
    if (user && !showAuthModal) {
      document.body.style.pointerEvents = "auto";
    }
  }, [user, showAuthModal]);

  // Show booking error passed back from TripRequest (e.g. GuestTowner route restriction)
  useEffect(() => {
    const bookingError = sessionStorage.getItem("passengerBookingError");
    if (bookingError) {
      sessionStorage.removeItem("passengerBookingError");
      toast.error(bookingError, { autoClose: 6000 });
    }
  }, []);

  // Redirect to home if no pickup/dropoff in state or sessionStorage
  // ✅ Auth gate runs AFTER map hooks mount
  useEffect(() => {
    if (loading) return;

    // Wait until map hooks are ready
    const timer = setTimeout(() => {
      if (!user) setShowAuthModal(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [user, loading]);



  const getRecentPickups = () => {
    try { return JSON.parse(localStorage.getItem("tw_recent_pickups") || "[]"); } catch { return []; }
  };

  // restore from sessionStorage on refresh
  const persisted = JSON.parse(sessionStorage.getItem("selectRideState") || "{}");
  const [pickup, setPickup] = useState(state?.pickup || persisted.pickup || "");
  const [dropoff, setDropoff] = useState(state?.dropoff || persisted.dropoff || "");
  // restore stops from sessionStorage on refresh - conditional
  const comingFromHome = !!(state?.pickup && state?.dropoff);
  const [stop, setStop] = useState(
    comingFromHome ? "" : state?.stop || persisted.stop || ""
  );
  const [hasStop, setHasStop] = useState(
    comingFromHome ? false : state?.stop ? true : persisted.hasStop || false
  );

  useEffect(() => {
    sessionStorage.setItem(
      "selectRideState",
      JSON.stringify({
        pickup,
        stop,
        dropoff,
        hasStop,
      })
    );
  }, [pickup, stop, dropoff, hasStop]);

  const [selectedType, setSelectedType] = useState(null);
  const [selectedCarType, setSelectedCarType] = useState("");
  const [fare, setFare] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [availability, setAvailability] = useState({
    loading: false,
    matchingDrivers: null,
    onlineDrivers: null,
    nearestDistanceKm: null,
    estimatedPickupMinutes: null,
    message: "",
  });
  const [zoneCheck, setZoneCheck] = useState({
    loading: false,
    eligible: null,
    pickupEligible: null,
    dropoffEligible: null,
    pickupZoneName: "",
    dropoffZoneName: "",
    message: "",
  });
  const [eta, setEta] = useState("");
  const [selectingFor, setSelectingFor] = useState(null);
  const [markerVersion, setMarkerVersion] = useState(0);
  const handleMarkerUpdated = useCallback(() => {
    setMarkerVersion((value) => value + 1);
  }, []);
  // Prevents tryRestore from re-running after it has already placed markers once.
  // Without this, setPickup/setDropoff inside the geocode callbacks would re-trigger
  // the effect (they were in the dep array), causing an infinite geocode → route loop.
  const restoredRef = useRef(false);
  // Multiple Route Choice States
  //const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  window.__setPickup = setPickup;
  window.__setStop = setStop;
  window.__setDropoff = setDropoff;

  // --- NEW HOOKS: Map Core ---
  const {
    mapRef: coreMapRef,
    mapInstanceRef: coreMapInstanceRef,
    mapsReadyRef: coreMapsReadyRef,
    sessionTokenRef: coreSessionTokenRef,
  } = useMapCore({
    onMapClick: (latLng) => {
      let target = selectingFor;
      // Intelligent auto-target:
      if (!target) {
        if (!pickup) target = "pickup";
        else if (!dropoff) target = "dropoff";
        else return; // both exist → require explicit selection
      }
      if (coreMapsReadyRef.current && coreMapInstanceRef.current) {
        updateMapMarker(latLng, target);
      } else {
        console.warn("Map not ready → marker skipped");
      }
      reverseGeocode(latLng, (addr) => {
        if (target === "pickup") setPickup(addr);
        if (target === "stop") setStop(addr);
        if (target === "dropoff") setDropoff(addr);
      });
      setSelectingFor(null);
    },
  });

  const getGeocoder = async () => {
    const { Geocoder } = await google.maps.importLibrary("geocoding");
    return new Geocoder();
  };
  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (latLng, setter) => {
    if (!window.google?.maps) return;
    const geocoder = await getGeocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status !== "OK" || !results?.length) return;
      // Skip Plus Code type results — they produce unintelligible codes like "49C5+6MR"
      const usable = results.filter((r) => !r.types?.includes("plus_code"));
      const best = usable[0] ?? results[0];
      const address = best.formatted_address
        .replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}[, ]+/, "")
        .trim();
      setter(address);
    });
  }, []);
  // --- NEW HOOKS: Markers ---
  const {
    pickupMarkerRef,
    stopMarkerRef,
    dropoffMarkerRef,
    updateMapMarker,
  } = useMarkers({
    mapInstanceRef: coreMapInstanceRef,
    reverseGeocode,
    onMarkerUpdated: handleMarkerUpdated,
  });

  // --- NEW HOOKS: Route Engine ---
  const { requestRoute, isCalculatingRoute, etaText, distanceKm } = useRouteEngine({
    mapInstanceRef: coreMapInstanceRef,
    pickupMarkerRef,
    stopMarkerRef,
    dropoffMarkerRef,
  });
  // Route readiness check
  const effectiveDistanceKm = Number(distanceKm || effectiveState?.distanceKm || 0);
  const effectiveEtaText = etaText || effectiveState?.eta || "";
  const effectiveEtaMinutes = Math.round(
    Number(effectiveState?.etaMinutes) ||
      (effectiveDistanceKm > 0 ? (effectiveDistanceKm / 30) * 60 : 0)
  );
  const routeReady = pickup.trim() && dropoff.trim() && effectiveDistanceKm > 0;
  // Suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  // Searching state
  const [searching, setSearching] = useState(false);
  const getLocalFallbackFare = useCallback((type, carClass, km, minutes = 0) => {
    if (!type || km <= 0) return 0;
    const privateRide = type === "Private Ride";
    const baseFare = privateRide ? 120 : 90;
    const perKmRate = privateRide ? 32 : 24;
    const perMinuteRate = privateRide ? 4 : 3;
    const platformFee = 20;
    const carMultiplier =
      privateRide
        ? CAR_CLASSES.find((item) => item.key === carClass)?.multiplier || 1
        : 1;
    return Math.round(
      (baseFare + perKmRate * km + perMinuteRate * Number(minutes || 0)) *
        carMultiplier +
        platformFee
    );
  }, []);

  // Fare calculation: backend quote is the source of truth so Select Ride and Trip Summary match.
  useEffect(() => {
    if (!selectedType) return;
    if (effectiveDistanceKm <= 0) return;
    if (selectedType === "Private Ride" && !selectedCarType) return;

    const carTypeForQuote =
      selectedType === "Private Ride" ? selectedCarType : "economy";
    const etaMinutesForQuote = effectiveEtaMinutes;
    const fallbackFare = getLocalFallbackFare(
      selectedType,
      carTypeForQuote,
      effectiveDistanceKm,
      etaMinutesForQuote
    );

    if (!user) {
      setFare(fallbackFare);
      return;
    }

    let mounted = true;
    setQuoteLoading(true);
    setQuoteError("");

    api
      .post("/rides/quote", {
        rideType: selectedType,
        carType: carTypeForQuote,
        distanceKm: effectiveDistanceKm,
        etaMinutes: etaMinutesForQuote,
        requestedFare: fallbackFare,
      })
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data || {};
        setFare(Number(data.finalFare ?? data.fareEstimate ?? fallbackFare));
      })
      .catch((err) => {
        if (!mounted) return;
        setFare(fallbackFare);
        setQuoteError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            "Fare will be confirmed on the next step."
        );
      })
      .finally(() => {
        if (mounted) setQuoteLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    selectedType,
    selectedCarType,
    effectiveDistanceKm,
    effectiveEtaMinutes,
    user,
    getLocalFallbackFare,
  ]);

  const getPreviewFare = useCallback(
    (type) => {
      if (!type || effectiveDistanceKm <= 0) return 0;
      if (selectedType === type) return Number(fare || 0);
      return getLocalFallbackFare(
        type,
        type === "Private Ride" ? selectedCarType || "economy" : "economy",
        effectiveDistanceKm,
        effectiveEtaMinutes
      );
    },
    [
      effectiveDistanceKm,
      effectiveEtaMinutes,
      fare,
      getLocalFallbackFare,
      selectedCarType,
      selectedType,
    ]
  );

  useEffect(() => {
    if (!user || !routeReady || !selectedType) {
      setAvailability({
        loading: false,
        matchingDrivers: null,
        onlineDrivers: null,
        nearestDistanceKm: null,
        estimatedPickupMinutes: null,
        message: "",
      });
      return;
    }

    const carTypeForAvailability =
      selectedType === "Private Ride" ? selectedCarType || "economy" : "economy";
    const pickupCoordsForAvailability = pickupMarkerRef.current
      ? toPlainLatLng(pickupMarkerRef.current.position)
      : effectiveState?.pickupCoords || null;

    if (!pickupCoordsForAvailability?.lat || !pickupCoordsForAvailability?.lng) return;

    let mounted = true;
    setAvailability((prev) => ({ ...prev, loading: true, message: "" }));

    api
      .post("/rides/availability", {
        pickupCoords: pickupCoordsForAvailability,
        carType: carTypeForAvailability,
      })
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data || {};
        setAvailability({
          loading: false,
          matchingDrivers: Number(data.matchingDrivers ?? 0),
          onlineDrivers: Number(data.onlineDrivers ?? 0),
          nearestDistanceKm: data.nearestDistanceKm ?? null,
          estimatedPickupMinutes: data.estimatedPickupMinutes ?? null,
          message: "",
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setAvailability({
          loading: false,
          matchingDrivers: null,
          onlineDrivers: null,
          nearestDistanceKm: null,
          estimatedPickupMinutes: null,
          message:
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            "Nearby drivers will be checked when you confirm.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [
    user,
    routeReady,
    selectedType,
    selectedCarType,
    pickup,
    effectiveState?.pickupCoords,
    pickupMarkerRef,
  ]);

  useEffect(() => {
    if (!user || !routeReady) {
      setZoneCheck({
        loading: false,
        eligible: null,
        pickupEligible: null,
        dropoffEligible: null,
        pickupZoneName: "",
        dropoffZoneName: "",
        message: "",
      });
      return;
    }

    const pickupCoordsForZone = pickupMarkerRef.current
      ? toPlainLatLng(pickupMarkerRef.current.position)
      : effectiveState?.pickupCoords || null;
    const dropoffCoordsForZone = dropoffMarkerRef.current
      ? toPlainLatLng(dropoffMarkerRef.current.position)
      : effectiveState?.dropoffCoords || null;

    if (
      !pickupCoordsForZone?.lat ||
      !pickupCoordsForZone?.lng ||
      !dropoffCoordsForZone?.lat ||
      !dropoffCoordsForZone?.lng
    ) {
      return;
    }

    let mounted = true;
    setZoneCheck((prev) => ({ ...prev, loading: true, message: "" }));

    api
      .post("/rides/zone-eligibility", {
        pickupCoords: pickupCoordsForZone,
        dropoffCoords: dropoffCoordsForZone,
      })
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data || {};
        setZoneCheck({
          loading: false,
          eligible: Boolean(data.eligible),
          pickupEligible: Boolean(data.pickup?.eligible),
          dropoffEligible: Boolean(data.dropoff?.eligible),
          pickupZoneName: data.pickup?.zone?.name || "",
          dropoffZoneName: data.dropoff?.zone?.name || "",
          message: "",
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setZoneCheck({
          loading: false,
          eligible: false,
          pickupEligible: null,
          dropoffEligible: null,
          pickupZoneName: "",
          dropoffZoneName: "",
          message:
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            "We could not check service coverage. Please try again.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [
    user,
    routeReady,
    pickup,
    dropoff,
    markerVersion,
    effectiveState?.pickupCoords,
    effectiveState?.dropoffCoords,
    pickupMarkerRef,
    dropoffMarkerRef,
  ]);

  const serviceAreaReady = zoneCheck.eligible === true;
  const serviceAreaBlocked = routeReady && zoneCheck.eligible === false;

  // ETA stays perfectly stable
  useEffect(() => {
    setEta(effectiveEtaText || "");
  }, [effectiveEtaText]);
  // Fetch place suggestions (with recent-pickup fallback for empty input)
  const fetchSuggestions = useCallback(async (input, setter, { showRecents = false } = {}) => {
    if (!coreMapsReadyRef.current || !input) {
      if (showRecents && !input) {
        const recents = getRecentPickups();
        setter(recents.map((addr) => ({ description: addr, placeId: null, text: addr, isRecent: true })));
      } else {
        setter([]);
      }
      return;
    }
    try {
      const service = new google.maps.places.AutocompleteService();
      const result = await service.getPlacePredictions({
        input,
        sessionToken: coreSessionTokenRef.current,
        componentRestrictions: { country: "pk" },
      });
      setter(result.predictions.map(p => ({
        description: p.description,
        placeId: p.place_id,
        text: p.structured_formatting.main_text,
      })));
    } catch (err) {
      console.error("Suggestions failed:", err);
      setter([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Handle GPS location
  const handleGPS = useCallback((setter, type) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    toast.info("Fetching your location...");
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        // Wait for a reasonably accurate fix
        if (accuracy <= 50) {
          navigator.geolocation.clearWatch(watchId);
          if (coreMapsReadyRef.current && coreMapInstanceRef.current) {
            updateMapMarker({ lat: latitude, lng: longitude }, type);
          }
          reverseGeocode({ lat: latitude, lng: longitude }, setter);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error("Unable to fetch location.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  }, [reverseGeocode, updateMapMarker, coreMapInstanceRef, coreMapsReadyRef]);
  const saveRecentPickup = (address, coords) => {
    if (!address?.trim()) return;
    try {
      const stored = JSON.parse(localStorage.getItem("_tw_recent_pickups") || "[]");
      const entry = {
        address: address.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        savedAt: new Date().toISOString(),
      };
      // De-duplicate by address string, keep most recent first, limit 5
      const deduped = stored.filter((e) => e.address !== entry.address);
      localStorage.setItem("_tw_recent_pickups", JSON.stringify([entry, ...deduped].slice(0, 5)));
    } catch {}
  };

  // Continue to trip summary
  const handleContinue = () => {
    if (!pickup.trim() || !dropoff.trim()) {
      toast.error("Please set both pickup and dropoff");
      return;
    }
    if (!selectedType) {
      toast.error("Please select a ride type");
      return;
    }
    if (selectedType === "Private Ride" && !selectedCarType) {
      toast.error("Please select a car class");
      return;
    }
    if (zoneCheck.loading) {
      toast.info("Checking service area. Please wait.");
      return;
    }
    if (!serviceAreaReady) {
      toast.error(zoneCheck.message || "This route is outside our active service area.");
      return;
    }
    setSearching(true);
    setTimeout(() => {
      // clear persisted SelectRide state on successful completion
      sessionStorage.removeItem("selectRideState");

      // helper to normalise marker positions
const getLatLng = (pos) => {
  if (!pos) return null;
  return typeof pos.lat === "function"
    ? { lat: pos.lat(), lng: pos.lng() }
    : { lat: pos.lat, lng: pos.lng };
};

const pickupCoords = pickupMarkerRef.current
  ? getLatLng(pickupMarkerRef.current.position)
  : effectiveState?.pickupCoords || null;

const dropoffCoords = dropoffMarkerRef.current
  ? getLatLng(dropoffMarkerRef.current.position)
  : effectiveState?.dropoffCoords || null;

saveRecentPickup(pickup, pickupCoords);
navigate("/passenger/trip-summary", {
  replace: true,
  state: {
    pickup,
    stop: hasStop ? stop : null,
    dropoff,

    // ✅ REQUIRED COORDINATES
    pickupCoords,
    dropoffCoords,

    // ✅ REQUIRED NUMBERS
    distanceKm: effectiveDistanceKm,
    etaMinutes: effectiveEtaMinutes,

    // display values
    eta: effectiveEtaText || eta,
    rideType: selectedType,
    carType: selectedType === "Private Ride" ? selectedCarType : "economy",
    fare,
  },
});

    }, 800);
    // short delay to show success state
  };

  const pickupProps = useMemo(() => ({
    label: "Pickup Location",
    value: pickup,
    onChange: setPickup,
    onClear: () => setPickup(""),
    onGPS: () => handleGPS(setPickup, "pickup"),
    onMap: () => setSelectingFor("pickup"),
    suggestions: pickupSuggestions,
    setSuggestions: setPickupSuggestions,
    onSelect: (p) => {
      if (p.isRecent) {
        setPickup(p.description);
        reverseGeocode ? null : null; // no-op — geocode will run when user proceeds
        getGeocoder().then((geocoder) => {
          geocoder.geocode({ address: p.description }, (results, status) => {
            if (status === "OK" && results?.[0]?.geometry?.location) {
              updateMapMarker(results[0].geometry.location, "pickup");
            }
          });
        });
        setPickupSuggestions([]);
        return;
      }
      const placesService = new google.maps.places.PlacesService(coreMapInstanceRef.current);
      placesService.getDetails(
        { placeId: p.placeId, fields: ["formatted_address", "geometry"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            setPickup(place.formatted_address);
            if (coreMapsReadyRef.current && coreMapInstanceRef.current) {
              updateMapMarker(place.geometry.location, "pickup");
            } else {
              console.warn("Map not ready → pickup marker skipped");
            }
          }
        }
      );
      setPickupSuggestions([]);
    },
    onFocus: () => {
      if (!pickup) {
        const recents = getRecentPickups();
        if (recents.length) {
          setPickupSuggestions((prev) => [
            ...prev,
            ...recents.map((addr) => ({ description: addr, placeId: null, text: addr, isRecent: true })),
          ]);
        }
      }
    },
    icon: <FaMapMarkerAlt className="text-townwize-primary dark:text-townwize-textContent text-lg mr-3" />,
  }), [pickup, pickupSuggestions, handleGPS, updateMapMarker, coreMapInstanceRef, coreMapsReadyRef]);

  const stopProps = useMemo(() => ({
    label: "Stop",
    value: stop,
    onChange: setStop,
    onClear: () => setStop(""),
    onGPS: () => handleGPS(setStop, "stop"),
    onMap: () => setSelectingFor("stop"),
    suggestions: stopSuggestions,
    setSuggestions: setStopSuggestions,
    onSelect: (p) => {
      const placesService = new google.maps.places.PlacesService(coreMapInstanceRef.current);
      placesService.getDetails(
        { placeId: p.placeId, fields: ["formatted_address", "geometry"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            setStop(place.formatted_address);
            if (coreMapsReadyRef.current && coreMapInstanceRef.current) {
              updateMapMarker(place.geometry.location, "stop");
            } else {
              console.warn("Map not ready → stop marker skipped");
            }

          }
        }
      );
      setStopSuggestions([]);
    },
    icon: <FaDotCircle className="text-blue-500 text-lg mr-3" />,
  }), [stop, stopSuggestions, handleGPS, updateMapMarker, coreMapInstanceRef, coreMapsReadyRef]);

  const dropoffProps = useMemo(() => ({
    label: "Dropoff Location",
    value: dropoff,
    onChange: setDropoff,
    onClear: () => setDropoff(""),
    onGPS: () => handleGPS(setDropoff, "dropoff"),
    onMap: () => setSelectingFor("dropoff"),
    suggestions: dropoffSuggestions,
    setSuggestions: setDropoffSuggestions,
    onSelect: (p) => {
      const placesService = new google.maps.places.PlacesService(coreMapInstanceRef.current);
      placesService.getDetails(
        { placeId: p.placeId, fields: ["formatted_address", "geometry"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            setDropoff(place.formatted_address);
            if (coreMapsReadyRef.current && coreMapInstanceRef.current) {
              updateMapMarker(place.geometry.location, "dropoff");
            } else {
              console.warn("Map not ready → dropoff marker skipped");
            }
          }
        }
      );
      setDropoffSuggestions([]);
    },
    icon: <FaRoute className="text-red-500 text-lg mr-3" />,
  }), [dropoff, dropoffSuggestions, handleGPS, updateMapMarker, coreMapInstanceRef, coreMapsReadyRef]);



  // === Restore original behavior: Auto-place markers if coming from previous screen ===
  useEffect(() => {
    let checkTimer;
    // Reset guard whenever effectiveState changes (new navigation intent).
    restoredRef.current = false;

    const tryRestore = async () => {
      // Only run once per navigation — without this guard, setPickup/setDropoff
      // called inside the geocode callbacks would trigger this same effect (they
      // were previously in the dep array), creating an endless geocode → route loop.
      if (restoredRef.current) return;
      if (!coreMapsReadyRef.current || !coreMapInstanceRef.current) {
        // keep polling until map is truly ready
        checkTimer = setTimeout(tryRestore, 200);
        return;
      }

      if (!effectiveState?.pickup || !effectiveState?.dropoff) return;

      restoredRef.current = true; // mark done before async work so re-renders can't slip past

      const geocoder = await getGeocoder();

      geocoder.geocode({ address: effectiveState.pickup }, (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          updateMapMarker(results[0].geometry.location, "pickup");
          setPickup(results[0].formatted_address);
        }
      });

      geocoder.geocode({ address: effectiveState.dropoff }, (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          updateMapMarker(results[0].geometry.location, "dropoff");
          setDropoff(results[0].formatted_address);
        }
      });
    };

    tryRestore();
    return () => clearTimeout(checkTimer);
    // Depend on the string values, NOT the effectiveState object.
    // effectiveState is rebuilt via JSON.parse on every render (new reference each
    // time), so using the object as a dep would re-run this effect on every render,
    // reset restoredRef, and re-geocode → flicker. Primitive strings compare by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveState?.pickup, effectiveState?.dropoff]);

  // 🧭 Auto-draw route when markers change
  useEffect(() => {
    if (!pickupMarkerRef.current || !dropoffMarkerRef.current) return;
    requestRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, stop, dropoff, markerVersion]);

  return (
    <>
      <div
        className={`grid grid-cols-1 md:grid-cols-[420px_1fr] gap-6 items-start mb-6 ${!user && showAuthModal ? "blur-sm pointer-events-none select-none" : ""
          }`}
        onClick={() => {
          setPickupSuggestions([]);
          setDropoffSuggestions([]);
          setStopSuggestions([]);
        }}
      >

        {/* Left Panel - Form */}
        <div className="bg-white dark:bg-townwize-primaryDark shadow-xl rounded-2xl px-5 py-6 space-y-5 w-full md:max-w-[420px] mx-auto md:mx-0">
          {/* Pickup */}
          <div onClick={(e) => e.stopPropagation()}>
            <LocationField {...pickupProps} fetchSuggestions={fetchSuggestions} />
          </div>

          {/* Stop */}
          {hasStop ? (
            <div className="space-y-3 animate-fadeIn">
              <div onClick={(e) => e.stopPropagation()}>
                <LocationField
                  {...stopProps}
                  fetchSuggestions={fetchSuggestions}
                  className="stop-field"
                />
              </div>

              <button
                type="button"
                onClick={() => setHasStop(false)}
                className="text-red-500 text-xs flex items-center gap-1 hover:underline"
              >
                <FaTimes /> Remove stop
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHasStop(true);
              }}
              className="text-townwize-primary dark:text-townwize-textContent text-sm flex items-center gap-1"
            >
              <FaPlus /> Add stop
            </button>
          )}

          {/* Dropoff */}
          <div onClick={(e) => e.stopPropagation()}>
            <LocationField {...dropoffProps} fetchSuggestions={fetchSuggestions} />
          </div>

          {/* Ride type cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <RideTypeCard
              title="Private Ride"
              icon={<FaCarSide />}
              selected={selectedType === "Private Ride"}
              disabled={!routeReady}
              onSelect={() => {
                if (!routeReady) return;
                setSelectedType("Private Ride");
                if (!selectedCarType) setSelectedCarType("economy");
              }}
            >
              {/* Fare + ETA */}
              <span>
                {effectiveDistanceKm > 0 ? (
                  `${getPreviewFare("Private Ride")} PKR`
                ) : (
                  <span className="inline-block tw-shimmer h-4 w-14 rounded-md"></span>
                )}
                • <FaClock className="inline" />{" "}
                {isCalculatingRoute ? (
                  <span className="inline-block tw-shimmer h-4 w-12 rounded-md"></span>
                ) : (
                  etaText || "—"
                )}
              </span>

              {/* Distance */}
              <div className="text-xs text-gray-200 dark:text-gray-300 mt-1">
                {isCalculatingRoute ? (
                  <span className="inline-block tw-shimmer h-3 w-10 rounded-md"></span>
                ) : effectiveDistanceKm > 0 ? (
                  `${effectiveDistanceKm.toFixed(1)} km`
                ) : (
                  "—"
                )}
              </div>
            </RideTypeCard>

            <RideTypeCard
              title="RideTogether"
              icon={<FaUsers />}
              badge={
                <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-townwize-accent bg-white/20 px-2 py-0.5 rounded-full leading-none">
                  Share &amp; Save
                </span>
              }
              selected={selectedType === "RideTogether"}
              disabled={!routeReady}
              onSelect={() => {
                if (!routeReady) return;
                setSelectedType("RideTogether");
              }}
            >
              {/* Fare + ETA */}
              <span>
                {effectiveDistanceKm > 0 ? (
                  `${getPreviewFare("RideTogether")} PKR`
                ) : (
                  <span className="inline-block tw-shimmer h-4 w-14 rounded-md"></span>
                )}
                • <FaClock className="inline" />{" "}
                {isCalculatingRoute ? (
                  <span className="inline-block tw-shimmer h-4 w-12 rounded-md"></span>
                ) : (
                  etaText || "—"
                )}
              </span>

              {/* Split fare hint */}
              {effectiveDistanceKm > 0 && (
                <div className="text-[11px] text-gray-200 dark:text-gray-300 mt-0.5">
                  Est. ~PKR {Math.round(getPreviewFare("RideTogether") / 2)}/rider
                </div>
              )}

              {/* Distance */}
              <div className="text-xs text-gray-200 dark:text-gray-300 mt-1">
                {isCalculatingRoute ? (
                  <span className="inline-block tw-shimmer h-3 w-10 rounded-md"></span>
                ) : effectiveDistanceKm > 0 ? (
                  `${effectiveDistanceKm.toFixed(1)} km`
                ) : (
                  "—"
                )}
              </div>

              {/* Share & save badge */}
              {effectiveDistanceKm > 0 && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-300 bg-white/10 px-2 py-0.5 rounded-full">
                  <FaUsers size={9} /> Split fare · pay less
                </div>
              )}
            </RideTypeCard>

          </div>

          {selectedType === "Private Ride" ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-townwize-primary dark:text-townwize-accent">
                    Choose car class
                  </p>
                  <p className="text-xs text-gray-500">
                    Match the ride to your comfort and group size.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {CAR_CLASSES.map((item) => {
                  const active = selectedCarType === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedCarType(item.key)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-townwize-primary bg-white shadow-sm"
                          : "border-gray-200 bg-white hover:border-townwize-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-townwize-primary">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                        <div className="text-right text-sm font-semibold">
                          {active
                            ? quoteLoading
                              ? "Calculating..."
                              : fare
                                ? `${Number(fare).toLocaleString()} PKR`
                                : "-"
                            : "Select"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {quoteError ? (
                <p className="mt-2 text-xs text-amber-700">{quoteError}</p>
              ) : null}
            </div>
          ) : null}

          {selectedType && routeReady ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-townwize-primary dark:text-townwize-accent">
                    Nearby Wizers
                  </p>
                  <p className="text-xs text-gray-500">
                    We will look for available Wizers near your pickup.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    availability.loading
                      ? "bg-gray-100 text-gray-600"
                      : Number(availability.matchingDrivers || 0) > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {availability.loading
                    ? "Checking"
                    : Number(availability.matchingDrivers || 0) > 0
                      ? "Available"
                      : "Limited"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-gray-500">Ready</p>
                  <p className="mt-1 font-bold text-townwize-primary dark:text-white">
                    {availability.loading || availability.matchingDrivers == null
                      ? "-"
                      : availability.matchingDrivers}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-gray-500">Nearest</p>
                  <p className="mt-1 font-bold text-townwize-primary dark:text-white">
                    {availability.nearestDistanceKm == null
                      ? "-"
                      : `${Number(availability.nearestDistanceKm).toFixed(1)} km`}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-gray-500">Pickup ETA</p>
                  <p className="mt-1 font-bold text-townwize-primary dark:text-white">
                    {availability.estimatedPickupMinutes == null
                      ? "-"
                      : `${availability.estimatedPickupMinutes} min`}
                  </p>
                </div>
              </div>

              {availability.message ? (
                <p className="mt-2 text-xs text-amber-700">{availability.message}</p>
              ) : null}
            </div>
          ) : null}

          {routeReady ? (
            <div
              className={`rounded-2xl border p-4 ${
                zoneCheck.loading
                  ? "border-gray-200 bg-white"
                  : serviceAreaReady
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      serviceAreaReady ? "text-green-800" : serviceAreaBlocked ? "text-red-800" : "text-townwize-primary"
                    }`}
                  >
                    Service area
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {zoneCheck.loading
                      ? "Checking whether this trip is available."
                      : serviceAreaReady
                        ? "Pickup and dropoff are inside active Townwize coverage."
                        : zoneCheck.message || "This route is outside our active service area."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    zoneCheck.loading
                      ? "bg-gray-100 text-gray-600"
                      : serviceAreaReady
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {zoneCheck.loading ? "Checking" : serviceAreaReady ? "Available" : "Unavailable"}
                </span>
              </div>
              {!zoneCheck.loading && !serviceAreaReady ? (
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-red-100 bg-white px-3 py-2">
                    <p className="font-semibold text-gray-700">Pickup</p>
                    <p className={zoneCheck.pickupEligible ? "text-green-700" : "text-red-700"}>
                      {zoneCheck.pickupEligible
                        ? `Covered${zoneCheck.pickupZoneName ? ` (${zoneCheck.pickupZoneName})` : ""}`
                        : "Outside active coverage"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-white px-3 py-2">
                    <p className="font-semibold text-gray-700">Dropoff</p>
                    <p className={zoneCheck.dropoffEligible ? "text-green-700" : "text-red-700"}>
                      {zoneCheck.dropoffEligible
                        ? `Covered${zoneCheck.dropoffZoneName ? ` (${zoneCheck.dropoffZoneName})` : ""}`
                        : "Outside active coverage"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Search Button */}
          <div className="relative w-full mt-5">
            <button
              onClick={handleContinue}
              disabled={
                !pickup ||
                !dropoff ||
                !selectedType ||
                !routeReady ||
                quoteLoading ||
                zoneCheck.loading ||
                !serviceAreaReady ||
                (selectedType === "Private Ride" && !selectedCarType)
              }
              className={`w-full py-3 rounded-xl font-semibold overflow-hidden shadow-md relative ${pickup && dropoff && selectedType
                ? "text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                }`}
            >
              {/* Animated fill when searching */}
              {pickup && dropoff && selectedType && (
                <span
                  className={`absolute inset-0 rounded-xl transition-all duration-500 ease-in-out ${searching
                    ? "bg-gradient-to-r from-townwize-primary to-townwize-primaryDark animate-[pulse_1.2s_ease-in-out_infinite]"
                    : "bg-townwize-primary hover:bg-townwize-primaryDark"
                    }`}
                ></span>
              )}

              <span className="relative z-10">
                {quoteLoading
                  ? "Calculating fare..."
                  : searching
                    ? "Preparing Summary..."
                    : "Search"}
              </span>
            </button>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="w-full h-[calc(100vh-160px)] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden relative">
          <div ref={coreMapRef} className="w-full h-full" />


          {/* STEP 3.2 — Route Calculating Overlay */}
          <RouteLoaderOverlay isVisible={isCalculatingRoute} />

          <MapSelectionOverlay
            selectingFor={selectingFor}
            onCancel={() => setSelectingFor(null)}
          />

        </div>
      </div>
      {/* --- AUTH GATE MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0  flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl text-center w-[90%] max-w-sm">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Log in to view and choose the desired ride options
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Please sign in to continue your booking.
            </p>

            <div className="flex justify-center gap-4">

              <button
                onClick={() =>
                  navigate("/login", {
                    state: {
                      from: "/passenger/select-ride",
                      pickup: pickup || "",
                      dropoff: dropoff || "",
                      pickupCoords: pickupMarkerRef.current
                        ? pickupMarkerRef.current.position
                        : null,
                    },
                  })
                }
                className="px-4 py-2 rounded-lg bg-townwize-primary text-white hover:opacity-90"
              >
                Login
              </button>


              <button
                onClick={() => (window.location.href = "/register")}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:opacity-90"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

};
export default SelectRide;
