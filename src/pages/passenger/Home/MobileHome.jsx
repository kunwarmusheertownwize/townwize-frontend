/* global google */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft, FaCrosshairs, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { App } from "@capacitor/app";
import { loadGoogleMaps, resetGoogleMapsLoader } from "../../../utils/googleMapsLoader";
import { resolveAddressFromCoords } from "../../../utils/locationResolver";

window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    resetGoogleMapsLoader();
    sessionStorage.setItem("forceReload", "1");
  }
});

const BTK = { lat: 25.08994, lng: 67.34764 };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function getFirstName() {
  try {
    return (
      JSON.parse(localStorage.getItem("auth") || "{}")?.user?.name?.split(" ")[0] || "there"
    );
  } catch {
    return "there";
  }
}

export default function MobileHome() {
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState("dropoff");
  const [locating, setLocating] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [mapDropoffResolving, setMapDropoffResolving] = useState(false);
  // Triggers map init after Maps library is ready (fires after a React render/paint)
  const [mapsReady, setMapsReady] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapsReadyRef = useRef(false);   // fast sync access for fetchSuggestions
  const sessionTokenRef = useRef(null);
  const currentCoordsRef = useRef(null);
  const userMarkerRef = useRef(null);
  const dropoffInputRef = useRef(null);
  const pickupInputRef = useRef(null);
  const searchMapRef = useRef(null);
  const searchMapInstanceRef = useRef(null);
  const searchMapIdleTimerRef = useRef(null);
  const searchMapDraggedRef = useRef(false);
  const searchUserTypedRef = useRef(false);

  // ── Google Maps script load ──────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      if (sessionStorage.getItem("forceReload") === "1") {
        sessionStorage.removeItem("forceReload");
        mapsReadyRef.current = false;
        mapInstanceRef.current = null;
        setMapsReady(false);
      }
    };
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) return;
    if (mapsReadyRef.current && window.google?.maps?.places) return;

    loadGoogleMaps()
      .then(async () => {
        if (!window.google?.maps) return;
        const { AutocompleteSessionToken } = await google.maps.importLibrary("places");
        sessionTokenRef.current = new AutocompleteSessionToken();
        mapsReadyRef.current = true;
        // Trigger state update so the map-init useEffect runs AFTER React re-renders
        // (guarantees the map div has been painted and has non-zero dimensions)
        setMapsReady(true);
      })
      .catch(console.error);
  }, []);

  // ── Map init — runs AFTER mapsReady state flip (post-paint) ─────────────
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        const { Map } = await google.maps.importLibrary("maps");
        if (!mapRef.current || mapInstanceRef.current) return;
        mapInstanceRef.current = new Map(mapRef.current, {
          center: BTK,
          zoom: 15,
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
          disableDefaultUI: true,
          gestureHandling: "greedy",
        });
        // Defer resize — Android WebView layout may not be committed yet
        setTimeout(() => {
          if (mapInstanceRef.current) {
            google.maps.event.trigger(mapInstanceRef.current, "resize");
            mapInstanceRef.current.setCenter(BTK);
          }
        }, 150);
      } catch (e) {
        console.error("Map init failed:", e);
      }
    };

    initMap();
  }, [mapsReady]);

  // ── Auto-locate on mount ─────────────────────────────────────────────────
  useEffect(() => { locate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Focus dropoff when search mode opens ─────────────────────────────────
  useEffect(() => {
    if (!searchMode) return;
    const t = setTimeout(() => dropoffInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [searchMode]);

  // ── Hardware back button (Capacitor) ────────────────────────────────────
  useEffect(() => {
    if (!searchMode) return;
    let handle;
    App.addListener("backButton", () => {
      setSearchMode(false);
      setSuggestions([]);
    }).then((h) => { handle = h; });
    return () => { handle?.remove(); };
  }, [searchMode]);

  // ── Search overlay drag-map init ─────────────────────────────────────────
  useEffect(() => {
    if (!searchMode || !mapsReady) return;
    if (searchMapInstanceRef.current) return;
    let cancelled = false;
    // Wait for the slide-up animation (300ms) before reading div dimensions
    const timer = setTimeout(async () => {
      if (cancelled || !searchMapRef.current || searchMapInstanceRef.current) return;
      try {
        const { Map } = await google.maps.importLibrary("maps");
        if (cancelled || searchMapInstanceRef.current) return;
        const center = currentCoordsRef.current || BTK;
        searchMapInstanceRef.current = new Map(searchMapRef.current, {
          center, zoom: 16,
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
          disableDefaultUI: true,
          gestureHandling: "greedy",
        });
        google.maps.event.trigger(searchMapInstanceRef.current, "resize");
        searchMapInstanceRef.current.setCenter(center);
        searchMapInstanceRef.current.addListener("dragstart", () => {
          searchMapDraggedRef.current = true;
        });
        searchMapInstanceRef.current.addListener("idle", () => {
          if (!searchMapDraggedRef.current) return; // only update dropoff when user explicitly dragged the map
          clearTimeout(searchMapIdleTimerRef.current);
          searchMapIdleTimerRef.current = setTimeout(async () => {
            if (!searchMapInstanceRef.current) return;
            const c = searchMapInstanceRef.current.getCenter();
            if (!c) return;
            setMapDropoffResolving(true);
            try {
              const addr = await resolveAddressFromCoords(c.lat(), c.lng());
              if (addr) setDropoff(addr);
            } catch { /* silent */ }
            setMapDropoffResolving(false);
          }, 600);
        });
      } catch { /* silent */ }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchMode, mapsReady]);

  // ── Search overlay drag-map cleanup ─────────────────────────────────────
  useEffect(() => {
    if (searchMode) {
      searchMapDraggedRef.current = false;
      searchUserTypedRef.current = false;
      return;
    }
    clearTimeout(searchMapIdleTimerRef.current);
    if (searchMapInstanceRef.current) {
      google.maps.event.clearInstanceListeners(searchMapInstanceRef.current);
      searchMapInstanceRef.current = null;
    }
  }, [searchMode]);

  // ── Geolocation ──────────────────────────────────────────────────────────
  async function locate() {
    if (locating || !navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        currentCoordsRef.current = { lat: latitude, lng: longitude };

        try {
          const addr = await resolveAddressFromCoords(latitude, longitude);
          setPickup(addr);
        } catch { /* silent — address is optional */ }

        try {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
            mapInstanceRef.current.setZoom(16);
          }
          const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
          const dot = document.createElement("div");
          dot.style.cssText =
            "width:14px;height:14px;border-radius:50%;background:#03311C;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)";
          if (userMarkerRef.current) {
            userMarkerRef.current.position = { lat: latitude, lng: longitude };
          } else {
            userMarkerRef.current = new AdvancedMarkerElement({
              map: mapInstanceRef.current,
              position: { lat: latitude, lng: longitude },
              content: dot,
            });
          }
        } catch { /* map not ready yet — marker skipped */ }

        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    );
  }

  // ── Autocomplete ─────────────────────────────────────────────────────────
  async function fetchSuggestions(input) {
    if (!mapsReadyRef.current || !input?.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const { AutocompleteSuggestion } = await google.maps.importLibrary("places");
      const { suggestions: s } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        region: "pk",
      });
      setSuggestions(s || []);
    } catch {
      setSuggestions([]);
    }
  }

  async function resolvePlace(prediction) {
    const setter = activeField === "pickup" ? setPickup : setDropoff;
    try {
      const place = prediction?.placePrediction?.toPlace?.();
      if (place) {
        const p = await place.fetchFields({ fields: ["formattedAddress", "location"] });
        const addr = (p.formattedAddress || "")
          .replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}[, ]+/, "")
          .trim();
        setter(addr || prediction.placePrediction.text?.text || "");
        const { AutocompleteSessionToken } = await google.maps.importLibrary("places");
        sessionTokenRef.current = new AutocompleteSessionToken();
        const selectedLoc = activeField === "dropoff" ? p.location : null;
        setSuggestions([]);
        // Pan search map AFTER suggestions clear (map becomes visible again)
        if (selectedLoc && searchMapInstanceRef.current) {
          requestAnimationFrame(() => { searchMapInstanceRef.current?.setCenter(selectedLoc); });
        }
        if (activeField === "pickup") {
          setActiveField("dropoff");
          setTimeout(() => dropoffInputRef.current?.focus(), 50);
        }
        return;
      }
    } catch { /* fall through */ }
    setter(prediction?.description || prediction?.text || "");
    setSuggestions([]);
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  function handleFindRide() {
    if (!dropoff.trim()) {
      toast.error("Please enter a dropoff location");
      return;
    }
    navigate("/passenger/select-ride", {
      state: { pickup, pickupCoords: currentCoordsRef.current, dropoff },
      replace: true,
    });
  }

  function handleSwap() {
    setPickup(dropoff);
    setDropoff(pickup);
    setSuggestions([]);
    currentCoordsRef.current = null;
  }

  function closeSearch() {
    setSearchMode(false);
    setSuggestions([]);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const firstName = getFirstName();

  return (
    <div className="h-full relative overflow-hidden">

      {/* Map — always in DOM so the map instance stays alive */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Locate-me button */}
      <button
        onClick={locate}
        className="absolute top-4 right-4 z-10 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 touch-manipulation"
      >
        <FaCrosshairs
          className={`text-townwize-primary text-base ${locating ? "animate-spin" : ""}`}
        />
      </button>

      {/* ── Bottom card (map view) ──────────────────────────────────────── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl shadow-2xl px-5 pt-3 pb-5 transition-transform duration-300 ${
          searchMode ? "pointer-events-none" : ""
        }`}
        style={{ transform: searchMode ? "translateY(120%)" : "translateY(0)" }}
      >
        {/* Drag handle */}
        <div className="w-10 h-[3px] bg-gray-200 rounded-full mx-auto mb-4" />

        <h2 className="text-xl font-bold text-townwize-primary">
          {greeting()}, {firstName}
        </h2>
        <p className="text-sm text-gray-400 mt-0.5 mb-4">Where are you going today?</p>

        {/* Where to? tap target */}
        <button
          onClick={() => {
            setSearchMode(true);
            setActiveField("dropoff");
          }}
          className="w-full flex items-center gap-3 bg-gray-100 px-4 py-3.5 rounded-2xl active:scale-[0.98] touch-manipulation transition-transform"
        >
          <div className="w-8 h-8 bg-townwize-primary rounded-full flex items-center justify-center flex-shrink-0">
            <FaSearch className="text-white text-[11px]" />
          </div>
          <span className="text-gray-500 text-sm font-medium">
            {dropoff || "Where to?"}
          </span>
        </button>

        {/* Quick find ride if dropoff is set */}
        {dropoff && (
          <button
            onClick={handleFindRide}
            className="mt-3 w-full py-4 bg-townwize-primary text-white rounded-2xl font-bold text-[15px] active:scale-95 touch-manipulation transition-transform"
          >
            Find a Ride →
          </button>
        )}
      </div>

      {/* ── Search overlay — Portal so it escapes all parent stacking contexts ── */}
      {createPortal(
        <div
          className={`fixed inset-0 z-[9999] bg-white flex flex-col transition-transform duration-300 ${
            !searchMode ? "pointer-events-none" : ""
          }`}
          style={{ transform: searchMode ? "translateY(0)" : "translateY(100%)" }}
          aria-hidden={!searchMode}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Header — padded below status bar */}
          <div
            className="flex items-center gap-2 px-2 border-b border-gray-100 flex-shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 8px)", paddingBottom: "8px" }}
          >
            <button
              onTouchStart={(e) => { e.stopPropagation(); closeSearch(); }}
              onClick={closeSearch}
              className="p-3 rounded-full active:bg-gray-100 touch-manipulation"
              style={{ minWidth: 48, minHeight: 48 }}
            >
              <FaArrowLeft className="text-townwize-primary text-base" />
            </button>
            <span className="font-semibold text-gray-900 text-[15px]">Plan your ride</span>
          </div>

          {/* Inputs */}
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <div className="relative space-y-2">
              {/* Vertical connector line */}
              <span className="absolute left-[11px] top-[26px] bottom-[18px] w-px bg-gray-200 z-10" />

              {/* Pickup */}
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-townwize-primary z-20" />
                <input
                  ref={pickupInputRef}
                  type="text"
                  value={pickup}
                  placeholder="Pickup location"
                  onFocus={() => {
                    setActiveField("pickup");
                    fetchSuggestions(pickup);
                  }}
                  onChange={(e) => {
                    searchUserTypedRef.current = true;
                    setPickup(e.target.value);
                    clearTimeout(window.__tw_mp);
                    window.__tw_mp = setTimeout(() => fetchSuggestions(e.target.value), 300);
                  }}
                  className="w-full pl-8 pr-10 py-3.5 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-gray-50 focus:ring-2 focus:ring-townwize-primary/20"
                />
                <button
                  onClick={locate}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 touch-manipulation"
                >
                  <FaCrosshairs
                    className={`text-townwize-primary ${locating ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {/* Swap */}
              <div className="flex justify-center z-20 relative my-0.5">
                <button
                  onClick={handleSwap}
                  className="bg-white border border-gray-200 rounded-full p-1.5 shadow-sm active:scale-95 touch-manipulation"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 text-townwize-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M17 7H7m0 0l4-4m-4 4l4 4M7 17h10m0 0l-4 4m4-4l-4-4"
                    />
                  </svg>
                </button>
              </div>

              {/* Dropoff */}
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 z-20" />
                <input
                  ref={dropoffInputRef}
                  type="text"
                  value={dropoff}
                  placeholder="Where to?"
                  onFocus={() => {
                    setActiveField("dropoff");
                    fetchSuggestions(dropoff);
                  }}
                  onChange={(e) => {
                    searchUserTypedRef.current = true;
                    setDropoff(e.target.value);
                    clearTimeout(window.__tw_md);
                    window.__tw_md = setTimeout(() => fetchSuggestions(e.target.value), 200);
                  }}
                  className="w-full pl-8 pr-3 py-3.5 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-gray-50 focus:ring-2 focus:ring-townwize-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Suggestions list OR drag-to-set map */}
          <div className="flex-1 relative overflow-hidden">
            {/* Map always in DOM — unmounting detaches Google Maps from its container element */}
            <div className={`absolute inset-0${suggestions.length > 0 ? " invisible pointer-events-none" : ""}`}>
              <div ref={searchMapRef} className="absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div style={{ marginBottom: "36px" }}>
                  <FaMapMarkerAlt className="text-red-500 text-4xl" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))" }} />
                </div>
              </div>
              {mapDropoffResolving && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-gray-600 shadow-md z-20 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 border-2 border-townwize-primary border-t-transparent rounded-full animate-spin" />
                  Locating…
                </div>
              )}
            </div>
            {/* Suggestions overlay — white background covers the map */}
            {suggestions.length > 0 && (
              <ul className="absolute inset-0 overflow-y-auto bg-white z-10">
                {suggestions.map((p, idx) => (
                  <li
                    key={p?.placePrediction?.placeId || idx}
                    onTouchStart={(e) => { e.stopPropagation(); resolvePlace(p); }}
                    onClick={() => resolvePlace(p)}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 border-b border-gray-50 touch-manipulation cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FaMapMarkerAlt className="text-gray-400 text-sm" />
                    </div>
                    <span className="text-[13px] text-gray-800 leading-snug">
                      {p?.placePrediction?.text?.text || p.description || p.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Find Ride button + stop hint — shows as soon as dropoff is entered */}
          {dropoff && (
            <div
              className="px-4 pt-3 pb-3 border-t border-gray-100 flex-shrink-0 space-y-2"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
            >
              <div className="flex items-center gap-2 bg-townwize-primary/8 border border-townwize-primary/20 rounded-xl px-3 py-2">
                <span className="text-townwize-primary font-bold text-sm leading-none">+</span>
                <span className="text-xs font-medium text-townwize-primary leading-snug">
                  You can <span className="font-bold">add a stop</span> on the next screen — if you need to!
                </span>
              </div>
              <button
                onTouchStart={(e) => { e.stopPropagation(); handleFindRide(); }}
                onClick={handleFindRide}
                className="w-full py-4 bg-townwize-primary text-white rounded-2xl font-bold text-[15px] active:scale-95 touch-manipulation transition-transform"
              >
                Find a Ride →
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
