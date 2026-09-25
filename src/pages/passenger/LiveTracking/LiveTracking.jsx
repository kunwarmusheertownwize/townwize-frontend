/* global google */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaStar } from "react-icons/fa";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";
import api, { updateRideStatus } from "../../../services/api";
import { useRideSocket } from "../../../hooks/useRideSocket";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { isNative } from "../../../utils/platform";
import { App } from "@capacitor/app";
import useFocusTrap from "../../../hooks/useFocusTrap";
import Button from "../../../components/common/Button";

const StarRating = ({ average, size = "text-sm" }) => {
  const filled = Math.round(average || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar key={n} className={`${size} ${n <= filled ? "text-yellow-400" : "text-gray-200 dark:text-gray-600"}`} />
      ))}
    </div>
  );
};

const DriverAvatar = ({ photoUrl, name, size = "h-12 w-12", textSize = "text-base" }) => {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`${size} rounded-full object-cover shrink-0 border-2 border-white dark:border-gray-700 shadow`} />;
  }
  return (
    <div className={`${size} rounded-full bg-townwize-primary flex items-center justify-center shrink-0`}>
      <span className={`text-white font-bold ${textSize}`}>{(name || "W")[0].toUpperCase()}</span>
    </div>
  );
};

const PASSENGER_CANCEL_REASONS = [
  "Changed my mind",
  "Driver taking too long",
  "Booked by mistake",
  "Found another ride",
  "Driver not responding",
  "Other",
];

// `policy` defaults to the server's own defaults so this panel renders exactly
// as it always did if the config fetch has not landed yet, or failed.
const CancelReasonPanel = ({ ride, cancelReason, setCancelReason, cancelling, cancelError, onKeep, onConfirm, compact, policy = { freeWindowMinutes: 3, fee: 75, feesEnabled: true } }) => {
  // Ticks so the countdown below is live. Without this the panel would show a
  // stale "free for another 2:41" for as long as it stayed open, and a
  // passenger could act on a number that had already run out.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const freeWindowMs = policy.freeWindowMinutes * 60 * 1000;
  const msLeft = ride?.assignedAt
    ? freeWindowMs - (now - new Date(ride.assignedAt).getTime())
    : freeWindowMs;

  const withinFreeWindow = !ride?.assignedAt || msLeft > 0;

  // Warn over the back half of the free window. Derived rather than a second
  // configurable number, so the warning can never outlast the window it warns
  // about — with a 6-minute window the countdown appears at 3 minutes.
  const warning = withinFreeWindow && msLeft <= freeWindowMs / 2;

  const mmss = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow p-4 space-y-3 ${compact ? "" : ""}`}>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Why are you cancelling?</p>

      <select
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
        disabled={cancelling}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
      >
        <option value="">Select a reason…</option>
        {PASSENGER_CANCEL_REASONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {ride?.status !== "REQUESTED" && policy.feesEnabled !== false && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            !withinFreeWindow
              ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
              : warning
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
          }`}
        >
          {!withinFreeWindow ? (
            <span>⚠ {Number(policy.fee).toLocaleString("en-PK")} PKR cancellation fee applies</span>
          ) : warning ? (
            <span>
              ⏱ Free for another{" "}
              <span className="font-bold tabular-nums">{mmss(msLeft)}</span> — after that a{" "}
              {Number(policy.fee).toLocaleString("en-PK")} PKR fee applies
            </span>
          ) : (
            <span>✓ Free cancellation</span>
          )}
        </div>
      )}

      {/* A refused cancellation is shown, never swallowed. Before this the
          passenger was navigated home regardless and believed the ride was
          over while a Wizer was still driving to them. */}
      {cancelError && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-300">
          {cancelError}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onKeep} disabled={cancelling} className="flex-1">
          Keep Ride
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={!cancelReason}
          loading={cancelling}
          className="flex-1"
        >
          {cancelling ? "Cancelling…" : "Confirm Cancel"}
        </Button>
      </div>
    </div>
  );
};

