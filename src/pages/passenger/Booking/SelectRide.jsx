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

//import { memo } from "react";
import {
  FaMapMarkerAlt,
  FaRoute,
  FaCarSide,
  FaUsers,
  FaPlus,
  FaTimes,
  FaDotCircle,
  FaCrosshairs,
  FaArrowLeft,
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

  // Bottom sheet snap state — "half" (72vh, map visible) | "full" (93vh, sheet dominates)
  const [sheetSnap, setSheetSnap] = useState("half");
  const sheetDragStartY = useRef(null);
  const sheetRef = useRef(null);
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
  const scheduledAt = effectiveState?.scheduledAt || null;


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
    try { return JSON.parse(localStorage.getItem("_tw_recent_pickups") || "[]"); } catch { return []; }
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
  const [activeTolls, setActiveTolls] = useState([]);
  const [tollAmount, setTollAmount] = useState(0);
  const [tollNames, setTollNames] = useState([]);
  const [previewFares, setPreviewFares] = useState({ privateEconomy: 0, rideTogether: 0 });
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
  const continueAreaRef = useRef(null);

  // Auto-scroll to the confirm button when a ride type is selected
  useEffect(() => {
    if (!selectedType) return;
    const t = setTimeout(() => {
      continueAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 150);
    return () => clearTimeout(t);
  }, [selectedType, selectedCarType]);
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
    clearMarker,
  } = useMarkers({
    mapInstanceRef: coreMapInstanceRef,
    reverseGeocode,
    onMarkerUpdated: handleMarkerUpdated,
  });

  // --- NEW HOOKS: Route Engine ---
  const { requestRoute, isCalculatingRoute, etaText, etaValue, distanceKm, routePath } = useRouteEngine({
    mapInstanceRef: coreMapInstanceRef,
    pickupMarkerRef,
    stopMarkerRef,
    dropoffMarkerRef,
  });
  // Route readiness check
  const effectiveDistanceKm = Number(distanceKm || effectiveState?.distanceKm || 0);
  const effectiveEtaText = etaText || effectiveState?.eta || "";
  const effectiveEtaMinutes = etaValue
    ? Math.round(etaValue / 60)
    : Math.round(
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
  /**
   * Live pricing, so on-screen estimates cannot drift from what is charged.
   *
   * These numbers used to be hardcoded here and had gone stale — per-km 32 when
   * the real rate is 45 — and, worse, they applied NO minimum fare and NO tax.
   * On a short trip every class really settles at the minimum fare, so all three
   * cost the same; the hardcoded maths instead showed them fanned out by their
   * multipliers. The class buttons disagreed with the headline, and the headline
   * was the one telling the truth.
   *
   * Defaults below mirror the live config so a failed fetch is still close,
   * rather than wrong by a third.
   */
  const [pricing, setPricing] = useState({
    private: { baseFare: 120, perKm: 45, perMinute: 6 },
    rideTogether: { baseFare: 90, perKm: 24, perMinute: 4 },
    carTypeMultipliers: { economy: 1, comfort: 1.18, xl: 1.35 },
    minimumFare: 245,
    platformFee: 20,
    taxPercent: 5,
  });

  useEffect(() => {
    let mounted = true;
    fetch(`${import.meta.env.VITE_API_BASE_URL}/public/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const f = json?.data?.fares;
        if (mounted && f) setPricing((prev) => ({ ...prev, ...f }));
      })
      .catch(() => { /* keep the defaults */ });
    return () => { mounted = false; };
  }, []);

  /**
   * Mirrors the server's fare engine: ride components take the class
   * multiplier, the flat platform fee is added, the MINIMUM FARE floor is
   * applied to that subtotal, and tax goes on last. Verified against a real
   * receipt — 146.67 floored to 245, then +5% SST = 257.
   */
  const getLocalFallbackFare = useCallback((type, carClass, km, minutes = 0) => {
    if (!type || km <= 0) return 0;
    const privateRide = type === "Private Ride";
    const rates = privateRide ? pricing.private : pricing.rideTogether;
    const carMultiplier = privateRide
      ? pricing.carTypeMultipliers?.[carClass] ?? 1
      : 1;

    let total =
      (rates.baseFare + rates.perKm * km + (rates.perMinute || 0) * Number(minutes || 0)) *
      carMultiplier;
    total += pricing.platformFee || 0;
    // The floor scales with the car class, exactly as the server does — a flat
    // floor would erase the multiplier on short trips. This MUST stay in step
    // with rideQuote.service.js or the app quotes one price and charges another.
    if (pricing.minimumFare) {
      total = Math.max(total, pricing.minimumFare * carMultiplier);
    }
    if (pricing.taxPercent) total *= 1 + pricing.taxPercent / 100;
    return Math.round(total);
  }, [pricing]);

  /**
   * Fare for an UNSELECTED car class.
   *
   * Previously scaled the selected class's backend fare by the ratio of their
   * multipliers, which cannot represent the minimum-fare floor: on a short trip
   * it turned a real 257 into a displayed 303 for Comfort and 347 for XL, none
   * of which would have been charged. Estimating the target class directly
   * applies the floor properly.
   */
  const deriveClassFare = useCallback(
    (_backendFare, _fromKey, toKey, km, minutes) =>
      getLocalFallbackFare("Private Ride", toKey, km, minutes),
    [getLocalFallbackFare]
  );

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

    // Show this selection's own fallback IMMEDIATELY, before the request.
    //
    // `fare` still holds the previous selection's price at this point, and
    // getPreviewFare returns it verbatim for whatever is currently selected —
    // so tapping RideTogether showed the Private Ride price until the new quote
    // landed. Private Ride hides that window behind a shimmer; RideTogether has
    // none, so it simply displayed the wrong number as though it were real.
    setFare(fallbackFare);

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
        tollAmount,
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

  // Pre-fetch both ride type fares as soon as route is ready so unselected cards show backend prices
  useEffect(() => {
    if (!routeReady || effectiveDistanceKm <= 0 || !user) return;
    let mounted = true;

    const fbPrivate = getLocalFallbackFare("Private Ride", "economy", effectiveDistanceKm, effectiveEtaMinutes);
    const fbTogether = getLocalFallbackFare("RideTogether", "economy", effectiveDistanceKm, effectiveEtaMinutes);

    Promise.all([
      api.post("/rides/quote", { rideType: "Private Ride", carType: "economy", distanceKm: effectiveDistanceKm, etaMinutes: effectiveEtaMinutes, requestedFare: fbPrivate })
        .then((r) => { const d = r?.data?.data || {}; return Number(d.finalFare ?? d.fareEstimate ?? fbPrivate); })
        .catch(() => fbPrivate),
      api.post("/rides/quote", { rideType: "RideTogether", carType: "economy", distanceKm: effectiveDistanceKm, etaMinutes: effectiveEtaMinutes, requestedFare: fbTogether })
        .then((r) => { const d = r?.data?.data || {}; return Number(d.finalFare ?? d.fareEstimate ?? fbTogether); })
        .catch(() => fbTogether),
    ]).then(([privateEconomy, rideTogether]) => {
      if (mounted) setPreviewFares({ privateEconomy, rideTogether });
    });

    return () => { mounted = false; };
  }, [routeReady, effectiveDistanceKm, effectiveEtaMinutes, user, getLocalFallbackFare]);

  // Fetch active toll plazas once on mount
  useEffect(() => {
    api.get("/admin/pricing/tolls/active")
      .then((res) => setActiveTolls(res?.data?.data || []))
      .catch(() => {});
  }, []);

  // Detect tolls on active route polyline whenever the path changes
  useEffect(() => {
    if (!routePath?.length || !activeTolls.length) {
      setTollAmount(0);
      setTollNames([]);
      return;
    }
    let total = 0;
    const names = [];
    for (const toll of activeTolls) {
      const r = toll.radius || 150;
      const cosLat = Math.cos((toll.lat * Math.PI) / 180);
      const hit = routePath.some((pt) => {
        const dy = (pt.lat - toll.lat) * 111000;
        const dx = (pt.lng - toll.lng) * 111000 * cosLat;
        return Math.sqrt(dy * dy + dx * dx) <= r;
      });
      if (hit) {
        total += Number(toll.cashRate || 0);
        names.push(toll.name);
      }
    }
    setTollAmount(total);
    setTollNames(names);
  }, [routePath, activeTolls]);

  const getPreviewFare = useCallback(
    (type) => {
      if (!type || effectiveDistanceKm <= 0) return 0;
      const fallback = getLocalFallbackFare(
        type,
        type === "Private Ride" ? selectedCarType || "economy" : "economy",
        effectiveDistanceKm,
        effectiveEtaMinutes
      );
      // Selected: use backend fare if loaded, else fallback
      if (selectedType === type) return Number(fare) > 0 ? Number(fare) : fallback;
      // Unselected: use pre-fetched backend preview so the fare doesn't jump on selection
      if (type === "Private Ride") return previewFares.privateEconomy || fallback;
      if (type === "RideTogether") return previewFares.rideTogether || fallback;
      return fallback;
    },
    [
      effectiveDistanceKm,
      effectiveEtaMinutes,
      fare,
      getLocalFallbackFare,
      selectedCarType,
      selectedType,
      previewFares,
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

const stopCoords = hasStop && stopMarkerRef.current
  ? getLatLng(stopMarkerRef.current.position)
  : null;

saveRecentPickup(pickup, pickupCoords);
navigate("/passenger/trip-summary", {
  replace: true,
  state: {
    pickup,
    stop: hasStop ? stop : null,
    stopCoords,
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
    tollAmount,
    tollNames,
    scheduledAt,
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
        { placeId: p.placeId, fields: ["name", "formatted_address", "geometry"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            setPickup(place.name || place.formatted_address);
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
    onClear: () => { setStop(""); setHasStop(false); clearMarker("stop"); },
    onGPS: () => handleGPS(setStop, "stop"),
    onMap: () => setSelectingFor("stop"),
    suggestions: stopSuggestions,
    setSuggestions: setStopSuggestions,
    onSelect: (p) => {
      const placesService = new google.maps.places.PlacesService(coreMapInstanceRef.current);
      placesService.getDetails(
        { placeId: p.placeId, fields: ["name", "formatted_address", "geometry"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            setStop(place.name || place.formatted_address);
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
  }), [stop, stopSuggestions, handleGPS, updateMapMarker, clearMarker, coreMapInstanceRef, coreMapsReadyRef]);

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
        { placeId: p.placeId, fields: ["name", "formatted_address", "geometry"] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            setDropoff(place.name || place.formatted_address);
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

  // 🗺 Address chips on map — show truncated pickup/dropoff labels at marker positions
  const locationChipRefsRef = useRef({ pickup: null, dropoff: null });
  useEffect(() => {
    if (!coreMapsReadyRef.current || !coreMapInstanceRef.current || !window.google?.maps) return;

    const clearChips = () => {
      if (locationChipRefsRef.current.pickup) { locationChipRefsRef.current.pickup.map = null; locationChipRefsRef.current.pickup = null; }
      if (locationChipRefsRef.current.dropoff) { locationChipRefsRef.current.dropoff.map = null; locationChipRefsRef.current.dropoff = null; }
    };
    clearChips();

    const placeChip = async (position, label, accentColor, offsetX = 18, offsetY = -38) => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
      const el = document.createElement("div");
      el.style.cssText = [
        "background:#ffffff",
        "color:#111827",
        "padding:3px 9px 3px 7px",
        "border-radius:10px",
        `border-left:3px solid ${accentColor}`,
        "font-size:11px",
        "font-weight:600",
        "font-family:sans-serif",
        "box-shadow:0 2px 8px rgba(0,0,0,0.18)",
        "white-space:nowrap",
        "max-width:160px",
        "overflow:hidden",
        "text-overflow:ellipsis",
        "pointer-events:none",
        `transform:translate(${offsetX}px,${offsetY}px)`,
      ].join(";");
      el.textContent = label.split(",")[0].trim();
      return new AdvancedMarkerElement({ position, map: coreMapInstanceRef.current, content: el, zIndex: 15 });
    };

    const pickupPos = pickupMarkerRef.current?.position;
    const dropoffPos = dropoffMarkerRef.current?.position;
    if (pickup && pickupPos) placeChip(pickupPos, pickup, "#2d88e0").then((m) => { locationChipRefsRef.current.pickup = m; });
    if (dropoff && dropoffPos) placeChip(dropoffPos, dropoff, "#E53935").then((m) => { locationChipRefsRef.current.dropoff = m; });

    return clearChips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, markerVersion]);

  // 🧭 Auto-draw route when addresses change OR after async marker placement completes.
  // markerVersion increments in onMarkerUpdated which fires AFTER updateMapMarker awaits
  // importLibrary("marker") and sets the ref — this closes the race where setDropoff fires
  // the effect before dropoffMarkerRef.current is non-null, causing the guard to bail.
  useEffect(() => {
    if (!pickupMarkerRef.current || !dropoffMarkerRef.current) return;
    requestRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, stop, hasStop, markerVersion]);

  return (
    <>
      <div
        className={`relative h-[100dvh] overflow-hidden md:h-auto md:overflow-visible md:grid md:grid-cols-[420px_1fr] md:gap-6 md:items-start md:mb-6 ${!user && showAuthModal ? "blur-sm pointer-events-none select-none" : ""}`}
        onClick={() => {
          setPickupSuggestions([]);
          setDropoffSuggestions([]);
          setStopSuggestions([]);
        }}
      >

        {/* Form — bottom sheet on mobile, left column on desktop */}
        <div
          ref={sheetRef}
          className="absolute bottom-0 left-0 right-0 z-10 bg-white dark:bg-townwize-primaryDark rounded-t-2xl shadow-2xl flex flex-col h-[92vh] overflow-hidden md:static md:order-1 md:rounded-2xl md:shadow-xl md:w-full md:max-w-[420px] md:mx-0 md:h-auto md:overflow-visible"
          style={window.innerWidth < 768 ? {
            transform: selectingFor
              ? "translateY(85vh)"
              : sheetSnap === "full" ? "translateY(0)" : "translateY(32vh)",
            transition: "transform 400ms cubic-bezier(0.32, 0.72, 0, 1)",
          } : undefined}
          onTouchStart={(e) => {
            if (window.innerWidth >= 768) return;
            sheetDragStartY.current = e.touches[0].clientY;
          }}
          onTouchMove={(e) => {
            if (window.innerWidth >= 768 || sheetDragStartY.current == null || !sheetRef.current) return;
            const delta = e.touches[0].clientY - sheetDragStartY.current;
            const baseTranslate = sheetSnap === "full" ? 0 : window.innerHeight * 0.32;
            const clamped = Math.max(-20, Math.min(window.innerHeight * 0.32 + 20, baseTranslate + delta));
            sheetRef.current.style.transition = "none";
            sheetRef.current.style.transform = `translateY(${clamped}px)`;
          }}
          onTouchEnd={(e) => {
            if (window.innerWidth >= 768) return;
            const delta = e.changedTouches[0].clientY - (sheetDragStartY.current ?? e.changedTouches[0].clientY);
            if (sheetRef.current) {
              sheetRef.current.style.transition = "transform 400ms cubic-bezier(0.32, 0.72, 0, 1)";
            }
            if (delta < -40) setSheetSnap("full");
            else if (delta > 40) setSheetSnap("half");
            else if (sheetRef.current) {
              sheetRef.current.style.transform = sheetSnap === "full" ? "translateY(0)" : "translateY(32vh)";
            }
            sheetDragStartY.current = null;
          }}
        >
          {/* Drag handle — visual indicator only */}
          <div className="md:hidden flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 pb-3 pt-0 md:py-6 space-y-4">
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
                onClick={() => { setHasStop(false); setStop(""); clearMarker("stop"); }}
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
                // Place draggable stop marker at current map center immediately
                const map = coreMapInstanceRef.current;
                if (map) {
                  const center = map.getCenter();
                  if (center) {
                    const pos = { lat: center.lat(), lng: center.lng() };
                    updateMapMarker(pos, "stop");
                    reverseGeocode(center, (addr) => setStop(addr));
                  }
                }
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

          {/* ── Out-of-zone banner ── */}
          {routeReady && serviceAreaBlocked && !zoneCheck.loading && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Outside Townwize coverage</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                  Townwize currently operates within Bahria Town Karachi. We're expanding soon!
                </p>
              </div>
            </div>
          )}

          {/* ── Section label ── */}
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pt-1">
            Choose ride type
          </p>

          {/* ── Private Ride card ── */}
          <div
            onClick={() => {
              if (!routeReady) return;
              setSelectedType("Private Ride");
              if (!selectedCarType) setSelectedCarType("economy");
            }}
            className={`rounded-2xl border-2 transition-all duration-200 ${
              !routeReady
                ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700"
                : selectedType === "Private Ride"
                  ? "border-townwize-primary ring-2 ring-townwize-primary/10 cursor-pointer"
                  : "border-gray-200 dark:border-gray-700 hover:border-townwize-primary/40 cursor-pointer"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-townwize-primary/10 dark:bg-townwize-primary/20 flex items-center justify-center shrink-0">
                    <FaCarSide className="text-townwize-primary dark:text-townwize-accent text-xl" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Private Ride</p>
                    <p className="text-xs text-gray-400 mt-0.5">Your car, just for you</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {effectiveDistanceKm > 0 ? (
                    <>
                      <p className="font-extrabold text-townwize-primary dark:text-townwize-accent text-base leading-tight">
                        {quoteLoading && selectedType === "Private Ride"
                          ? <span className="inline-block tw-shimmer h-5 w-16 rounded-md" />
                          : `${getPreviewFare("Private Ride").toLocaleString()} PKR`
                        }
                        {/* NOTE: RideTogether's headline further down has no
                            equivalent shimmer, which is why a stale fare was
                            visible there and hidden here. */}
                      </p>
                      <p className="text-[11px] text-gray-400">{etaText || "—"} · {effectiveDistanceKm.toFixed(1)} km</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Enter route</p>
                  )}
                </div>
              </div>

              {/* Car class pills — inline, only when selected */}
              {selectedType === "Private Ride" && (
                <div className="mt-3 grid grid-cols-3 gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {CAR_CLASSES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedCarType(c.key)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                        selectedCarType === c.key
                          ? "bg-townwize-primary dark:bg-townwize-accent text-white dark:text-townwize-primary border-townwize-primary dark:border-townwize-accent shadow-sm"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-townwize-primary/40"
                      }`}
                    >
                      <span className="block">{c.title}</span>
                      {effectiveDistanceKm > 0 && (
                        <span className={`block text-[10px] mt-0.5 font-normal ${
                          selectedCarType === c.key ? "text-white/80 dark:text-townwize-primary/70" : "text-gray-400"
                        }`}>
                          {(Number(fare) > 0
                            ? selectedCarType === c.key
                              ? Number(fare)
                              : deriveClassFare(Number(fare), selectedCarType, c.key, effectiveDistanceKm, effectiveEtaMinutes)
                            : getLocalFallbackFare("Private Ride", c.key, effectiveDistanceKm, effectiveEtaMinutes)
                          ).toLocaleString()} PKR
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {/* Three identical prices look like a bug unless you say why.
                  On a short trip every class lands on the minimum fare, so
                  they genuinely cost the same — explain it rather than leaving
                  the passenger to wonder whether the app is broken. */}
              {selectedType === "Private Ride" &&
                effectiveDistanceKm > 0 &&
                pricing.minimumFare > 0 &&
                CAR_CLASSES.every(
                  (c) =>
                    getLocalFallbackFare("Private Ride", c.key, effectiveDistanceKm, effectiveEtaMinutes) ===
                    getLocalFallbackFare("Private Ride", CAR_CLASSES[0].key, effectiveDistanceKm, effectiveEtaMinutes)
                ) && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    Short trip — our minimum fare of{" "}
                    {pricing.minimumFare.toLocaleString()} PKR applies, so every car class costs the same.
                  </p>
                )}
              {quoteError && selectedType === "Private Ride" && (
                <p className="mt-2 text-[11px] text-amber-600">{quoteError}</p>
              )}
            </div>
          </div>

          {/* ── Scheduled ride banner ── */}
          {scheduledAt && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-base shrink-0">🗓</span>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Scheduling a shared ride</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {new Date(scheduledAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </div>
          )}

          {/* ── RideTogether card ── */}
          <div
            onClick={() => {
              if (!routeReady) return;
              setSelectedType("RideTogether");
            }}
            className={`rounded-2xl border-2 transition-all duration-200 ${
              !routeReady
                ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700"
                : selectedType === "RideTogether"
                  ? "border-townwize-accent ring-2 ring-townwize-accent/10 cursor-pointer"
                  : "border-gray-200 dark:border-gray-700 hover:border-townwize-accent/40 cursor-pointer"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-townwize-accent/10 flex items-center justify-center shrink-0">
                    <FaUsers className="text-townwize-accent text-xl" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">RideTogether</p>
                      <span className="text-[10px] font-bold text-white bg-townwize-accent px-2 py-0.5 rounded-full leading-none">
                        Share &amp; Save
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Share the ride · split the fare</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {effectiveDistanceKm > 0 ? (
                    <>
                      <p className="font-extrabold text-townwize-accent text-base leading-tight">
                        ~{Math.round(getPreviewFare("RideTogether") / 2).toLocaleString()} PKR
                      </p>
                      <p className="text-[11px] text-gray-400">per rider</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Enter route</p>
                  )}
                </div>
              </div>
              {effectiveDistanceKm > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-gray-400">
                    Full fare {getPreviewFare("RideTogether").toLocaleString()} PKR
                  </span>
                  <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                    · you save ~{Math.round(getPreviewFare("RideTogether") / 2).toLocaleString()} PKR
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Availability — single compact line ── */}
          {selectedType && routeReady && (
            <div className="flex items-start gap-2 px-1">
              {availability.loading ? (
                <>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-gray-500">Finding Wizars nearby…</span>
                </>
              ) : Number(availability.matchingDrivers || 0) > 0 ? (
                <>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {availability.matchingDrivers} Wizar{availability.matchingDrivers !== 1 ? "s" : ""} nearby
                    {availability.estimatedPickupMinutes != null
                      ? ` · ETA ~${availability.estimatedPickupMinutes} min`
                      : ""}
                  </span>
                </>
              ) : (
                <>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    No Wizars online right now — we'll match you as soon as one goes live
                  </span>
                </>
              )}
            </div>
          )}

          {/* ── Service zone — quiet green confirmation only ── */}
          {routeReady && serviceAreaReady && (
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <span className="text-xs text-green-700 dark:text-green-400">Inside active Townwize coverage</span>
            </div>
          )}
          {routeReady && zoneCheck.loading && (
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 shrink-0 rounded-full bg-gray-400 animate-pulse" />
              <span className="text-xs text-gray-500">Checking service coverage…</span>
            </div>
          )}

          {/* ── Toll line ── */}
          {routeReady && tollAmount > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3.5 py-2.5">
              <span className="text-base shrink-0 mt-0.5">🛣</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Toll{tollNames.length > 1 ? "s" : ""}: {tollNames.join(", ")}
                  </p>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 shrink-0">
                    +PKR {tollAmount.toLocaleString()}
                  </p>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  Included in your fare · cash rate quoted
                </p>
              </div>
            </div>
          )}

          </div>{/* end scrollable content */}

          {/* ── Sticky Book CTA — always pinned to bottom of sheet, never scrolls away ── */}
          <div
            ref={continueAreaRef}
            className="shrink-0 px-5 pt-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-townwize-primaryDark"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
          >
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
              className={`w-full py-3.5 rounded-xl font-bold text-sm overflow-hidden shadow-md relative transition-all ${
                pickup && dropoff && selectedType && serviceAreaReady
                  ? "text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
              }`}
            >
              {pickup && dropoff && selectedType && (
                <span
                  className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                    searching
                      ? "bg-gradient-to-r from-townwize-primary to-townwize-primaryDark animate-pulse"
                      : "bg-townwize-primary dark:bg-townwize-accent hover:opacity-90"
                  }`}
                />
              )}
              <span className={`relative z-10 ${pickup && dropoff && selectedType ? "dark:text-townwize-primary" : ""}`}>
                {quoteLoading
                  ? "Calculating fare…"
                  : searching
                    ? "Preparing…"
                    : !selectedType
                      ? "Select a ride type"
                      : selectedType === "Private Ride" && !selectedCarType
                        ? "Select a car class above"
                        : `Book ${selectedType === "RideTogether" ? "RideTogether" : "Private Ride"} →`
                }
              </span>
            </button>
          </div>
        </div>{/* end sheet */}

        {/* Map — full screen on mobile, right column on desktop */}
        <div className="absolute inset-0 md:static md:order-2 md:h-[calc(100vh-160px)] md:rounded-2xl md:shadow-lg md:border md:border-gray-200 dark:md:border-gray-700 md:overflow-hidden md:relative">
          <div ref={coreMapRef} className="w-full h-full" />
          <RouteLoaderOverlay isVisible={isCalculatingRoute} />
        </div>

        {/* Map selection overlay — rendered as sibling so z-20 clears the sheet (z-10) */}
        <MapSelectionOverlay
          selectingFor={selectingFor}
          onCancel={() => setSelectingFor(null)}
          onConfirm={() => {
            if (!coreMapInstanceRef.current) return;
            const center = coreMapInstanceRef.current.getCenter();
            const latLng = { lat: center.lat(), lng: center.lng() };
            const target = selectingFor;
            updateMapMarker(latLng, target);
            reverseGeocode(latLng, (addr) => {
              if (target === "pickup") setPickup(addr);
              if (target === "stop") setStop(addr);
              if (target === "dropoff") setDropoff(addr);
            });
            setSelectingFor(null);
          }}
        />

        {/* Back button — floats over map, mobile only */}
        <button
          type="button"
          onTouchStart={(e) => { e.stopPropagation(); navigate(routeStateRaw?.from || "/passenger/home"); }}
          onClick={() => navigate(routeStateRaw?.from || "/passenger/home")}
          className="absolute top-4 left-4 z-20 md:hidden bg-white dark:bg-gray-800 rounded-full p-2.5 shadow-lg text-gray-700 dark:text-white active:scale-95 transition-transform"
        >
          <FaArrowLeft className="text-sm" />
        </button>
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
