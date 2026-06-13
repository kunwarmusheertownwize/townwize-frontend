import { useEffect, useMemo, useRef, useState } from "react";
import {
  createZone,
  deleteZone,
  fetchZoneById,
  fetchZones,
  updateZone,
  updateZonePriority,
  updateZoneStatus,
} from "../../../api/adminApi";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";

const DEFAULT_CENTER = { lat: 25.0478, lng: 67.0583 };
const DEFAULT_ZOOM = 12;

const emptyForm = {
  code: "",
  name: "",
  type: "polygon",
  radiusKm: 2,
  priority: 100,
  active: true,
  pickupEnabled: true,
  dropoffEnabled: true,
  driverOnlineEnabled: true,
  surgeEnabled: false,
};

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function geometryToCenter(geometry) {
  if (!geometry || typeof geometry !== "object") return null;
  if (geometry.type === "Point" && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
    return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
  }
  const first = geometry?.coordinates?.[0]?.[0];
  if (geometry.type === "Polygon" && Array.isArray(first) && first.length >= 2) {
    return { lng: first[0], lat: first[1] };
  }
  return null;
}

function normalizeZoneGeometry(zone) {
  const g = zone?.geometry;
  if (g?.type === "Polygon" && Array.isArray(g?.coordinates?.[0]) && g.coordinates[0].length >= 3) {
    return { type: "Polygon", coordinates: g.coordinates };
  }
  if (g?.type === "Point" && Array.isArray(g?.coordinates) && g.coordinates.length >= 2) {
    return {
      type: "Point",
      coordinates: g.coordinates,
      radiusKm: Number(g.radiusKm ?? g.radius ?? zone?.radiusKm ?? zone?.radius ?? 1),
    };
  }

  // Legacy fallbacks
  if (Array.isArray(zone?.coordinates?.[0]) && zone.coordinates[0].length >= 3) {
    return { type: "Polygon", coordinates: zone.coordinates };
  }
  if (Array.isArray(zone?.center) && zone.center.length >= 2) {
    return {
      type: "Point",
      coordinates: zone.center,
      radiusKm: Number(zone?.radiusKm ?? zone?.radius ?? 1),
    };
  }
  return null;
}

function settingsFromZone(zone) {
  const s = zone?.settings || {};
  return {
    pickupEnabled: s.pickupEnabled !== false,
    dropoffEnabled: s.dropoffEnabled !== false,
    driverOnlineEnabled: s.driverOnlineEnabled !== false,
    surgeEnabled: s.surgeEnabled === true,
  };
}

