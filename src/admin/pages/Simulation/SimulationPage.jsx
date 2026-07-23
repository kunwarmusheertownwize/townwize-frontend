// src/admin/pages/Simulation/SimulationPage.jsx
// Self-contained ride simulation launcher.
// Creates a real test ride in the DB, drives a fake driver along the real
// Google Maps route, then auto-deletes the ride on completion/stop.
// The passenger app auto-navigates to LiveTracking when the sim starts.

/* global google */
import { useEffect, useRef, useState } from "react";
import {
  fetchSimPassengers,
  startRideSimulation,
  stopRideSimulation,
  fetchSimulationStatus,
} from "../../../api/adminApi";
import { getSocket } from "../../../hooks/useRideSocket";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";

// Default: Bahria Town Karachi — Precinct 1 area
const DEFAULT_PICKUP  = { lat: 24.9892, lng: 67.3061, address: "Precinct 1, Bahria Town Karachi" };
const DEFAULT_DROPOFF = { lat: 24.9200, lng: 67.2700, address: "Precinct 28, Bahria Town Karachi" };

const PHASE_LABELS = { to_pickup: "Driving to pickup", dwell: "Arrived at pickup", on_trip: "On trip" };

function CoordPair({ latLabel, lngLabel, lat, lng, address, onLat, onLng, onAddress }) {
  return (
    <div className="space-y-1.5">
      <input
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
        placeholder="Address label"
        value={address}
        onChange={(e) => onAddress(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.0001"
          className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
          placeholder={latLabel}
          value={lat}
          onChange={(e) => onLat(e.target.value)}
        />
        <input
          type="number"
          step="0.0001"
          className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
          placeholder={lngLabel}
          value={lng}
          onChange={(e) => onLng(e.target.value)}
        />
      </div>
    </div>
  );
}

export default function SimulationPage() {
  const [passengers, setPassengers] = useState([]);
  const [passengerUserId, setPassengerUserId] = useState("");

  const [pickupLat, setPickupLat]       = useState(DEFAULT_PICKUP.lat);
  const [pickupLng, setPickupLng]       = useState(DEFAULT_PICKUP.lng);
  const [pickupAddress, setPickupAddress] = useState(DEFAULT_PICKUP.address);

  const [dropoffLat, setDropoffLat]       = useState(DEFAULT_DROPOFF.lat);
  const [dropoffLng, setDropoffLng]       = useState(DEFAULT_DROPOFF.lng);
  const [dropoffAddress, setDropoffAddress] = useState(DEFAULT_DROPOFF.address);

  const [speedMultiplier, setSpeedMultiplier] = useState(3);
  const [dwellSeconds, setDwellSeconds]       = useState(4);

  const [activeSims, setActiveSims] = useState([]);
  const [watchRideId, setWatchRideId] = useState(null);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupPinRef    = useRef(null);
  const dropoffPinRef   = useRef(null);

  // Load passengers
  useEffect(() => {
    fetchSimPassengers()
      .then((json) => setPassengers(json?.data || []))
      .catch(() => {});
  }, []);

  // Poll active sims every 3s
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const json = await fetchSimulationStatus();
        if (!mounted) return;
        const sims = json?.data || [];
        setActiveSims(sims);
        if (watchRideId && !sims.find((s) => s.rideId === watchRideId)) {
          setWatchRideId(null);
        }
      } catch { /* no-op */ }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => { mounted = false; clearInterval(t); };
  }, [watchRideId]);

  // Init Google Map
  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: DEFAULT_PICKUP,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
      });
      setMapReady(true);
    });
  }, []);

  // Socket: join sim ride room, update driver marker on driver:location
  useEffect(() => {
    if (!watchRideId || !mapReady) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("join", `ride:${watchRideId}`);

    const onDriverLocation = ({ lat, lng }) => {
      if (typeof google === "undefined" || !mapInstanceRef.current) return;
      const pos = { lat: Number(lat), lng: Number(lng) };
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: "Simulated Driver",
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#1d4ed8",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
          },
        });
      } else {
        driverMarkerRef.current.setPosition(pos);
      }
      mapInstanceRef.current.panTo(pos);
    };

    socket.on("driver:location", onDriverLocation);
    return () => {
      socket.off("driver:location", onDriverLocation);
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }
    };
  }, [watchRideId, mapReady]);

  const placePins = () => {
    if (typeof google === "undefined" || !mapInstanceRef.current) return;
    if (pickupPinRef.current) pickupPinRef.current.setMap(null);
    if (dropoffPinRef.current) dropoffPinRef.current.setMap(null);
    pickupPinRef.current = new google.maps.Marker({
      position: { lat: Number(pickupLat), lng: Number(pickupLng) },
      map: mapInstanceRef.current,
      label: { text: "P", color: "white", fontWeight: "bold" },
      title: "Pickup",
    });
    dropoffPinRef.current = new google.maps.Marker({
      position: { lat: Number(dropoffLat), lng: Number(dropoffLng) },
      map: mapInstanceRef.current,
      label: { text: "D", color: "white", fontWeight: "bold" },
      title: "Dropoff",
    });
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: Number(pickupLat), lng: Number(pickupLng) });
    bounds.extend({ lat: Number(dropoffLat), lng: Number(dropoffLng) });
    mapInstanceRef.current.fitBounds(bounds, 60);
  };

  const handleStart = async () => {
    setError("");
    if (!passengerUserId) { setError("Select a passenger first"); return; }
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      setError("Enter pickup and dropoff coordinates");
      return;
    }
    setBusy(true);
    try {
      const json = await startRideSimulation({
        passengerUserId,
        pickupLat:    Number(pickupLat),
        pickupLng:    Number(pickupLng),
        pickupAddress,
        dropoffLat:   Number(dropoffLat),
        dropoffLng:   Number(dropoffLng),
        dropoffAddress,
        speedMultiplier: Number(speedMultiplier),
        dwellSeconds:    Number(dwellSeconds),
      });
      const rideId = json?.data?.rideId;
      setWatchRideId(rideId);
      placePins();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat: Number(pickupLat), lng: Number(pickupLng) });
        mapInstanceRef.current.setZoom(14);
      }
    } catch (e) {
      setError(e.message || "Failed to start simulation");
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async (rideId) => {
    setBusy(true);
    try {
      await stopRideSimulation(rideId);
      if (watchRideId === rideId) setWatchRideId(null);
    } catch (e) {
      setError(e.message || "Failed to stop simulation");
    } finally {
      setBusy(false);
    }
  };

  const isRunning = activeSims.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold dark:text-white">Ride Simulation</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-3">
        Creates a temporary test ride in the database and drives a simulated driver along the real Google Maps route via sockets. The passenger app auto-navigates to Live Tracking. Test ride is deleted on completion or stop.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Launch form */}
        <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Launch New Simulation</h2>

          {/* Passenger selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Passenger</label>
            <select
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
              value={passengerUserId}
              onChange={(e) => setPassengerUserId(e.target.value)}
            >
              <option value="">Select passenger…</option>
              {passengers.map((u) => (
                <option key={u._id} value={u._id}>
                  {[u.name, u.email, u.phone].filter(Boolean).join(" — ")}
                </option>
              ))}
            </select>
          </div>

          {/* Pickup */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pickup</label>
            <CoordPair
              latLabel="Lat" lngLabel="Lng"
              lat={pickupLat} lng={pickupLng} address={pickupAddress}
              onLat={setPickupLat} onLng={setPickupLng} onAddress={setPickupAddress}
            />
          </div>

          {/* Dropoff */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dropoff</label>
            <CoordPair
              latLabel="Lat" lngLabel="Lng"
              lat={dropoffLat} lng={dropoffLng} address={dropoffAddress}
              onLat={setDropoffLat} onLng={setDropoffLng} onAddress={setDropoffAddress}
            />
          </div>

          {/* Speed + dwell */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Speed — {speedMultiplier}× city speed
              </label>
              <input
                type="range" min={1} max={10} step={1}
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                className="w-full accent-townwize-primary"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>1× (30 km/h)</span><span>10×</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dwell at pickup (sec)</label>
              <input
                type="number" min={1} max={30}
                value={dwellSeconds}
                onChange={(e) => setDwellSeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            onClick={handleStart}
            disabled={busy}
            className="w-full rounded-xl py-3 font-semibold text-sm bg-townwize-primary text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? "Starting…" : "▶ Start Simulation"}
          </button>
        </div>

        {/* Active simulations */}
        <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Active Simulations</h2>
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {activeSims.length} running
              </span>
            )}
          </div>

          {activeSims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600 text-sm">
              <span className="text-3xl mb-2">🚗</span>
              No simulations running
            </div>
          ) : (
            <div className="space-y-3">
              {activeSims.map((sim) => (
                <div
                  key={sim.rideId}
                  className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">{sim.rideId}</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                        {PHASE_LABELS[sim.phase] || sim.phase}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStop(sim.rideId)}
                      disabled={busy}
                      className="shrink-0 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 text-xs font-semibold hover:bg-red-200 disabled:opacity-50 transition"
                    >
                      ■ Stop
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{sim.speedMultiplier}× speed</span>
                    <span>·</span>
                    <span>Started {new Date(sim.startedAt).toLocaleTimeString()}</span>
                    {sim.lastPos && (
                      <>
                        <span>·</span>
                        <span>{sim.lastPos.lat.toFixed(4)}, {sim.lastPos.lng.toFixed(4)}</span>
                      </>
                    )}
                  </div>
                  {watchRideId === sim.rideId && (
                    <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">Watching on map below</p>
                  )}
                  {watchRideId !== sim.rideId && (
                    <button
                      onClick={() => setWatchRideId(sim.rideId)}
                      className="text-xs text-townwize-primary dark:text-blue-400 underline underline-offset-2"
                    >
                      Watch on map
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live map */}
      <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-800 dark:text-white">Live Map</span>
          {watchRideId && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              — tracking sim <span className="font-mono">{watchRideId.slice(-8)}</span>
            </span>
          )}
          {!watchRideId && (
            <span className="text-xs text-gray-400">— start a simulation to see driver movement</span>
          )}
        </div>
        <div ref={mapRef} className="w-full h-[440px]" />
      </div>
    </div>
  );
}
