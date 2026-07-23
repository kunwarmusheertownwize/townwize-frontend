/* global google */
import { useRef, useEffect } from "react";
import { loadGoogleMaps } from "../../../../utils/googleMapsLoader";
import { toast } from "react-toastify";

const GOOGLE_MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID;

const BTK_CENTER = { lat: 25.08994, lng: 67.34764 };
const BTK_ZOOM = 16;

export default function useMapCore({ onMapClick }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const mapsReadyRef = useRef(false);
    const sessionTokenRef = useRef(null);
    const initializedOnceRef = useRef(false);

    useEffect(() => {
        if (initializedOnceRef.current) return;
        initializedOnceRef.current = true;

        // ✅ USE SHARED LOADER (NEVER create a new Loader here)
        loadGoogleMaps()
            .then(async () => {
                if (!window.google?.maps) {
                    toast.error("Google Maps failed to initialize.");
                    return;
                }

                // Load modules
                await google.maps.importLibrary("maps");
                await google.maps.importLibrary("places");
                await google.maps.importLibrary("marker");
                await google.maps.importLibrary("geocoding");
                await google.maps.importLibrary("geometry");
                await google.maps.importLibrary("routes");

                const { AutocompleteSessionToken } =
                    await google.maps.importLibrary("places");
                sessionTokenRef.current = new AutocompleteSessionToken();

                mapsReadyRef.current = true;

                // Create Map
                if (!mapRef.current) {
                    console.warn("Map container not ready yet");
                    return;
                }

                mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                    center: BTK_CENTER,
                    zoom: BTK_ZOOM,
                    mapId: GOOGLE_MAP_ID,
                    gestureHandling: "greedy",
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                });

                // Android WebView may not have laid out the container by the time
                // the Maps constructor runs — force a resize after a paint cycle
                setTimeout(() => {
                    if (mapInstanceRef.current && mapRef.current) {
                        google.maps.event.trigger(mapInstanceRef.current, "resize");
                        mapInstanceRef.current.setCenter(BTK_CENTER);
                    }
                }, 150);

                // Map click handler
                mapInstanceRef.current.addListener("click", (e) => {
                    if (typeof onMapClick === "function") {
                        onMapClick(e.latLng);
                    }
                });
            })
            .catch((err) => {
                console.error("Google Maps load error:", err);
                toast.error("Failed to load Google Maps.");
            });
    }, [onMapClick]);

    return {
        mapRef,
        mapInstanceRef,
        mapsReadyRef,
        sessionTokenRef,
    };
}
