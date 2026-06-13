/* global google */
import { useRef, useCallback } from "react";

export default function useMarkers({ mapInstanceRef, reverseGeocode, onMarkerUpdated }) {
  const pickupMarkerRef = useRef(null);
  const stopMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);

  // --- Create a clean DOM marker ---
  /**
  * Creates a custom marker DOM element with a pulsating, color-matched shadow.
  * @param {string} color - The base color for the marker (e.g., '#007bff', 'red').
  * @returns {HTMLElement} The wrapper element containing the marker.
  */
  const buildMarkerDOM = (color) => {
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

    // The background is a transparent version of the color to add depth
    outer.style.backgroundColor = `${color}33`;

    // --- 3. Dynamic Keyframe Injection ---

    // Generate a unique animation name for this marker
    const animName = `pulse-${Math.random().toString(36).substring(2, 9)}`;

    // Inject the style with the custom color for the box-shadow
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes ${animName} {
            0% {
                /* Start: Small, less opaque shadow */
                box-shadow: 0 0 3px 2px ${color}44;
            }
            50% {
                /* Peak: Larger, brighter shadow (The glow effect) */
                box-shadow: 0 0 12px 6px ${color}AA;
            }
            100% {
                /* End: Back to start */
                box-shadow: 0 0 3px 2px ${color}44;
            }
        }
    `;
    document.head.appendChild(styleSheet);

    // Apply the dynamic animation to the outer element
    outer.style.animation = `${animName} 2s infinite alternate`; // 2s duration, loop forever, back and forth

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
        const newPos = e.latLng;
        reverseGeocode(newPos, (addr) => {
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
        try {
          map.moveCamera({
            bounds,
            padding: 50,
            duration: 500,
          });
        } catch {
          map.fitBounds(bounds, { padding: 50 });
        }
      }

      onMarkerUpdated?.();
    },
    [mapInstanceRef, reverseGeocode, onMarkerUpdated]
  );

  return {
    pickupMarkerRef,
    stopMarkerRef,
    dropoffMarkerRef,
    updateMapMarker,
  };
}
