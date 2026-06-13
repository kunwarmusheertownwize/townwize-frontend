/* global google */
import { useRef, useCallback, useState } from "react";
import { toast } from "react-toastify";

export default function useRouteEngine({
    mapInstanceRef,
    pickupMarkerRef,
    stopMarkerRef,
    dropoffMarkerRef,
}) {
    const directionsServiceRef = useRef(null);
    const directionsRendererRef = useRef(null);

    const routeOverlayRef = useRef(null);       // holds base polyline + moving marker
    const routeTimerRef = useRef(null);
    const routeDebounceRef = useRef(null);
    const routeAnimationFrameRef = useRef(null);

    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [etaText, setEtaText] = useState("");
    const [etaValue, setEtaValue] = useState(null);
    const [distanceKm, setDistanceKm] = useState(0);

    // -------------------------------
    //  ANIMATED ROUTE (Townwize style)
    // -------------------------------
    async function animateRouteOverlay(path) {
        try {
            const map = mapInstanceRef.current;
            if (!map || !path || !path.length) return;

            // Clean previous overlay (polyline + marker + RAF)
            if (routeOverlayRef.current) {
                const { baseLine, marker } = routeOverlayRef.current;
                if (baseLine) baseLine.setMap(null);
                if (marker) marker.map = null;
                routeOverlayRef.current = null;
            }
            if (routeAnimationFrameRef.current) {
                cancelAnimationFrame(routeAnimationFrameRef.current);
                routeAnimationFrameRef.current = null;
            }

            // 1) Solid base route line (dark Townwize color)
            const baseLine = new google.maps.Polyline({
                path,
                strokeColor: "#031D23", // near townwize.primaryDark
                strokeOpacity: 0.9,
                strokeWeight: 5,
                map,
            });

            // 2) Moving “orbit” marker (bright green dot)
            const { AdvancedMarkerElement } =
                await google.maps.importLibrary("marker");

            const dot = document.createElement("div");
            dot.style.width = "14px";
            dot.style.height = "14px";
            dot.style.background = "#00F77A";
            dot.style.border = "3px solid #031D23";
            dot.style.borderRadius = "50%";
            dot.style.boxSizing = "border-box";

            const marker = new AdvancedMarkerElement({
                position: path[0],
                map,
                content: dot,
                zIndex: 9999,
            });

            routeOverlayRef.current = { baseLine, marker };

            // 3) Animate marker along polyline
            const totalPoints = path.length;
            if (totalPoints < 2) return;

            let t = 0; // fractional index

            const animate = () => {
                if (!routeOverlayRef.current) return;

                // Move along path smoothly (not just point-to-point)
                t += 0.35; // speed (tweak if needed)
                if (t >= totalPoints - 1) {
                    t = 0; // loop again
                }

                const i = Math.floor(t);
                const nextI = (i + 1) % totalPoints;
                const ratio = t - i;

                const p1 = path[i];
                const p2 = path[nextI];

                // Linear interpolation between p1 and p2
                const lat = p1.lat() + (p2.lat() - p1.lat()) * ratio;
                const lng = p1.lng() + (p2.lng() - p1.lng()) * ratio;

                marker.position = { lat, lng };

                routeAnimationFrameRef.current = requestAnimationFrame(animate);
            };

            routeAnimationFrameRef.current = requestAnimationFrame(animate);
        } catch (err) {
            console.error("Animated route overlay error:", err);
        }
    };

    // -------------------------------
    // ROUTE DRAWING
    // -------------------------------
    const drawRoute = useCallback(() => {
        if (!mapInstanceRef.current) return;

        if (routeTimerRef.current) clearTimeout(routeTimerRef.current);

        routeTimerRef.current = setTimeout(() => {
            setIsCalculatingRoute(true);
        }, 120);

        const pickup = pickupMarkerRef.current?.position;
        const stop = stopMarkerRef.current?.position;
        const dropoff = dropoffMarkerRef.current?.position;

        if (!pickup || !dropoff) {
            if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
            setIsCalculatingRoute(false);
            return;
        }

        const waypoints = stop ? [{ location: stop, stopover: true }] : [];

        if (!directionsServiceRef.current) {
            directionsServiceRef.current = new google.maps.DirectionsService();
        }

        // Recreate renderer each time (new Maps behavior)
        if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
        }
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
                strokeOpacity: 0, // hide default blue line (we draw our own)
            },
        });

        directionsRendererRef.current.setMap(mapInstanceRef.current);

        directionsServiceRef.current.route(
            {
                origin: pickup,
                destination: dropoff,
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: true,
                provideRouteAlternatives: false,
            },
            async (result, status) => {      //  ✅ THIS is the correct final form
                if (status !== "OK" || !result) {
                    toast.error(`Route error: ${status}`);
                    setIsCalculatingRoute(false);
                    return;
                }

                const route = result.routes[0];
                directionsRendererRef.current.setDirections(result);

                // Decode polyline
                let path = [];
                try {
                    const { encoding } = await google.maps.importLibrary("geometry");
                    path = encoding.decodePath(
                        route.overview_polyline?.points || route.overview_polyline
                    );
                } catch (err) {
                    console.error("Polyline decode failed:", err);
                }

                // Animate
                animateRouteOverlay(path);

                // ETA + distance
                let totalSeconds = 0;
                let totalMeters = 0;

                route.legs.forEach((leg) => {
                    totalSeconds += leg.duration.value;
                    totalMeters += leg.distance.value;
                });

                setEtaText(route.legs.at(-1).duration.text);
                setEtaValue(totalSeconds);
                setDistanceKm(totalMeters / 1000);

                if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
                setTimeout(() => setIsCalculatingRoute(false), 100);
            }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapInstanceRef]);

    // -------------------------------
    // Debounce wrapper
    // -------------------------------
    const requestRoute = useCallback(() => {
        if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);

        routeDebounceRef.current = setTimeout(() => {
            drawRoute();
        }, 150);
    }, [drawRoute]);

    return {
        requestRoute,
        isCalculatingRoute,
        etaText,
        etaValue,
        distanceKm,
    };
}