function latLngValue(location) {
  if (!location) return null;
  const lat = typeof location.lat === "function" ? location.lat() : Number(location.lat);
  const lng = typeof location.lng === "function" ? location.lng() : Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function buildZonePayload(form, geometry) {
  const payloadGeometry =
    form.type === "circle"
      ? {
        ...geometry,
        radiusKm: Number(form.radiusKm || geometry.radiusKm || 2),
      }
      : geometry;

  return {
    code: String(form.code || "").trim().toUpperCase(),
    name: String(form.name || "").trim(),
    type: form.type,
    priority: toNum(form.priority, 100),
    active: Boolean(form.active),
    geometry: payloadGeometry,
    settings: {
      pickupEnabled: Boolean(form.pickupEnabled),
      dropoffEnabled: Boolean(form.dropoffEnabled),
      driverOnlineEnabled: Boolean(form.driverOnlineEnabled),
      surgeEnabled: Boolean(form.surgeEnabled),
    },
  };
}

export default function Zones() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const [form, setForm] = useState(emptyForm);
  const [polygonText, setPolygonText] = useState("");
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [isPolygonDrawing, setIsPolygonDrawing] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");

  const mapRef = useRef(null);
  const mapNodeRef = useRef(null);
  const searchBoxRef = useRef(null);
  const placesAutocompleteRef = useRef(null);
  const drawingModeRef = useRef("");
  const mapClickListenerRef = useRef(null);
  const projectionOverlayRef = useRef(null);
  const drawingPointerStartRef = useRef(null);
  const activeOverlayRef = useRef(null);
  const overlaysRef = useRef([]);
  const vertexMarkersRef = useRef([]);
  const watchRef = useRef(null);
  const meMarkerRef = useRef(null);
  const formTypeRef = useRef(emptyForm.type);
  const radiusKmRef = useRef(emptyForm.radiusKm);

  const isEditing = Boolean(editingId);
  const selectedZone = useMemo(() => items.find((z) => z._id === editingId) || null, [items, editingId]);

  useEffect(() => {
    formTypeRef.current = form.type;
    radiusKmRef.current = form.radiusKm;
  }, [form.type, form.radiusKm]);

  useEffect(() => {
    if (form.type !== "polygon") return;
    renderPolygonEditor(polygonPoints);
  }, [polygonPoints, form.type]);

  const clearAllDrawnOverlays = ({ keepDrawingMode = false } = {}) => {
    if (!keepDrawingMode) drawingModeRef.current = "";
    if (!keepDrawingMode) {
      setIsPolygonDrawing(false);
      mapRef.current?.setOptions?.({ draggableCursor: null });
      mapClickListenerRef.current?.remove?.();
      mapClickListenerRef.current = null;
    }
    overlaysRef.current.forEach((o) => o?.setMap?.(null));
    overlaysRef.current = [];
    vertexMarkersRef.current.forEach((m) => m?.setMap?.(null));
    vertexMarkersRef.current = [];
    activeOverlayRef.current = null;
    setPolygonPoints([]);
    setPolygonText("");
  };

  const polygonPointsFromText = (text) => {
    const lines = String(text || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const points = [];
    for (const line of lines) {
      const [latStr, lngStr] = line.split(",").map((s) => s.trim());
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      points.push({ lat, lng });
    }
    return points;
  };

  const polygonTextFromPoints = (points) =>
    points.map((p) => `${Number(p.lat).toFixed(6)}, ${Number(p.lng).toFixed(6)}`).join("\n");

  const geometryFromPolygonPoints = (points) => {
    const clean = (points || [])
      .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (clean.length < 3) return null;

    const coords = clean.map((p) => [Number(p.lng.toFixed(8)), Number(p.lat.toFixed(8))]);
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);

    return { type: "Polygon", coordinates: [coords] };
  };

  const clearPolygonEditorOverlays = () => {
    overlaysRef.current.forEach((o) => o?.setMap?.(null));
    overlaysRef.current = [];
    vertexMarkersRef.current.forEach((m) => m?.setMap?.(null));
    vertexMarkersRef.current = [];
    activeOverlayRef.current = null;
  };

  const renderPolygonEditor = (points) => {
    if (!mapRef.current || !window.google?.maps) return;

    clearPolygonEditorOverlays();
    const clean = (points || [])
      .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    setPolygonText(polygonTextFromPoints(clean));

    if (clean.length) {
      const overlay = new window.google.maps.Polygon({
        map: mapRef.current,
        paths: clean,
        fillColor: "#2563eb",
        fillOpacity: clean.length >= 3 ? 0.18 : 0,
        strokeColor: "#1d4ed8",
        strokeOpacity: 1,
        strokeWeight: 2,
        editable: false,
        draggable: false,
        clickable: false,
      });
      overlay.__zoneGeometry = geometryFromPolygonPoints(clean);
      overlaysRef.current.push(overlay);
      activeOverlayRef.current = overlay;
    }

    clean.forEach((point, index) => {
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: point,
        draggable: true,
        label: String(index + 1),
        title: `Polygon point ${index + 1}`,
      });
      marker.addListener("dragend", (event) => {
        const nextPoint = latLngValue(event.latLng);
        if (!nextPoint) return;
        setPolygonPoints((current) => {
          const next = [...current];
          next[index] = {
            lat: Number(nextPoint.lat.toFixed(8)),
            lng: Number(nextPoint.lng.toFixed(8)),
          };
          return next;
        });
      });
      vertexMarkersRef.current.push(marker);
    });
  };

  const addPolygonPoint = (pointOrEvent) => {
    const latLng = pointOrEvent?.latLng || pointOrEvent;
    const point = latLngValue(latLng);
    if (!point) return;

    setError("");
    setForm((p) => ({ ...p, type: "polygon" }));
    setPolygonPoints((current) => [
      ...current,
      {
        lat: Number(point.lat.toFixed(8)),
        lng: Number(point.lng.toFixed(8)),
      },
    ]);
  };

  const addPointToActivePolygon = (pointOrEvent) => {
    addPolygonPoint(pointOrEvent);
  };

  const ensurePolygonClickListener = () => {
    if (!mapRef.current || !window.google?.maps) return;

    mapClickListenerRef.current?.remove?.();
    mapClickListenerRef.current = mapRef.current.addListener("click", (event) => {
      if (drawingModeRef.current !== "polygon") return;
      if (!event?.latLng) return;
      addPointToActivePolygon(event.latLng);
    });
    drawingModeRef.current = "polygon";
    setIsPolygonDrawing(true);
    mapRef.current.setOptions?.({ draggableCursor: "crosshair" });
  };

  const addMapCenterPoint = () => {
    const center = mapRef.current?.getCenter?.();
    const point = latLngValue(center);
    if (!point) {
      setError("Map is not ready yet. Try again in a moment.");
      return;
    }
    addPolygonPoint(point);
    setMessage(`Point ${polygonPoints.length + 1} added at map center.`);
  };

  const drawingPointerToLatLng = (event) => {
    if (!window.google?.maps || !mapNodeRef.current) return null;
    const projection = projectionOverlayRef.current?.getProjection?.();
    if (!projection) return null;

    const rect = mapNodeRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

    return projection.fromContainerPixelToLatLng(new window.google.maps.Point(x, y));
  };

  const onDrawingLayerPointerDown = (event) => {
    if (drawingModeRef.current !== "polygon") return;
    drawingPointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const onDrawingLayerClick = (event) => {
    if (drawingModeRef.current !== "polygon") return;

    const target = event.target;
    if (target?.closest?.("button, input, select, textarea, a")) return;

    const start = drawingPointerStartRef.current;
    drawingPointerStartRef.current = null;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;

    const latLng = drawingPointerToLatLng(event);
    if (!latLng) {
      setError("Map is still getting ready. Try again in a moment.");
      return;
    }

    event.preventDefault();
    addPointToActivePolygon(latLng);
  };

  const syncGeometryFromOverlay = (overlay) => {
    if (!overlay || !window.google) return;
    if (overlay.getCenter && overlay.getRadius) {
      const c = overlay.getCenter();
      const rMeters = overlay.getRadius();
      const rKm = Number((rMeters / 1000).toFixed(3));
      const geometry = {
        type: "Point",
        coordinates: [Number(c.lng().toFixed(8)), Number(c.lat().toFixed(8))],
        radiusKm: rKm,
      };
      activeOverlayRef.current.__zoneGeometry = geometry;
      setForm((p) => ({ ...p, radiusKm: rKm }));
      return;
    }
    if (overlay.getPath) {
      const path = overlay?.getPath?.();
      if (!path || typeof path.getLength !== "function" || typeof path.getAt !== "function") return;
      const points = [];
      const uiPoints = [];
      for (let i = 0; i < path.getLength(); i += 1) {
        const p = path.getAt(i);
        points.push([Number(p.lng().toFixed(8)), Number(p.lat().toFixed(8))]);
        uiPoints.push({ lat: Number(p.lat().toFixed(6)), lng: Number(p.lng().toFixed(6)) });
      }
      if (points.length >= 3) {
        const first = points[0];
        const last = points[points.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) points.push(first);
      }
      const geometry = { type: "Polygon", coordinates: [points] };
      activeOverlayRef.current.__zoneGeometry = geometry;
      setPolygonText(polygonTextFromPoints(uiPoints));
    }
  };

  const bindOverlayEditListeners = (overlay) => {
    if (!overlay || !window.google) return;
    if (typeof overlay.getPath === "function") {
      const path = overlay.getPath();
      if (!path || typeof path.addListener !== "function") return;
      path.addListener("set_at", () => syncGeometryFromOverlay(overlay));
      path.addListener("insert_at", () => syncGeometryFromOverlay(overlay));
      path.addListener("remove_at", () => syncGeometryFromOverlay(overlay));
    }
    if (overlay.getCenter) {
      overlay.addListener("center_changed", () => syncGeometryFromOverlay(overlay));
      overlay.addListener("radius_changed", () => syncGeometryFromOverlay(overlay));
    }
  };

  const drawGeometryOnMap = (geometry, editable = true) => {
    if (!mapRef.current || !window.google || !geometry) return null;

    let overlay = null;
    if (geometry.type === "Point") {
      const radiusKm = Number(geometry.radiusKm || geometry.radius || form.radiusKm || 2);
      overlay = new window.google.maps.Circle({
        map: mapRef.current,
        center: {
          lat: Number(geometry.coordinates?.[1] || DEFAULT_CENTER.lat),
          lng: Number(geometry.coordinates?.[0] || DEFAULT_CENTER.lng),
        },
        radius: radiusKm * 1000,
        fillColor: "#16a34a",
        fillOpacity: 0.2,
        strokeColor: "#15803d",
        strokeOpacity: 1,
        strokeWeight: 2,
        editable,
        draggable: editable,
      });
      mapRef.current.panTo(overlay.getCenter());
    } else if (geometry.type === "Polygon") {
      const ring = geometry.coordinates?.[0] || [];
      const path = ring.map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }));
      const openPath = path.length > 1 && path[0].lat === path[path.length - 1].lat && path[0].lng === path[path.length - 1].lng
        ? path.slice(0, -1)
        : path;
      const bounds = new window.google.maps.LatLngBounds();
      openPath.forEach((p) => bounds.extend(p));
      if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds);
      setPolygonPoints(openPath);
      setPolygonText(polygonTextFromPoints(openPath));
      return null;
    }

    if (overlay) {
      overlaysRef.current.push(overlay);
      activeOverlayRef.current = overlay;
      bindOverlayEditListeners(overlay);
      syncGeometryFromOverlay(overlay);
    }
    return overlay;
  };

  const currentGeometry = () => {
    if (form.type === "polygon") {
      const points = polygonPoints.length ? polygonPoints : polygonPointsFromText(polygonText);
      return geometryFromPolygonPoints(points);
    }

    const g = activeOverlayRef.current?.__zoneGeometry;
    if (!g) return null;
    if (form.type === "circle" && (!g.coordinates || !g.radiusKm || g.radiusKm <= 0)) return null;
    return g;
  };

  const loadZones = async () => {
    setLoading(true);
    setError("");
    try {
      const json = await fetchZones({ q: query, status, page, limit: 50 });
      setItems(json?.data?.items || []);
      setMeta({
        page: json?.data?.page || 1,
        totalPages: json?.data?.totalPages || 1,
        total: json?.data?.total || 0,
      });
    } catch (e) {
      setError(e?.message || "Failed to load zones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, [query, status, page]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await loadGoogleMaps();
        if (!mounted || !mapNodeRef.current) return;
        const { Map } = await window.google.maps.importLibrary("maps");
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places");

        mapRef.current = new Map(mapNodeRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          mapTypeId: "roadmap",
          streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: true,
      });

        const projectionOverlay = new window.google.maps.OverlayView();
        projectionOverlay.onAdd = () => {};
        projectionOverlay.draw = () => {};
        projectionOverlay.onRemove = () => {};
        projectionOverlay.setMap(mapRef.current);
        projectionOverlayRef.current = projectionOverlay;

        const applySelectedLocation = ({ lat, lng, viewport }) => {
          if (!mapRef.current) return;
          const center = { lat, lng };

          if (viewport) mapRef.current.fitBounds(viewport);
          else {
            mapRef.current.panTo(center);
            mapRef.current.setZoom(15);
          }

          if (formTypeRef.current !== "circle") return;

          const radiusKm = Number(radiusKmRef.current || 2);
          const radiusMeters = Math.max(100, radiusKm * 1000);

          const existing = activeOverlayRef.current;
          if (existing && existing.getCenter && existing.getRadius) {
            existing.setCenter(center);
            existing.setRadius(radiusMeters);
            syncGeometryFromOverlay(existing);
            return;
          }

          clearAllDrawnOverlays();
          const overlay = new window.google.maps.Circle({
            map: mapRef.current,
            center,
            radius: radiusMeters,
            fillColor: "#16a34a",
            fillOpacity: 0.2,
            strokeColor: "#15803d",
            strokeOpacity: 1,
            strokeWeight: 2,
            editable: true,
            draggable: true,
          });
          overlaysRef.current.push(overlay);
          activeOverlayRef.current = overlay;
          bindOverlayEditListeners(overlay);
          syncGeometryFromOverlay(overlay);
        };

        if (searchBoxRef.current && PlaceAutocompleteElement) {
          searchBoxRef.current.innerHTML = "";
          const autocomplete = new PlaceAutocompleteElement();
          autocomplete.setAttribute("placeholder", "Search location");
          autocomplete.style.display = "block";
          autocomplete.style.width = "100%";
          placesAutocompleteRef.current = autocomplete;
          searchBoxRef.current.appendChild(autocomplete);

          autocomplete.addEventListener("gmp-select", async (event) => {
            const placePrediction = event.placePrediction || event.detail?.placePrediction;
            const place = placePrediction?.toPlace?.();
            if (!place) return;

            await place.fetchFields({ fields: ["location", "viewport", "displayName", "formattedAddress"] });
            const loc = place.location;
            const latRaw = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
            const lngRaw = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;
            const lat = Number(latRaw);
            const lng = Number(lngRaw);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            applySelectedLocation({
              lat: Number(lat.toFixed(8)),
              lng: Number(lng.toFixed(8)),
              viewport: place.viewport,
            });
          });
        }

      } catch (e) {
        setError(e?.message || "Failed to load Google Maps");
      }
    };

    init();

    return () => {
      mounted = false;
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      mapClickListenerRef.current?.remove?.();
      projectionOverlayRef.current?.setMap?.(null);
      projectionOverlayRef.current = null;
      clearAllDrawnOverlays();
      if (meMarkerRef.current) meMarkerRef.current.setMap(null);
    };
  }, []);

  const resetForm = () => {
    setEditingId("");
    setForm(emptyForm);
    setMessage("");
    setError("");
    clearAllDrawnOverlays();
  };

  const onSave = async () => {
    const geometry = currentGeometry();
    if (!geometry) {
      setError(form.type === "circle" ? "Draw a circle zone first." : "Draw a polygon zone first.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = buildZonePayload(form, geometry);
      if (isEditing) {
        delete payload.code;
        await updateZone(editingId, payload);
        setMessage("Zone updated.");
      } else {
        await createZone(payload);
        setMessage("Zone created.");
      }
      await loadZones();
      resetForm();
    } catch (e) {
      setError(e?.message || "Failed to save zone");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = async (zone) => {
    try {
      setError("");
      setMessage("");
      const detail = await fetchZoneById(zone._id);
      const fullZone = detail?.data || zone;
      const geometry = normalizeZoneGeometry(fullZone);
      const normalizedType = fullZone?.type || (geometry?.type === "Point" ? "circle" : "polygon");
      const s = settingsFromZone(fullZone);

      setEditingId(fullZone._id);
      setForm({
        code: fullZone.code || "",
        name: fullZone.name || "",
        type: normalizedType,
        radiusKm: Number(geometry?.radiusKm || 2),
        priority: Number(fullZone.priority ?? 100),
        active: Boolean(fullZone.active),
        ...s,
      });

      clearAllDrawnOverlays();
      if (geometry) {
        drawGeometryOnMap(geometry, true);
      } else {
        setError("This zone has no saved geometry. Draw a new shape, then update.");
      }
    } catch (e) {
      setError(e?.message || "Failed to load zone for editing");
    }
  };

  const onToggle = async (zone) => {
    try {
      setError("");
      setMessage("");
      await updateZoneStatus(zone._id, !zone.active);
      setMessage(zone.active ? "Zone deactivated." : "Zone activated.");
      await loadZones();
    } catch (e) {
      setError(e?.message || "Failed to update zone status");
    }
  };

  const onPriority = async (zone, priority) => {
    try {
      await updateZonePriority(zone._id, Number(priority));
      await loadZones();
    } catch (e) {
      setError(e?.message || "Failed to update zone priority");
    }
  };

  const onDelete = async (zone) => {
    if (!window.confirm(`Delete zone "${zone.name}" (${zone.code})?`)) return;
    try {
      await deleteZone(zone._id);
      setMessage("Zone deleted.");
      await loadZones();
      if (editingId === zone._id) resetForm();
    } catch (e) {
      setError(e?.message || "Failed to delete zone");
    }
  };

  const onOpenMap = (zone) => {
    const center = geometryToCenter(zone.geometry);
    if (!center) return;
    window.open(`https://www.google.com/maps?q=${center.lat},${center.lng}`, "_blank", "noopener,noreferrer");
  };

  const onUseMyLocation = () => {
    if (!navigator.geolocation || !mapRef.current) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    if (locationBusy) return;
    setError("");
    setLocationBusy(true);
    let resolved = false;
    let best = null;
    const startedAt = Date.now();
    const HARD_TIMEOUT_MS = 22000;
    const GOOD_ACCURACY_M = 60;
    const ACCEPTABLE_ACCURACY_M = 150;
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        const elapsed = Date.now() - startedAt;
        const shouldResolveNow =
          pos.coords.accuracy <= GOOD_ACCURACY_M ||
          (elapsed >= HARD_TIMEOUT_MS && best && best.coords.accuracy <= ACCEPTABLE_ACCURACY_M);
        if (shouldResolveNow) {
          if (resolved) return;
          resolved = true;
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
          const lat = best.coords.latitude;
          const lng = best.coords.longitude;
          const me = { lat, lng };
          mapRef.current.panTo(me);
          mapRef.current.setZoom(16);
          if (meMarkerRef.current) meMarkerRef.current.setMap(null);
          meMarkerRef.current = new window.google.maps.Marker({
            position: me,
            map: mapRef.current,
            title: `My Location (${Math.round(best.coords.accuracy)}m)`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });
          setMessage(
            `Location set to ${lat.toFixed(6)}, ${lng.toFixed(6)} (accuracy ~${Math.round(best.coords.accuracy)}m)`
          );
          setLocationBusy(false);
        }
      },
      () => {
        if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
        setLocationBusy(false);
        setError("Unable to fetch your current location.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    window.setTimeout(() => {
      if (resolved) return;
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;

      if (best) {
        const lat = best.coords.latitude;
        const lng = best.coords.longitude;
        const me = { lat, lng };
        mapRef.current.panTo(me);
        mapRef.current.setZoom(16);
        if (meMarkerRef.current) meMarkerRef.current.setMap(null);
        meMarkerRef.current = new window.google.maps.Marker({
          position: me,
          map: mapRef.current,
          title: `My Location (${Math.round(best.coords.accuracy)}m)`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        setMessage(
          `Location set with low accuracy (${Math.round(best.coords.accuracy)}m). Move near open sky and retry for better precision.`
        );
        setLocationBusy(false);
        return;
      }

      setLocationBusy(false);
      setError("Unable to fetch your current location.");
    }, HARD_TIMEOUT_MS + 500);
  };

  const setDrawMode = (mode, nextType = null) => {
    if (!mapRef.current || !window.google) return;
    const targetType = nextType || mode;
    setError("");
    setMessage("");
    setForm((p) => ({ ...p, type: targetType }));

    if (targetType === "polygon") {
      drawingModeRef.current = "polygon";
      if (activeOverlayRef.current && !activeOverlayRef.current.getPath) clearAllDrawnOverlays();
      ensurePolygonClickListener();
      setMessage("Click the map to add polygon points, or pan the map and use Add Map Center Point. Drag numbered points to adjust.");
      return;
    }

    if (targetType === "circle") {
      clearAllDrawnOverlays();
      drawingModeRef.current = "";
      const center = mapRef.current.getCenter();
      const radiusKm = Number(radiusKmRef.current || 2);
      const overlay = new window.google.maps.Circle({
        map: mapRef.current,
        center,
        radius: Math.max(100, radiusKm * 1000),
        fillColor: "#16a34a",
        fillOpacity: 0.2,
        strokeColor: "#15803d",
        strokeOpacity: 1,
        strokeWeight: 2,
        editable: true,
        draggable: true,
      });
      overlaysRef.current.push(overlay);
      activeOverlayRef.current = overlay;
      bindOverlayEditListeners(overlay);
      syncGeometryFromOverlay(overlay);
      setMessage("Circle added. Drag it or change the radius.");
    }
  };

  const applyPolygonTextToMap = () => {
    const points = polygonPointsFromText(polygonText);
    if (points.length < 3) {
      setError("Polygon needs at least 3 valid points.");
      return;
    }
    setError("");
    setMessage("Polygon points applied.");
    setForm((p) => ({ ...p, type: "polygon" }));
    setPolygonPoints(points.map((p) => ({ lat: Number(p.lat.toFixed(8)), lng: Number(p.lng.toFixed(8)) })));
    if (window.google && mapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds);
    }
  };

  const undoLastPolygonPoint = () => {
    setPolygonPoints((current) => {
      const next = current.slice(0, -1);
      setPolygonText(polygonTextFromPoints(next));
      return next;
    });
  };

  const clearPolygonPoints = () => {
    setPolygonPoints([]);
    setPolygonText("");
    clearPolygonEditorOverlays();
    setMessage("Polygon cleared.");
  };

  useEffect(() => {
    if (form.type !== "circle") return;
    const overlay = activeOverlayRef.current;
    if (!overlay || !overlay.getRadius) return;
    const nextMeters = Number(form.radiusKm || 0) * 1000;
    if (Number.isFinite(nextMeters) && nextMeters > 0) {
      overlay.setRadius(nextMeters);
      syncGeometryFromOverlay(overlay);
    }
  }, [form.radiusKm, form.type]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Service Zones</h1>

      {message ? <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            <div ref={searchBoxRef} className="min-w-[240px] flex-1" />
            <button className="px-3 py-2 rounded-md border text-sm" onClick={onUseMyLocation}>
              {locationBusy ? "Locating..." : "Use My Location"}
            </button>
            <button className="px-3 py-2 rounded-md border text-sm" onClick={() => setDrawMode("polygon", "polygon")}>
              Polygon
            </button>
            <button className="px-3 py-2 rounded-md border text-sm" onClick={() => setDrawMode("circle", "circle")}>
              Circle
            </button>
            <button className="px-3 py-2 rounded-md border text-sm" onClick={clearAllDrawnOverlays}>
              Clear Shape
            </button>
          </div>
          <div
            className={`relative w-full h-[440px] overflow-hidden rounded-lg border border-gray-200 ${isPolygonDrawing ? "cursor-crosshair" : ""}`}
            onPointerDownCapture={onDrawingLayerPointerDown}
            onClickCapture={onDrawingLayerClick}
          >
            <div ref={mapNodeRef} className="h-full w-full" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Code"
              value={form.code}
              disabled={isEditing}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Zone name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <select className="border rounded-md px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="polygon">Polygon</option>
                <option value="circle">Circle</option>
              </select>
              <input
                type="number"
                className="border rounded-md px-3 py-2 text-sm"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              />
            </div>
            {form.type === "circle" ? (
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-sm text-gray-600">Radius (km)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="border rounded-md px-3 py-2 text-sm"
                  value={form.radiusKm}
                  onChange={(e) => setForm((p) => ({ ...p, radiusKm: e.target.value }))}
                />
              </div>
            ) : null}
            {form.type === "polygon" ? (
              <div className="space-y-2">
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-[110px]"
                  placeholder={"Polygon points, one per line:\n24.860700, 67.001100\n24.861500, 67.012000"}
                  value={polygonText}
                  onChange={(e) => setPolygonText(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-2 rounded-md border text-sm" onClick={addMapCenterPoint}>
                    Add Map Center Point
                  </button>
                  <button className="px-3 py-2 rounded-md border text-sm" onClick={undoLastPolygonPoint}>
                    Undo Last Point
                  </button>
                  <button className="px-3 py-2 rounded-md border text-sm" onClick={clearPolygonPoints}>
                    Clear Polygon
                  </button>
                  <button className="px-3 py-2 rounded-md border text-sm" onClick={applyPolygonTextToMap}>
                    Apply Points
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />Active</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.pickupEnabled} onChange={(e) => setForm((p) => ({ ...p, pickupEnabled: e.target.checked }))} />Pickup</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.dropoffEnabled} onChange={(e) => setForm((p) => ({ ...p, dropoffEnabled: e.target.checked }))} />Dropoff</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.driverOnlineEnabled} onChange={(e) => setForm((p) => ({ ...p, driverOnlineEnabled: e.target.checked }))} />Driver Online</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.surgeEnabled} onChange={(e) => setForm((p) => ({ ...p, surgeEnabled: e.target.checked }))} />Surge</label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="px-3 py-2 rounded-md bg-townwize-primary text-white text-sm disabled:opacity-50"
              disabled={saving || !form.name.trim() || (!isEditing && !form.code.trim())}
              onClick={onSave}
            >
              {saving ? "Saving..." : isEditing ? "Update Zone" : "Create Zone"}
            </button>
            <button className="px-3 py-2 rounded-md border text-sm" onClick={resetForm}>Reset</button>
            {isEditing && selectedZone ? <span className="text-xs text-gray-500">Editing: {selectedZone.code}</span> : null}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="w-full md:w-96 border rounded-md px-3 py-2 text-sm"
            placeholder="Search by code or name"
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Shape</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Map</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-10 text-center text-gray-500" colSpan={7}>Loading zones...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={7}>No zones found.</td></tr>
            ) : (
              items.map((z) => (
                <tr key={z._id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{z.code || "-"}</td>
                  <td className="px-4 py-3">{z.name || "-"}</td>
                  <td className="px-4 py-3">{z.type || "-"}</td>
                  <td className="px-4 py-3">
                    <input type="number" className="w-20 border rounded px-2 py-1" defaultValue={z.priority ?? 100} onBlur={(e) => onPriority(z, e.target.value)} />
                  </td>
                  <td className="px-4 py-3">{z.active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3"><button className="text-townwize-primary underline" onClick={() => onOpenMap(z)}>Open Map</button></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="px-2 py-1 border rounded text-xs" onClick={() => onEdit(z)}>Edit</button>
                      <button className="px-2 py-1 border rounded text-xs" onClick={() => onToggle(z)}>{z.active ? "Deactivate" : "Activate"}</button>
                      <button className="px-2 py-1 border border-red-300 text-red-700 rounded text-xs" onClick={() => onDelete(z)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>Total: {meta.total}</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span>Page {meta.page} / {meta.totalPages}</span>
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