const SOSPanel = ({ contacts, rideId, posRef, onClose }) => {
  /* Trap only — NOT converted to <Modal>. This is a true bottom sheet, flush
     to the screen edge with rounded-t-3xl and env(safe-area-inset-bottom);
     Modal insets its panel, which would lift it off the edge and undo that.
     It is also the SOS panel, so the bar for changing its layout is high.
     What it lacked was the trap, and that is what it gets. */
  const sheetRef = useFocusTrap(true, onClose);
  const pos = posRef.current;
  const mapsLink = pos
    ? `https://maps.google.com/?q=${pos.lat},${pos.lng}`
    : null;
  const msgText = encodeURIComponent(
    `🚨 Emergency — I need help!\n\nI am on a Townwize ride (Ride ID: ${rideId}).\n📍 My location: ${mapsLink || "Fetching location…"}\n\nPlease respond immediately.`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Emergency SOS"
        tabIndex={-1}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 space-y-4 shadow-2xl outline-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          </span>
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Emergency SOS</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Alert your emergency contacts</p>
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="py-5 text-center space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">No emergency contacts saved.</p>
            <p className="text-xs text-gray-400">Add them in Profile → Emergency Contacts.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((c, i) => {
              const digits = c.phone.replace(/\D/g, "");
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold"
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${digits}?text=${msgText}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] dark:text-[#25D366] text-xs font-bold"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

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
  if (normalized === "POOL_COLLECTING_SECONDARY") {
    return {
      title: "Wizer collecting co-passenger",
      description: "Your Wizer is picking up the other passenger. You will be next.",
      tone: "matched",
    };
  }
  if (normalized === "POOL_EN_ROUTE_SECONDARY") {
    return {
      title: "Wizer on the way",
      description: "Co-passenger boarded. Your Wizer is heading to your pickup.",
      tone: "matched",
    };
  }
  if (normalized === "POOL_ARRIVED_SECONDARY") {
    return {
      title: "Wizer arrived at your pickup",
      description: "Your Wizer is here. Please board now.",
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

// Inline destination change panel — only mounts on private ON_TRIP rides
const ChangeDestination = ({ rideId, driverCoords, onSuccess, onCancel }) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = (value) => {
    if (!value.trim() || !window.google?.maps?.places) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const svc = new google.maps.places.AutocompleteService();
        const result = await svc.getPlacePredictions({
          input: value,
          componentRestrictions: { country: "pk" },
        });
        setSuggestions(result.predictions.map(p => ({
          description: p.description,
          placeId: p.place_id,
        })));
      } catch { setSuggestions([]); }
    }, 300);
  };

  const handleSelect = async (prediction) => {
    setLoading(true);
    setSuggestions([]);
    try {
      let coords = null;
      const placesDiv = document.createElement("div");
      const placesSvc = new google.maps.places.PlacesService(placesDiv);
      await new Promise((resolve) => {
        placesSvc.getDetails(
          { placeId: prediction.placeId, fields: ["geometry", "formatted_address"] },
          (result, status) => {
            if (status === "OK" && result?.geometry) {
              coords = { lat: result.geometry.location.lat(), lng: result.geometry.location.lng() };
            }
            resolve();
          }
        );
      });
      if (!coords) throw new Error("Location not resolved");

      let distKm = null;
      if (driverCoords?.lat && coords) {
        await new Promise((resolve) => {
          new google.maps.DirectionsService().route(
            { origin: driverCoords, destination: coords, travelMode: google.maps.TravelMode.DRIVING },
            (result, status) => {
              if (status === "OK") {
                distKm = (result.routes[0]?.legs?.[0]?.distance?.value || 0) / 1000;
              }
              resolve();
            }
          );
        });
      }

      const res = await api.patch(`/rides/${rideId}/destination`, {
        dropoff: prediction.description,
        dropoffCoords: coords,
        newDistanceKm: distKm,
      });
      onSuccess(res.data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update destination");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onChange={(e) => { setInput(e.target.value); fetchSuggestions(e.target.value); }}
          placeholder="Search new destination…"
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-accent"
        />
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>Cancel</Button>
      </div>
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 shadow-lg">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSelect(s)} disabled={loading}
              className="w-full text-start px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 focus:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-gray-700">
              {s.description}
            </button>
          ))}
        </div>
      )}
      {loading && <p className="text-xs text-center text-gray-400">Updating destination…</p>}
    </div>
  );
};

