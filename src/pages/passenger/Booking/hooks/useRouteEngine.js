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
    const altPolylinesRef = useRef([]);          // alternative route polylines
    const routeLabelMarkersRef = useRef([]);     // numbered bubbles per route

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
                zIndex: 3,
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

        // Clear previous alt route polylines and label bubbles
        altPolylinesRef.current.forEach((p) => p.setMap(null));
        altPolylinesRef.current = [];
        routeLabelMarkersRef.current.forEach((m) => { m.map = null; });
        routeLabelMarkersRef.current = [];

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
                provideRouteAlternatives: true,
            },
            (result, status) => {
                if (status !== "OK" || !result) {
                    toast.error(`Route error: ${status}`);
                    setIsCalculatingRoute(false);
                    return;
                }

                directionsRendererRef.current.setDirections(result);

                // overview_path is already an array of LatLng — no decode needed
                const allPaths = result.routes.map((r) => r.overview_path);

                // activateRoute: animate route idx, draw all others as clickable blue alts
                const activateRoute = (idx) => {
                    altPolylinesRef.current.forEach((p) => p.setMap(null));
                    altPolylinesRef.current = [];
                    routeLabelMarkersRef.current.forEach((m) => { m.map = null; });
                    routeLabelMarkersRef.current = [];

                    allPaths.forEach((p, i) => {
                        if (i === idx) return;
                        const alt = new google.maps.Polyline({
                            path: p,
                            map: mapInstanceRef.current,
                            strokeColor: "#60A5FA",
                            strokeWeight: 4,
                            strokeOpacity: 0.65,
                            zIndex: 1,
                            clickable: true,
                        });
                        alt.addListener("click", () => activateRoute(i));
                        altPolylinesRef.current.push(alt);
                    });

                    // Numbered bubbles at the midpoint of each route
                    allPaths.forEach((p, i) => {
                        if (!p.length) return;
                        const mid = p[Math.floor(p.length / 2)];
                        const isActive = i === idx;

                        const el = document.createElement("div");
                        el.style.cssText = [
                            "width:28px", "height:28px", "border-radius:50%",
                            `background:${isActive ? "#03311C" : "#ffffff"}`,
                            `color:${isActive ? "#ffffff" : "#60A5FA"}`,
                            `border:2px solid ${isActive ? "#ffffff" : "#60A5FA"}`,
                            "display:flex", "align-items:center", "justify-content:center",
                            "font-weight:700", "font-size:13px", "font-family:sans-serif",
                            "box-shadow:0 2px 8px rgba(0,0,0,0.30)",
                            "cursor:pointer", "user-select:none",
                            "transition:transform 0.15s",
                        ].join(";");
                        el.textContent = String(i + 1);

                        if (!isActive) {
                            el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.2)"; });
                            el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
                            el.addEventListener("click", () => activateRoute(i));
                        }

                        const marker = new google.maps.marker.AdvancedMarkerElement({
                            position: mid,
                            map: mapInstanceRef.current,
                            content: el,
                            zIndex: isActive ? 10 : 5,
                        });
                        routeLabelMarkersRef.current.push(marker);
                    });

                    animateRouteOverlay(allPaths[idx]);

                    let totalSeconds = 0;
                    let totalMeters = 0;
                    result.routes[idx].legs.forEach((leg) => {
                        totalSeconds += leg.duration.value;
                        totalMeters += leg.distance.value;
                    });
                    setEtaText(result.routes[idx].legs.at(-1).duration.text);
                    setEtaValue(totalSeconds);
                    setDistanceKm(totalMeters / 1000);
                };

                activateRoute(0);

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
