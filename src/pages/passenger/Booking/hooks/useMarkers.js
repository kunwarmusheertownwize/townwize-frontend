/* global google */
import { useRef, useCallback } from "react";

// One keyframe per color — injected once, never duplicated
const injectedPulseColors = new Set();
function ensurePulseKeyframe(color) {
  if (injectedPulseColors.has(color)) return;
  const animName = `pulse-${color.replace("#", "")}`;
  const s = document.createElement("style");
  s.textContent = `@keyframes ${animName}{0%{box-shadow:0 0 3px 2px ${color}44}50%{box-shadow:0 0 12px 6px ${color}AA}100%{box-shadow:0 0 3px 2px ${color}44}}`;
  document.head.appendChild(s);
  injectedPulseColors.add(color);
}

export default function useMarkers({ mapInstanceRef, reverseGeocode, onMarkerUpdated }) {
  const pickupMarkerRef = useRef(null);
  const stopMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);

  const buildMarkerDOM = (color) => {
    ensurePulseKeyframe(color);
    const animName = `pulse-${color.replace("#", "")}`;

    // --- 1. Marker Wrapper ---
    const wrapper = document.createElement("div");
    wrapper.style.width = "32px";
    wrapper.style.height = "32px";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.zIndex = "999999";

    // --- 2. Outer Element (The Pulser) ---
    const outer = document.createElement("div");
    outer.style.width = "15px";
    outer.style.height = "15px";
    outer.style.borderRadius = "100%";
    outer.style.backgroundColor = `${color}33`;
    outer.style.animation = `${animName} 2s infinite alternate`;

    // --- 4. Inner Element (The Solid Dot) ---
    const inner = document.createElement("div");
    inner.style.width = "15px";
    inner.style.height = "15px";
    inner.style.borderRadius = "100%";
    inner.style.backgroundColor = color;
    inner.style.border = "1px solid white";

    // --- 5. Assembly ---
    outer.appendChild(inner);
    wrapper.appendChild(outer);

    return wrapper;
  };

  // ==============================
  // MAIN MARKER FUNCTION
  // ==============================
  const updateMapMarker = useCallback(
    async (location, type) => {
      if (!mapInstanceRef.current || !location) return;

      const latLng = typeof location.lat === "function"
        ? { lat: location.lat(), lng: location.lng() }
        : location;

      // TEMPORARY DIAGNOSTIC — remove once the "pin jumps to another precinct
      // after dragging" report is resolved.
      //
      // Reading the code did not reveal what repositions a dragged marker, so
      // this records every move together with the call site that caused it.
      // Purely observational: nothing here changes behaviour.
      try {
        const previous = (type === "pickup" ? pickupMarkerRef : type === "stop" ? stopMarkerRef : dropoffMarkerRef).current?.position;
        const prev = previous
          ? { lat: typeof previous.lat === "function" ? previous.lat() : previous.lat,
              lng: typeof previous.lng === "function" ? previous.lng() : previous.lng }
          : null;
        const movedMetres = prev
          ? Math.round(
              Math.hypot(
                (latLng.lat - prev.lat) * 111320,
                (latLng.lng - prev.lng) * 111320 * Math.cos((latLng.lat * Math.PI) / 180)
              )
            )
          : null;
        console.log(
          `[MARKER] ${type} -> ${latLng.lat?.toFixed?.(6)},${latLng.lng?.toFixed?.(6)}` +
            (movedMetres != null ? ` (moved ${movedMetres} m)` : " (first placement)"),
          "\ncalled from:\n" + (new Error().stack || "").split("\n").slice(2, 7).join("\n")
        );
      } catch { /* diagnostics must never break the map */ }

      const colors = {
        pickup: "#2d88e0",
        stop: "#FFEB3B",
        dropoff: "#E53935",
      };

      const markerRef =
        type === "pickup"
          ? pickupMarkerRef
          : type === "stop"
            ? stopMarkerRef
            : dropoffMarkerRef;

      // Remove previous marker of this type
      if (markerRef.current) markerRef.current.map = null;

      // Ensure library is loaded
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

      const dom = buildMarkerDOM(colors[type]);

      markerRef.current = new AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: latLng,
        content: dom,
        gmpDraggable: true,
      });

      // Drag event → reverse geocode
      markerRef.current.addListener("dragend", (e) => {
        // Prefer the marker's own position over the event payload. On
        // AdvancedMarkerElement the marker is the authoritative source, and
        // e.latLng is not guaranteed to be present the way it was on the legacy
        // Marker API — a missing latLng would silently geocode nothing.
        const own = markerRef.current?.position;
        const newPos = own
          ? { lat: typeof own.lat === "function" ? own.lat() : own.lat,
              lng: typeof own.lng === "function" ? own.lng() : own.lng }
          : e.latLng;

        // TEMPORARY DIAGNOSTIC — pairs with the [MARKER] log above, so the log
        // shows where the pin was dropped and then whatever moves it next.
        console.log(`[DRAGEND] ${type} dropped at`, newPos, "event latLng:", e?.latLng?.toString?.() ?? e?.latLng);

        reverseGeocode(newPos, (addr) => {
          console.log(`[DRAGEND] ${type} reverse-geocoded to:`, addr);
          if (type === "pickup") window.__setPickup?.(addr);
          if (type === "stop") window.__setStop?.(addr);
          if (type === "dropoff") window.__setDropoff?.(addr);
        });
        onMarkerUpdated?.();
      });

      // Auto-zoom to fit all markers
      const bounds = new google.maps.LatLngBounds();
      [pickupMarkerRef, stopMarkerRef, dropoffMarkerRef].forEach((ref) => {
        if (ref.current?.position) bounds.extend(ref.current.position);
      });

      if (!bounds.isEmpty()) {
        const map = mapInstanceRef.current;
        const isMobile = window.innerWidth < 768;
        const padding = isMobile
          ? { top: 60, right: 50, bottom: 300, left: 50 }
          : 60;
        try {
          map.fitBounds(bounds, padding);
        } catch {
          map.fitBounds(bounds, padding);
        }
      }

      onMarkerUpdated?.();
    },
    [mapInstanceRef, reverseGeocode, onMarkerUpdated]
  );

  const clearMarker = useCallback((type) => {
    const ref =
      type === "pickup" ? pickupMarkerRef
      : type === "stop" ? stopMarkerRef
      : dropoffMarkerRef;
    if (ref.current) {
      ref.current.map = null;
      ref.current = null;
    }
    onMarkerUpdated?.();
  }, [onMarkerUpdated]);

  return {
    pickupMarkerRef,
    stopMarkerRef,
    dropoffMarkerRef,
    updateMapMarker,
    clearMarker,
  };
}