const LiveTracking = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const prevDriverPosRef = useRef(null);
  const lastDriverHeadingRef = useRef(null); // heading from GPS or computed bearing
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);  // manual Polyline — replaces DirectionsRenderer
  const routePathRef = useRef([]);         // decoded step-path for real-time trimming

  const [ride, setRide] = useState(null);
  const rideRef = useRef(null);
  const [fetchError, setFetchError] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const [changingDestination, setChangingDestination] = useState(false);
  const [availability, setAvailability] = useState({
    loading: false,
    matchingDrivers: null,
    nearestDistanceKm: null,
    estimatedPickupMinutes: null,
    message: "",
  });

  const lastRouteStatusRef = useRef(null);
  const lastRouteOriginRef = useRef(null); // lat/lng used for last Directions call during ON_TRIP
  const routeFetchInFlightRef = useRef(false); // prevents concurrent DirectionsService requests
  const routeRecalcNeededRef = useRef(false); // set when driver goes off-route; cleared after toast
  const hasFitBoundsRef = useRef(false);
  const passengerMarkerRef = useRef(null);
  const altRoutesRef = useRef([]);
  const tripZoomAppliedRef = useRef(false); // set exactly once when ON_TRIP begins

  const [etaSeconds, setEtaSeconds] = useState(null);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [tripBlocked, setTripBlocked] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  // The free window and the fee are admin-configurable on the server. They used
  // to be hardcoded here, so editing the policy in admin left this screen
  // quoting the old number while the server applied the new one — and the
  // published policy page now promises the passenger sees the real fee before
  // confirming. Defaults match the server defaults, so a failed fetch behaves
  // exactly as this screen did before.
  const [cancelPolicy, setCancelPolicy] = useState({ freeWindowMinutes: 3, fee: 75 });

  useEffect(() => {
    let mounted = true;
    fetch(`${import.meta.env.VITE_API_BASE_URL}/public/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const c = json?.data?.cancellation;
        if (!mounted || !c) return;
        setCancelPolicy({
          freeWindowMinutes: c.freeWindowMinutes ?? 3,
          fee: c.fee ?? 75,
          feesEnabled: c.feesEnabled !== false,
        });
      })
      .catch(() => { /* keep the defaults */ });
    return () => { mounted = false; };
  }, []);

  const [sosOpen, setSosOpen] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const passengerPosRef = useRef(null);

  // Pool-specific state
  const [poolStage, setPoolStage] = useState(null); // mirrors ride.poolPickupStage
  const [poolBoardingBanner, setPoolBoardingBanner] = useState(null); // "primary" | "secondary" | null
  const [poolStatusOverride, setPoolStatusOverride] = useState(null); // custom text for pool events
  const [exitingPool, setExitingPool] = useState(false);
  const [confirmExitPool, setConfirmExitPool] = useState(false);
  const authRaw = typeof window !== "undefined" ? localStorage.getItem("auth") : null;
  const currentUserId = authRaw ? (() => { try { return JSON.parse(authRaw)?.user?.id; } catch { return null; } })() : null;

  // Fetch emergency contacts once on mount
  useEffect(() => {
    api.get("/passenger/emergency-contacts")
      .then((res) => setEmergencyContacts(res.data?.data?.contacts || []))
      .catch(() => {});
  }, []);

  // ─────────────────────────────────────────────
  // Keep rideRef in sync with ride state
  // ─────────────────────────────────────────────
  useEffect(() => {
    rideRef.current = ride;
    if (ride?.poolPickupStage != null) setPoolStage(ride.poolPickupStage);
  }, [ride]);

  // ETA countdown — ticks every second between directions refreshes
  useEffect(() => {
    const status = String(ride?.status || "").toUpperCase();
    if (etaSeconds == null || etaSeconds <= 0 || status === "ARRIVED" || status === "ON_TRIP") return;
    const t = setTimeout(() => setEtaSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [etaSeconds, ride?.status]);

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

    // On native, window "focus" is unreliable when the app comes to foreground.
    // App.addListener fires instantly and correctly on both Android and iOS.
    let appStateHandle = null;
    if (isNative()) {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) fetchRide();
      }).then((h) => { appStateHandle = h; });
    }

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", fetchRide);
      appStateHandle?.remove();
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
        return { ...prev, status: payload.status ?? prev.status, driverId: payload.driverId ?? prev.driverId };
      });
    },

    onRideAccepted: (payload) => {
      setRide((prev) => {
        if (!prev) return prev;
        if (String(payload?.rideId) !== String(rideId)) return prev;
        return { ...prev, status: payload.status ?? "DRIVER_ASSIGNED", driverId: payload.driverId ?? prev.driverId };
      });
    },

    onDriverLocation: ({ lat, lng, heading, rideId: locationRideId }) => {
      if (locationRideId && String(locationRideId) !== String(rideId)) return;
      // Store GPS heading from driver (may be null on stationary device)
      if (heading != null && !isNaN(heading)) {
        lastDriverHeadingRef.current = heading;
      }
      setRide((prev) => {
        if (!prev) return prev;
        return { ...prev, driver: { ...(prev.driver || {}), lat, lng } };
      });
    },

    // Primary passenger (A) — driver arrived at their pickup
    onPoolArrivedPrimary: (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      setPoolBoardingBanner("primary");
      setPoolStatusOverride("Your Wizer has arrived — please board");
    },

    // Secondary passenger (B) — driver still picking up A
    onPoolCollectingSecondary: (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      setPoolStatusOverride("Wizer is collecting your co-passenger…");
    },

    // B — driver has confirmed A boarded, now coming to B
    onPoolEnRouteSecondary: (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      setPoolStatusOverride(`Wizer is on the way to your pickup${payload.pickupAddress ? `: ${payload.pickupAddress}` : ""}`);
    },

    // B — driver arrived at B's pickup
    onPoolArrivedSecondary: (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      setPoolBoardingBanner("secondary");
      setPoolStatusOverride("Your Wizer has arrived — please board");
    },

    // Both — all passengers boarded
    onPoolAllAboard: (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      setPoolBoardingBanner(null);
      setPoolStatusOverride("All aboard — trip starting");
    },

    // Both — co-passenger exited pool
    onPoolExited: (payload) => {
      if (String(payload?.rideId) !== String(rideId)) return;
      if (payload.newFare) {
        setRide((prev) => prev ? { ...prev, fareEstimate: payload.newFare } : prev);
      }
      setPoolStatusOverride("Co-passenger left the shared ride. Your fare is restored.");
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
          renderingType: "VECTOR",
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

        dropoffMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
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
  // Passenger own-position arrow (blue, heading-aware)
  // Only show before ON_TRIP — once in car, hide it.
  // ─────────────────────────────────────────────
  useEffect(() => {
    const status = String(ride?.status || "").toUpperCase();
    const showSelf = !["ON_TRIP", "COMPLETED", "CANCELLED"].includes(status);
    if (!showSelf || !mapInstanceRef.current || !window.google) return;

    const buildEl = () => {
      const el = document.createElement("img");
      el.src = "/favicon-96x96-towner-marker.png";
      el.style.cssText = "width:24px;height:24px;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:block;";
      return el;
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        passengerPosRef.current = { lat, lng };
        const map = mapInstanceRef.current;
        if (!map) return;

        if (!passengerMarkerRef.current) {
          passengerMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat, lng },
            content: buildEl(),
          });
        } else {
          passengerMarkerRef.current.position = { lat, lng };
        }
      },
      null,
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (passengerMarkerRef.current) {
        passengerMarkerRef.current.map = null;
        passengerMarkerRef.current = null;
      }
    };
  }, [ride?.status]);

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
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
        routePathRef.current = [];
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
      mapInstanceRef.current.setZoom(16);
      mapInstanceRef.current.panTo(origin);
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.map = null; // remove from map — pickup is now behind us
      }
    }

    // In-flight guard — always first, prevents concurrent requests when polyline is null
    if (routeFetchInFlightRef.current) return;

    if (!statusChanged) {
      // Re-fetch only if driver moved >100 m — trimming handles visual progress between fetches
      if (routePolylineRef.current) {
        if (lastRouteOriginRef.current && haversineM(origin, lastRouteOriginRef.current) < 100) return;
      }
    }

    lastRouteStatusRef.current = rideStatus;
    lastRouteOriginRef.current = origin;

    const capturedOrigin = origin;

    routeFetchInFlightRef.current = true;
    new google.maps.DirectionsService().route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: rideStatus !== "ON_TRIP",
      },
      (result, reqStatus) => {
        routeFetchInFlightRef.current = false;
        if (reqStatus !== "OK") return;
        if (lastRouteOriginRef.current !== capturedOrigin) return;

        // Decode detailed step-by-step path (fine-grained, ~5-20m point spacing)
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
          if (rideStatus === "ON_TRIP" && routeRecalcNeededRef.current) {
            routeRecalcNeededRef.current = false;
            toast.info("Route updated", { toastId: "route-recalc", autoClose: 2500 });
          }
        } else {
          routePolylineRef.current = new google.maps.Polyline({
            path,
            map,
            strokeColor: "#17BEBB",
            strokeWeight: 5,
            strokeOpacity: 0.85,
            clickable: false,
          });
        }

        // Update ETA from directions response (only while driver is en route to pickup)
        if (rideStatus === "DRIVER_ASSIGNED" || rideStatus === "EN_ROUTE") {
          const secs = result.routes[0]?.legs?.[0]?.duration?.value;
          if (secs != null) setEtaSeconds(secs);
        }

        if (rideStatus === "ON_TRIP") {
          map.setZoom(16);
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

    // Use GPS heading if available; otherwise compute bearing from position delta
    let heading = lastDriverHeadingRef.current;
    if (heading == null && prevDriverPosRef.current) {
      const { lat: lat1, lng: lng1 } = prevDriverPosRef.current;
      const toRad = (d) => (d * Math.PI) / 180;
      const dLngR = toRad(pos.lng - lng1);
      const lat1R = toRad(lat1);
      const lat2R = toRad(pos.lat);
      const y = Math.sin(dLngR) * Math.cos(lat2R);
      const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLngR);
      const computed = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      // Only use computed bearing if driver has moved more than ~5m (avoid jitter at rest)
      const prevPos = prevDriverPosRef.current;
      const R = 6371000;
      const dLat = ((pos.lat - prevPos.lat) * Math.PI) / 180;
      const dLngM = ((pos.lng - prevPos.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((prevPos.lat * Math.PI) / 180) * Math.cos(lat2R) * Math.sin(dLngM / 2) ** 2;
      const distM = R * 2 * Math.asin(Math.sqrt(a));
      if (distM > 5) heading = computed;
    }
    prevDriverPosRef.current = pos;

    // Real-time polyline trimming — consume route from the front as driver advances
    const path = routePathRef.current;
    if (path.length > 1 && routePolylineRef.current) {
      let minDist = Infinity;
      let nearestIdx = 0;
      for (let i = 0; i < path.length; i++) {
        const d = haversineM(pos, path[i]);
        if (d < minDist) { minDist = d; nearestIdx = i; }
      }
      if (minDist < 120 && nearestIdx < path.length - 1) {
        routePolylineRef.current.setPath(path.slice(nearestIdx));
      } else if (nearestIdx < path.length - 1) {
        lastRouteOriginRef.current = null; // off-route — force re-fetch on next cycle
        routeRecalcNeededRef.current = true;
      }
    }

    const currentStatus = String(rideRef.current?.status || "").toUpperCase();

    const buildMarkerEl = () => {
      const el = document.createElement("img");
      el.src = "/favicon-96x96-wizer-marker.png";
      el.style.cssText = "width:32px;height:32px;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:block;";
      return el;
    };

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: pos,
        content: buildMarkerEl(),
      });
    } else {
      driverMarkerRef.current.position = pos;
    }

    if (currentStatus === "ON_TRIP") {
      if (!tripZoomAppliedRef.current) {
        map.setZoom(15);
        tripZoomAppliedRef.current = true;
      }
      if (heading != null) map.setHeading(heading);
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

  // Determine if this user is the secondary (B) passenger on this pooled ride
  const isSecondaryPassenger = ride?.rideType === "RIDETOGETHER" &&
    Array.isArray(ride?.sharedPassengers) &&
    ride.sharedPassengers.some((sp) => String(sp.userId) === String(currentUserId));

  const canExitPool = isSecondaryPassenger &&
    ["DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED"].includes(String(ride?.status || "").toUpperCase()) &&
    !ride?.sharedPassengers?.find((sp) => String(sp.userId) === String(currentUserId))?.boarded;

  const handleExitPool = async () => {
    if (exitingPool || !rideId) return;
    setExitingPool(true);
    try {
      await api.post(`/rides/${rideId}/exit-pool`);
      navigate("/passenger/home", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not exit shared ride.");
    } finally {
      setExitingPool(false);
      setConfirmExitPool(false);
    }
  };

  // Pool-specific effective status text
  const effectivePoolStatus = poolStatusOverride || null;

  const handleKeepRide = () => {
    setConfirmCancel(false);
    setCancelReason("");
    setTripBlocked(false);
  };

  const handleDestinationChanged = (data) => {
    setRide(prev => prev ? {
      ...prev,
      dropoff: { ...prev.dropoff, address: data.dropoff, lat: data.dropoffCoords.lat, lng: data.dropoffCoords.lng },
      fareEstimate: data.fareEstimate,
    } : prev);
    setChangingDestination(false);
    toast.success("Destination updated");
    lastRouteOriginRef.current = null; // force route re-fetch to new destination
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.position = { lat: data.dropoffCoords.lat, lng: data.dropoffCoords.lng };
    }
  };

  const handleCancelRide = async () => {
    if (!cancelReason) return;
    setCancelling(true);
    setCancelError("");
    try {
      await updateRideStatus(rideId, "CANCELLED", { reason: cancelReason });
    } catch (err) {
      /* A FAILED CANCELLATION MUST NOT LOOK LIKE A SUCCESSFUL ONE.
       *
       * This swallowed the error and navigated home regardless, so a passenger
       * whose cancellation the server refused was sent away believing the ride
       * was over — while a Wizer was still en route to them, or the trip was
       * still running. More serious here than on the request screen, because
       * by this point a driver has already been assigned.
       *
       * They stay put, see why, and can try again. */
      console.error("Cancel failed", err);
      setCancelError(
        err?.response?.data?.error?.message ||
          "We couldn't cancel your ride. Please check your connection and try again."
      );
      setCancelling(false);
      return;
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
  const isPrimaryPooled = ride?.rideType === "RIDETOGETHER" && Array.isArray(ride?.sharedPassengers) && ride.sharedPassengers.length > 0 && !isSecondaryPassenger;
  const driverInfo = ride?.driverInfo || null;
  const showDriverInfo = driverInfo && !isSearching;
  const etaMinutes = etaSeconds != null ? Math.max(1, Math.ceil(etaSeconds / 60)) : null;
  const showEta = etaMinutes != null && ["DRIVER_ASSIGNED", "EN_ROUTE"].includes(String(ride.status || "").toUpperCase());

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
                {effectivePoolStatus ? effectivePoolStatus.split(" — ")[0] : stage.title}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ms-4">
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
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-townwize-accent" />
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate min-w-0">
                  {ride.pickup?.address}
                </p>
              </div>
              {changingDestination ? (
                <ChangeDestination
                  rideId={rideId}
                  driverCoords={ride.driver?.lat ? { lat: ride.driver.lat, lng: ride.driver.lng } : null}
                  onSuccess={handleDestinationChanged}
                  onCancel={() => setChangingDestination(false)}
                />
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-red-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate min-w-0 flex-1">
                    {ride.dropoff?.address}
                  </p>
                  {ride.status === "ON_TRIP" && ride.rideType !== "RIDETOGETHER" && (
                    <button
                      onClick={() => setChangingDestination(true)}
                      className="shrink-0 text-xs text-townwize-accent hover:underline focus:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-townwize-primary rounded"
                    >
                      Change
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Driver info card */}
            {showDriverInfo && (
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <DriverAvatar photoUrl={driverInfo.photoUrl} name={driverInfo.name} size="h-11 w-11" textSize="text-sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{driverInfo.name}</p>
                  {driverInfo.vehicle && (
                    <p className="text-xs text-gray-400 truncate">
                      {[driverInfo.vehicle.color, driverInfo.vehicle.make, driverInfo.vehicle.model].filter(Boolean).join(" ")}
                      {driverInfo.vehicle.plate ? ` · ${driverInfo.vehicle.plate}` : ""}
                    </p>
                  )}
                  {driverInfo.rating && (
                    <div className="mt-0.5">
                      <StarRating average={driverInfo.rating.average} size="text-[10px]" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ms-auto shrink-0">
                  {showEta && (
                    <div className="text-end">
                      <p className="text-[10px] text-gray-400">Arrives in</p>
                      <p className="text-lg font-extrabold text-townwize-primary dark:text-townwize-accent leading-tight">{etaMinutes} min</p>
                    </div>
                  )}
                  {driverInfo.phone && (
                    <a
                      href={`tel:${driverInfo.phone}`}
                      className="flex flex-col items-center justify-center h-11 w-11 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0"
                      title="Call Wizer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.57 1 1 0 01-.25 1.01l-2.2 2.21z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}

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

            {/* Pool status override banner */}
            {effectivePoolStatus && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                {effectivePoolStatus}
              </div>
            )}

            {/* Boarding prompt */}
            {poolBoardingBanner && (
              <div className="rounded-xl bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-700 p-3 space-y-1">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Your Wizer is here!</p>
                <p className="text-xs text-green-700 dark:text-green-400">Please board now and confirm with your Wizer.</p>
              </div>
            )}

            {/* Exit pool button (secondary passenger only) */}
            {canExitPool && (
              confirmExitPool ? (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 space-y-2">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-300">Leave the shared ride?</p>
                  <p className="text-xs text-red-700 dark:text-red-400">You will be navigated back to the home screen.</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setConfirmExitPool(false)} className="flex-1">Keep Ride</Button>
                    <Button variant="danger" size="sm" onClick={handleExitPool} loading={exitingPool} className="flex-1">
                      {exitingPool ? "Leaving…" : "Leave Ride"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="dangerSoft" size="sm" fullWidth onClick={() => setConfirmExitPool(true)}>
                  Leave Shared Ride
                </Button>
              )
            )}

            {/* SOS button */}
            <Button
              variant="dangerSoft"
              fullWidth
              onClick={() => setSosOpen(true)}
              className="bg-red-50 dark:bg-red-950"
            >
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Emergency SOS
            </Button>

            {/* Trip-in-progress block (ARRIVED / ON_TRIP back-button guard) */}
            {tripBlocked && (
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  Trip in progress — you cannot go back.
                </p>
                <Button fullWidth onClick={handleKeepRide}>
                  Got it
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate("/passenger/support", { state: { linkedRideId: rideId } })}
                >
                  Get Help
                </Button>
              </div>
            )}

            {/* Cancel flow */}
            {!tripBlocked && canCancel && (
              confirmCancel ? (
                <CancelReasonPanel
                  ride={ride}
                  cancelReason={cancelReason}
                  setCancelReason={setCancelReason}
                  cancelling={cancelling}
                  cancelError={cancelError}
                  onKeep={handleKeepRide}
                  onConfirm={handleCancelRide}
                  policy={cancelPolicy}
                  compact
                />
              ) : (
                <Button variant="dangerSoft" fullWidth onClick={() => setConfirmCancel(true)}>
                  Cancel Ride
                </Button>
              )
            )}
          </div>
        </div>
        {sosOpen && (
          <SOSPanel
            contacts={emergencyContacts}
            rideId={rideId}
            posRef={passengerPosRef}
            onClose={() => setSosOpen(false)}
          />
        )}
      </div>,
      document.body
    );
  }

  // Desktop SOS panel rendered into body so it overlays everything
  const sosPanel = sosOpen ? (
    <SOSPanel
      contacts={emergencyContacts}
      rideId={rideId}
      posRef={passengerPosRef}
      onClose={() => setSosOpen(false)}
    />
  ) : null;

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
                {effectivePoolStatus ? effectivePoolStatus.split(" — ")[0] : stage.title}
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

      {/* Driver info card — web */}
      {showDriverInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center gap-4">
          <DriverAvatar photoUrl={driverInfo.photoUrl} name={driverInfo.name} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white">{driverInfo.name}</p>
            {driverInfo.vehicle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {[driverInfo.vehicle.color, driverInfo.vehicle.make, driverInfo.vehicle.model].filter(Boolean).join(" ")}
                {driverInfo.vehicle.plate ? ` · ${driverInfo.vehicle.plate}` : ""}
              </p>
            )}
            {driverInfo.rating && (
              <div className="mt-1">
                <StarRating average={driverInfo.rating.average} size="text-xs" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {showEta && (
              <div className="text-end">
                <p className="text-xs text-gray-400">Arrives in</p>
                <p className="text-xl font-extrabold text-townwize-primary dark:text-townwize-accent">{etaMinutes} min</p>
              </div>
            )}
            {driverInfo.phone && (
              <a
                href={`tel:${driverInfo.phone}`}
                className="flex items-center justify-center h-11 w-11 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                title="Call Wizer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.57 1 1 0 01-.25 1.01l-2.2 2.21z"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

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

      {/* Route + fare summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-townwize-accent" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Pickup</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{ride.pickup?.address}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Dropoff</p>
              {ride.status === "ON_TRIP" && ride.rideType !== "RIDETOGETHER" && !changingDestination && (
                <button onClick={() => setChangingDestination(true)} className="text-xs text-townwize-accent hover:underline shrink-0 focus:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-townwize-primary rounded">
                  Change
                </button>
              )}
            </div>
            {changingDestination ? (
              <ChangeDestination
                rideId={rideId}
                driverCoords={ride.driver?.lat ? { lat: ride.driver.lat, lng: ride.driver.lng } : null}
                onSuccess={handleDestinationChanged}
                onCancel={() => setChangingDestination(false)}
              />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{ride.dropoff?.address}</p>
            )}
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Estimated fare</span>
          <span className="text-base font-bold text-townwize-primary dark:text-white">{ride.fareEstimate} PKR</span>
        </div>
      </div>

      {/* Pool status banner (web) */}
      {effectivePoolStatus && (
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          {effectivePoolStatus}
        </div>
      )}

      {/* Boarding prompt (web) */}
      {poolBoardingBanner && (
        <div className="rounded-2xl bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-700 px-4 py-3">
          <p className="font-semibold text-green-800 dark:text-green-300">Your Wizer is here!</p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">Please board now and confirm with your Wizer.</p>
        </div>
      )}

      {/* Exit pool (web — secondary passenger only) */}
      {canExitPool && (
        confirmExitPool ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 space-y-3">
            <p className="font-semibold text-red-800 dark:text-red-300">Leave the shared ride?</p>
            <p className="text-sm text-red-700 dark:text-red-400">The other passenger will continue. You will be taken back to home.</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmExitPool(false)} className="flex-1">Keep Ride</Button>
              <Button variant="danger" onClick={handleExitPool} loading={exitingPool} className="flex-1">
                {exitingPool ? "Leaving…" : "Leave Ride"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="dangerSoft" fullWidth onClick={() => setConfirmExitPool(true)}>
            Leave Shared Ride
          </Button>
        )
      )}

      {/* Back-button blocked during ARRIVED/ON_TRIP */}
      {tripBlocked && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 space-y-3 border border-amber-200 dark:border-amber-700">
          <p className="text-sm font-medium text-center text-gray-700 dark:text-gray-300">
            Your trip is in progress.
            <span className="block text-xs text-gray-500 mt-1">
              You cannot go back while the ride is active.
            </span>
          </p>
          <Button fullWidth onClick={handleKeepRide}>
            Got it
          </Button>
        </div>
      )}

      {canCancel && (
        confirmCancel ? (
          <CancelReasonPanel
            ride={ride}
            cancelReason={cancelReason}
            setCancelReason={setCancelReason}
            cancelling={cancelling}
            cancelError={cancelError}
            onKeep={handleKeepRide}
            onConfirm={handleCancelRide}
            policy={cancelPolicy}
          />
        ) : (
          <Button variant="dangerSoft" fullWidth onClick={() => setConfirmCancel(true)}>
            Cancel Ride
          </Button>
        )
      )}

      {/* SOS button — desktop */}
      <Button
        variant="dangerSoft"
        fullWidth
        onClick={() => setSosOpen(true)}
        className="bg-red-50 dark:bg-red-950"
      >
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        Emergency SOS
      </Button>

      {sosPanel}
    </div>
  );
};

export default LiveTracking;

