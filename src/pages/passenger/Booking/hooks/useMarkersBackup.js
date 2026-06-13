/* global google */
import { useRef, useCallback } from "react";

export default function useMarkers({ mapInstanceRef, reverseGeocode }) {
  const pickupMarkerRef = useRef(null);
  const stopMarkerRef   = useRef(null);
  const dropoffMarkerRef = useRef(null);

  // Pulse glow icon generator
  const createPulseIcon = (color) => {
    const size = 24;
    const pulseSize = 40;

    const canvas = document.createElement("canvas");
    canvas.width = pulseSize;
    canvas.height = pulseSize;
    const ctx = canvas.getContext("2d");

    const drawPulse = (alpha) => {
      ctx.clearRect(0, 0, pulseSize, pulseSize);
      const center = pulseSize / 2;

      const gradient = ctx.createRadialGradient(center, center, size / 4, center, center, size / 1.2);
      gradient.addColorStop(0, `${color}33`);
      gradient.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.arc(center, center, size / 1.2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(center, center, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      ctx.fill();
    };

    drawPulse(1);

    return { canvas, drawPulse };
  };

  // Update marker
  const updateMapMarker = useCallback(
    async (location, type) => {
      if (!mapInstanceRef.current || !location) return;

      const latLng =
        typeof location.lat === "function"
          ? { lat: location.lat(), lng: location.lng() }
          : location;

      const colors = {
        pickup: "#00C853",
        stop: "#FFEB3B",
        dropoff: "#E53935",
      };

      const { canvas, drawPulse } = createPulseIcon(colors[type]);

      const markerRef =
        type === "pickup"
          ? pickupMarkerRef
          : type === "stop"
          ? stopMarkerRef
          : dropoffMarkerRef;

      if (markerRef.current) markerRef.current.setMap(null);

      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

      const div = document.createElement("div");
      div.style.width = "40px";
      div.style.height = "40px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.appendChild(canvas);

      markerRef.current = new AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: latLng,
        content: div,
        gmpDraggable: true,
        title: type === "pickup" ? "Pickup" : type === "stop" ? "Stop" : "Dropoff",
      });

      // Pulse animation
      let alpha = 0.3;
      let dir = 1;

      const animate = () => {
        alpha += dir * 0.03;
        if (alpha >= 1) dir = -1;
        if (alpha <= 0.3) dir = 1;

        drawPulse(alpha);
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);

      // Drag events
      markerRef.current.addListener("dragend", (e) => {
        const newPos = e.latLng;

        reverseGeocode(newPos, (addr) => {
          // parent component updates the state
          if (type === "pickup") window.__setPickup?.(addr);
          if (type === "stop") window.__setStop?.(addr);
          if (type === "dropoff") window.__setDropoff?.(addr);
        });
      });

      // Fit bounds for pickup/dropoff/stop
      const bounds = new google.maps.LatLngBounds();

      const markers = [pickupMarkerRef, stopMarkerRef, dropoffMarkerRef];
      markers.forEach((ref) => {
        if (ref.current?.position) bounds.extend(ref.current.position);
      });

      if (!bounds.isEmpty()) {
        const map = mapInstanceRef.current;

        try {
          map.moveCamera({
            bounds,
            padding: 50,
            duration: 500,
            easing: "easeInOutCubic",
          });
        } catch {
          map.fitBounds(bounds, { padding: 50 });
        }
      }
    },
    [mapInstanceRef, reverseGeocode]
  );

  return {
    pickupMarkerRef,
    stopMarkerRef,
    dropoffMarkerRef,
    updateMapMarker,
  };
}
