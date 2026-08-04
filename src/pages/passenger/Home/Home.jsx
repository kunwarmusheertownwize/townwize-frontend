/* global google */
import { useState, useEffect, useMemo, useRef } from "react";
import { loadGoogleMaps, resetGoogleMapsLoader, } from "../../../utils/googleMapsLoader";
import { resolveAddressFromCoords } from "../../../utils/locationResolver";
// Components
import HeroForm from "./HeroForm/HeroForm";
import FeaturesSection from "./FeaturesSection";
import RecentTrips from "./RecentTrips";
import AppPromo from "./AppPromo";
import ReferralNotice from "./ReferralNotice";
import Navbar from "../../../components/shared/Navbar";
//import BTKMapContainer from "./BTKMapContainer";
// Hooks
//import { useContext } from "react";
import AuthContext from "../../../contexts/AuthContext";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
//import { Loader } from "@googlemaps/js-api-loader";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from "date-fns";

// ✅ Fix: restore Google Maps context without full reload
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    resetGoogleMapsLoader();
    sessionStorage.setItem("forceReload", "1");
  }
});

// Home component for the passenger dashboard
const Home = () => {
 // const { user } = useContext(AuthContext);

  const [dropoff, setDropoff] = useState("");
  const [pickup, setPickup] = useState("");
  // Date/Time
  const [pickupDate, setPickupDate] = useState(new Date());   // show today's date by default
  const [pickupTime, setPickupTime] = useState("now");
  const [locating, setLocating] = useState(false);
  // Suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const dropoffRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const locationBiasRef = useRef(null);
  const currentCoordsRef = useRef(null);
  // Dropoff coordinates were available from the Places lookup but only ever
  // captured for pickup, so the next screen had to re-geocode the dropoff text.
  // In BTK nearly every precinct has a "Rd 14", so that lands on whichever one
  // Google prefers — a different precinct entirely.
  const dropoffCoordsRef = useRef(null);
  // Recent pickups dropdown
  const [showRecentPickups, setShowRecentPickups] = useState(false);
  const [recentPickups, setRecentPickups] = useState([]);
  // Calendar
  const [month, setMonth] = useState(new Date())
  // Booking confirmed?
  const [rideConfirmed, setRideConfirmed] = useState(false);

  const generateCalendar = (month) => {
    const startDate = startOfWeek(startOfMonth(month))
    const endDate = endOfWeek(endOfMonth(month))
    const days = []
    let day = startDate
    while (day <= endDate) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }

  // --- Google Maps/Places refs ---
  const mapsReadyRef = useRef(false);
  //const autoServiceRef = useRef(null);     // google.maps.places.AutocompleteService
  //const placesServiceRef = useRef(null);   // google.maps.places.PlacesService
  const geocoderRef = useRef(null);        // google.maps.Geocoder
  const psContainerRef = useRef(null);     // dummy div for PlacesService
  const mapRef = useRef(null);             // container for Google Map
  const mapInstanceRef = useRef(null);     // map instance

  // Build 15‑min slots from the next quarter hour for the next 12 hours
  const timeSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const start = new Date(now);
    const m = start.getMinutes();
    const add = (15 - (m % 15)) % 15;
    start.setMinutes(m + (add || 15), 0, 0);   // round up; never “now”
    const end = new Date(now);
    end.setHours(now.getHours() + 12, 0, 0, 0);

    for (let t = new Date(start); t <= end; t.setMinutes(t.getMinutes() + 15)) {
      const value = t.toTimeString().slice(0, 5); // "HH:MM"
      const label = t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      slots.push({ value, label });
    }
    return slots;
  }, []);
  // ── Recent pickups helpers ─────────────────────────────────────────────
  const loadRecentPickups = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("_tw_recent_pickups") || "[]");
      setRecentPickups(Array.isArray(stored) ? stored : []);
    } catch {
      setRecentPickups([]);
    }
  };

  const handlePickupFocus = () => {
    loadRecentPickups();
    setShowRecentPickups(true);
  };

  const handleSelectRecentPickup = (entry) => {
    setPickup(entry.address);
    if (entry.lat != null && entry.lng != null) {
      currentCoordsRef.current = { lat: entry.lat, lng: entry.lng };
    }
    setShowRecentPickups(false);
    setPickupSuggestions([]);
    if (dropoffRef.current) dropoffRef.current.focus();
  };

  const handleRemoveRecentPickup = (address, e) => {
    e.stopPropagation();
    try {
      const stored = JSON.parse(localStorage.getItem("_tw_recent_pickups") || "[]");
      const updated = stored.filter((e) => e.address !== address);
      localStorage.setItem("_tw_recent_pickups", JSON.stringify(updated));
      setRecentPickups(updated);
    } catch {}
  };

  const handleClearRecentPickups = () => {
    localStorage.removeItem("_tw_recent_pickups");
    setRecentPickups([]);
    setShowRecentPickups(false);
  };

  // ✅ Run map reload after remount (handles Back navigation)
  useEffect(() => {
    const handleForceReload = () => {
      if (sessionStorage.getItem("forceReload") === "1") {
        sessionStorage.removeItem("forceReload");
        mapsReadyRef.current = false;
      }
    };

    handleForceReload();
    window.addEventListener("focus", handleForceReload);

    return () => window.removeEventListener("focus", handleForceReload);
  }, []);

  // Load Google Maps JS API (Places)
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      toast.error("Google API key missing. Add VITE_GOOGLE_MAPS_API_KEY in .env");
      return;
    }
    // ✅ Prevent duplicate loads
    // ✅ Allow reload if script was cleared via Back navigation
    if (
      mapsReadyRef.current &&
      window.google?.maps?.places &&
      !sessionStorage.getItem("forceReload")
    ) {
      return;
    }

    loadGoogleMaps()
      .then(async () => {
        //if (!isMounted) return;

        // ✔ Correct detection with new Google Maps API
        if (!window.google?.maps) {
          toast.error("Google Maps failed to initialize.");
          return;
        }

        try {
          const { AutocompleteSessionToken } =
            await google.maps.importLibrary("places");

          sessionTokenRef.current = new AutocompleteSessionToken();
          geocoderRef.current = new google.maps.Geocoder();
          mapsReadyRef.current = true;

          if (mapRef.current && !mapInstanceRef.current) {
            mapInstanceRef.current = new google.maps.Map(mapRef.current, {
              center: { lat: 25.08994, lng: 67.34764 },
              zoom: 13,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            });
          }
        } catch (e) {
          console.error("Places import failed:", e);
          toast.error("Unable to load Google Places service.");
        }
      })
      .catch((err) => {
        console.error("Google Maps load failed:", err);
        toast.error((err && err.message) || "Failed to load Google Maps (see console).");
      });
    return () => {
      //isMounted = false;
    };
  }, []);

  // Return the full formatted address Google provides, stripping any Plus Code prefix.
  const formatAddress = (result) => {
    if (!result) return "";
    const formatted = result.formatted_address || result.formattedAddress || "";
    // Strip leading Plus Code (e.g. "49C5+6MR, Phase 8…" → "Phase 8…")
    return formatted.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}[, ]+/, "").trim();
  };

  const navigate = useNavigate();

  /* const handleFindRide = () => {
    if (!dropoff.trim()) {
      toast.error("Please enter a dropoff location");
      return;
    }
    // 🔒 Action-level auth enforcement
    if (!user) {
      navigate("/login", {
        state: {
          from: "/passenger/home",
          pickup,
          pickupCoords: currentCoordsRef.current,
          dropoff,
        },
        replace: true,
      });
      return;
    }

    // ✅ Authenticated → proceed
    navigate("/passenger/select-ride", {
      state: {
        pickup,
        pickupCoords: currentCoordsRef.current,
        dropoff,
      },
    });
  }; */

  const handleFindRide = () => {
    if (!dropoff.trim()) {
      toast.error("Please enter a dropoff location");
      return;
    }

    let scheduledAt = null;
    if (pickupTime && pickupTime !== "now") {
      const [hours, minutes] = pickupTime.split(":").map(Number);
      const dt = new Date(pickupDate);
      dt.setHours(hours, minutes, 0, 0);
      if (dt > new Date()) scheduledAt = dt.toISOString();
    }

    navigate("/passenger/select-ride", {
      state: {
        pickup,
        pickupCoords: currentCoordsRef.current,
        dropoff,
        // Carried so the next screen can place the pin exactly, instead of
        // re-geocoding the address text and landing on a same-named road in
        // another precinct.
        dropoffCoords: dropoffCoordsRef.current,
        ...(scheduledAt ? { scheduledAt } : {}),
      },
      replace: true,
    });
  };


  const handleGetCurrentLocation = () => {
    if (locating) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }

    setLocating(true);

    const successHandler = async (pos) => {
      const { latitude, longitude } = pos.coords;

      try {
        const address = await resolveAddressFromCoords(latitude, longitude);
        setPickup(address);
        requestAnimationFrame(() => dropoffRef.current?.focus());
      } catch (err) {
        console.error("Reverse geocode failed:", err);
        toast.error("Unable to resolve your location");
      } finally {
        setLocating(false);
      }
    };

    const errorHandler = (err) => {
      console.error("Geolocation error:", err);

      switch (err.code) {
        case err.PERMISSION_DENIED:
          toast.error("Location permission denied");
          break;
        case err.POSITION_UNAVAILABLE:
          toast.error("Location unavailable");
          break;
        case err.TIMEOUT:
          toast.error("Location request timed out");
          break;
        default:
          toast.error("Unable to fetch location");
      }

      setLocating(false);
    };

    // FIRST: fast, low-accuracy attempt (best for desktop)
    navigator.geolocation.getCurrentPosition(
      successHandler,
      (err) => {
        // If timeout, retry once with high accuracy
        if (err.code === err.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            successHandler,
            errorHandler,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        } else {
          errorHandler(err);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 60000,
      }
    );
  };


  // === Places Autocomplete (Pickup) ===
  const fetchPickupSuggestions = async (input) => {
    if (!mapsReadyRef.current || !input) {
      setPickupSuggestions([]);
      return;
    }
    try {
      const { AutocompleteSuggestion } = await google.maps.importLibrary("places");
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        region: "pk",
        locationBias: locationBiasRef.current
          ? {
            south: locationBiasRef.current.south,
            west: locationBiasRef.current.west,
            north: locationBiasRef.current.north,
            east: locationBiasRef.current.east
          }
          : undefined
      });
      setPickupSuggestions(suggestions || []);
    } catch (err) {
      console.error("Pickup suggestions failed:", err);
      setPickupSuggestions([]);
    }
  };

  const fetchDropoffSuggestions = async (input) => {
    if (!mapsReadyRef.current || !input) {
      setDropoffSuggestions([]);
      return;
    }
    try {
      const { AutocompleteSuggestion } = await google.maps.importLibrary("places");
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        region: "pk",
        locationBias: locationBiasRef.current
          ? {
            south: locationBiasRef.current.south,
            west: locationBiasRef.current.west,
            north: locationBiasRef.current.north,
            east: locationBiasRef.current.east
          }
          : undefined
      });
      setDropoffSuggestions(suggestions || []);
    } catch (err) {
      console.error("Dropoff suggestions failed:", err);
      setDropoffSuggestions([]);
    }
  };

  // On select a prediction → getDetails to resolve a clean address string
  const resolvePlace = async (prediction, setter) => {
    try {
      if (prediction?.placePrediction) {
        const place = prediction.placePrediction.toPlace();
        const p = await place.fetchFields({
          fields: ["formattedAddress", "addressComponents", "location"]
        });

        const addr = formatAddress(p);
        setter(addr || prediction.placePrediction.text?.text || "");

        // Capture lat/lng for the pickup field
        if (setter === setPickup) {
          setPickupSuggestions([]);
          setShowRecentPickups(false);
          const loc = p?.location || p?.Fg; // New Places API: location is the LatLng
          if (loc && typeof loc.lat === "function") {
            currentCoordsRef.current = { lat: loc.lat(), lng: loc.lng() };
          }
        }
        if (setter === setDropoff) {
          setDropoffSuggestions([]);
          const dloc = p?.location || p?.Fg;
          if (dloc && typeof dloc.lat === "function") {
            dropoffCoordsRef.current = { lat: dloc.lat(), lng: dloc.lng() };
          }
        }

        // start a new session after selection
        const { AutocompleteSessionToken } = await google.maps.importLibrary("places");
        sessionTokenRef.current = new AutocompleteSessionToken();
        return;
      }

      if (prediction?.place_id) {
        const place = new google.maps.places.Place({ id: prediction.place_id });
        const p = await place.fetchFields({
          fields: ["formatted_address", "address_components", "geometry"]
        });

        const addr = formatAddress(p);
        setter(addr || prediction.description || "");

        // Capture lat/lng for the pickup field
        if (setter === setPickup) {
          setPickupSuggestions([]);
          setShowRecentPickups(false);
          const geom = p?.geometry?.location;
          if (geom && typeof geom.lat === "function") {
            currentCoordsRef.current = { lat: geom.lat(), lng: geom.lng() };
          }
        }
        if (setter === setDropoff) {
          setDropoffSuggestions([]);
          const dgeom = p?.geometry?.location;
          if (dgeom && typeof dgeom.lat === "function") {
            dropoffCoordsRef.current = { lat: dgeom.lat(), lng: dgeom.lng() };
          }
        }

        const { AutocompleteSessionToken } = await google.maps.importLibrary("places");
        sessionTokenRef.current = new AutocompleteSessionToken();
        return;
      }

      setter(prediction?.description || prediction?.text || "");
    } catch (err) {
      console.error("Error resolving place:", err);
      setter(prediction?.description || prediction?.text || "");
    }
  };

  // State to manage the height of the hero form (unchanged)
  useEffect(() => {
    const setHeight = () => {
      if (window.innerWidth >= 768) {
        const formHeight = document.getElementById("hero-form")?.offsetHeight;
        if (formHeight) {
          document.documentElement.style.setProperty("--hero-form-height", `${formHeight}px`);
        }
      } else {
        document.documentElement.style.removeProperty("--hero-form-height");
      }
    };
    setHeight();
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, []);

  // Swap pickup & dropoff (including fixing coordinates)
  const handleSwap = () => {
    // swap text fields
    const temp = pickup;
    setPickup(dropoff);
    setDropoff(temp);

    // clear suggestions
    setPickupSuggestions([]);
    setDropoffSuggestions([]);

    // reset pickup coords — prevents wrong marker on SelectRide
    currentCoordsRef.current = null;

  };

  /* useEffect(() => {
    if (!loading && user) {
      navigate("/passenger/dashboard", { replace: true });
    }
  }, [loading, user, navigate]); */



  return (
    <> {/* invisible container for PlacesService */}

      <div ref={psContainerRef} style={{ display: "none" }} />

      <div className="mx-auto max-w-7xl px-4 md:px-8 grid grid-cols-1 lg:grid-cols-[minmax(0,520px)_1fr] gap-8 items-start mb-10">

        {/* Left: Hero Form */}
        <HeroForm
          pickup={pickup} setPickup={setPickup}
          pickupSuggestions={pickupSuggestions}
          setPickupSuggestions={setPickupSuggestions}
          fetchPickupSuggestions={fetchPickupSuggestions}
          resolvePlace={resolvePlace}
          dropoff={dropoff}
          setDropoff={setDropoff}
          dropoffSuggestions={dropoffSuggestions}
          setDropoffSuggestions={setDropoffSuggestions}
          fetchDropoffSuggestions={fetchDropoffSuggestions}
          dropoffRef={dropoffRef}
          handleGetCurrentLocation={handleGetCurrentLocation}
          locating={locating}
          pickupDate={pickupDate}
          setPickupDate={setPickupDate}
          pickupTime={pickupTime}
          setPickupTime={setPickupTime}
          month={month}
          setMonth={setMonth}
          generateCalendar={generateCalendar}
          timeSlots={timeSlots}
          rideConfirmed={rideConfirmed}
          setRideConfirmed={setRideConfirmed}
          handleFindRide={handleFindRide}
          handleSwap={handleSwap}
          recentPickups={recentPickups}
          showRecentPickups={showRecentPickups}
          setShowRecentPickups={setShowRecentPickups}
          onPickupFocus={handlePickupFocus}
          onSelectRecentPickup={handleSelectRecentPickup}
          onRemoveRecentPickup={handleRemoveRecentPickup}
          onClearRecentPickups={handleClearRecentPickups}
        />

        {/* Right: Illustration */}
        <div className="hidden md:block">
          <img
            src="/images/hero-illustration.png"
            alt="Townwize Ride"
            className="w-full object-cover rounded-xl shadow-lg md:[height:var(--hero-form-height)]"
          />
        </div>
      </div>
      {/* Features Section — Web only */}
      <div className="hidden md:block">
        <FeaturesSection />
      </div>

      {/* Recent Trips Placeholder */}
      <RecentTrips />

      {/* App Promo Section */}
      <div className="hidden md:block">
        <AppPromo />
      </div>

      {/* Referral Notice */}
      {/* Referral Notice — Web only */}
      <div className="hidden md:block">
        <ReferralNotice />
      </div>

      {/* BTK Custom Map Layer */}
      {/* <BTKMapContainer mapRef={mapRef} mapInstanceRef={mapInstanceRef} /> */}
      {/* <BTKMapContainer
        mapRef={mapRef}
        mapInstanceRef={mapInstanceRef}
        pickupCoords={pickup?.coords}
      />
 */}
    </>
  );
};

export default Home;