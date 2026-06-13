
// src/components/maps/BTKMapLayer.jsx

/**
 * BTKMapLayer
 * Custom mapping overlay for Bahria Town Karachi.
 * Google Maps base + custom overlay schema.
 */
import React, { useEffect } from "react";


// ✅ Dynamic precinct imports must be declared BEFORE BTKMapLayer function
const precinctModules = import.meta.glob("../../data/precincts/*.json", {
  eager: true,
});

const BTKMapData = {
  precincts: Object.values(precinctModules).map((mod) => mod.default || mod),
  amenities: [
    // Optional: global amenities here
  ],
};
// Validate precinct JSON structure
BTKMapData.precincts.forEach((p, idx) => {
  if (!p.name || !p.boundary || p.boundary.length === 0) {
    console.warn(
      `⚠️ Invalid precinct data at index ${idx}: missing name or boundary`,
      p
    );
  }
});

const BTKMapLayer = ({ mapInstance }) => {
  const [showPrecincts, setShowPrecincts] = React.useState(true);
  const [showAmenities, setShowAmenities] = React.useState(true);

  useEffect(() => {
    if (!mapInstance || !window.google) return;

    const polygons = [];
    const markers = [];

    if (showPrecincts) {
      BTKMapData.precincts.forEach((p) => {
        // Choose fill color based on precinct category
        const categoryColors = {
          Developed: "#4CAF50",    // green
          Developing: "#FFC107",   // amber
          "Sports City": "#2196F3", // blue
          Paradise: "#9C27B0"      // purple
        };

        const fillColor =
          categoryColors[p.category] || "#F5CB5C"; // fallback default

        const polygon = new window.google.maps.Polygon({
          paths: p.boundary,
          strokeColor: "#103139",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor,
          fillOpacity: 0.35,
          map: mapInstance,
        });

        const infowindow = new window.google.maps.InfoWindow({
          content: `<strong>${p.name}</strong>`,
          position: p.center,
        });
        polygon.addListener("click", () => infowindow.open(mapInstance));
        polygons.push(polygon);

        // 🧭 Debug Label Overlay (for testing only)
        const label = new window.google.maps.Marker({
          position: p.center,
          map: mapInstance,
          label: {
            text: p.name || "Unnamed",
            fontSize: "12px",
            fontWeight: "bold",
            color: "#103139"
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 0 // invisible icon, label only
          }
        });
        polygons.push(label);

      });
    }

    if (showAmenities) {
      BTKMapData.amenities.forEach((a) => {
        let iconUrl;
        switch (a.type) {
          case "mosque":
            iconUrl = "https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png";
            break;
          case "park":
            iconUrl = "https://maps.google.com/mapfiles/kml/shapes/parks.png";
            break;
          case "market":
            iconUrl = "https://maps.google.com/mapfiles/kml/shapes/shopping.png";
            break;
          case "hospital":
            iconUrl = "https://maps.google.com/mapfiles/kml/shapes/hospitals.png";
            break;
          case "school":
            iconUrl = "https://maps.google.com/mapfiles/kml/shapes/schools_maps.png";
            break;
          default:
            iconUrl = "https://maps.google.com/mapfiles/kml/shapes/info-i_maps.png";
        }
        const marker = new window.google.maps.Marker({
          position: a.coords,
          map: mapInstance,
          title: a.name,
          icon: {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<strong>${a.name}</strong><br>${a.description || ""}`,
        });

        // Open on click or hover
        marker.addListener("click", () => infoWindow.open(mapInstance, marker));
        marker.addListener("mouseover", () => infoWindow.open(mapInstance, marker));
        marker.addListener("mouseout", () => infoWindow.close());

        markers.push(marker);
      });
    }

    // --- Auto-fit map to show all precincts ---
    // --- Dynamic fitBounds with smooth zoom transition ---
    if (showPrecincts && BTKMapData.precincts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      BTKMapData.precincts.forEach((p) => {
        if (Array.isArray(p.boundary)) {
          p.boundary.forEach((point) => bounds.extend(point));
        }
      });

      mapInstance.panToBounds(bounds);
      const listener = window.google.maps.event.addListenerOnce(mapInstance, "bounds_changed", () => {
        const currentZoom = mapInstance.getZoom();
        if (currentZoom > 16) mapInstance.setZoom(16);
      });
      window.google.maps.event.removeListener(listener);
    } else if (showAmenities && BTKMapData.amenities.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      BTKMapData.amenities.forEach((a) => bounds.extend(a.coords));
      mapInstance.panToBounds(bounds);
      const listener = window.google.maps.event.addListenerOnce(mapInstance, "bounds_changed", () => {
        const currentZoom = mapInstance.getZoom();
        if (currentZoom > 17) mapInstance.setZoom(17);
      });
      window.google.maps.event.removeListener(listener);
    }
    // ------------------------------------------

    // ------------------------------------------

    return () => {
      polygons.forEach((p) => p.setMap(null));
      markers.forEach((m) => m.setMap(null));
    };
  }, [mapInstance, showPrecincts, showAmenities]);

  return (
    <LegendControl
      onTogglePrecincts={() => setShowPrecincts((prev) => !prev)}
      onToggleAmenities={() => setShowAmenities((prev) => !prev)}
    />
  );
};

// Simple overlay legend + toggles
const LegendControl = ({ onTogglePrecincts, onToggleAmenities }) => (
  <div
    style={{
      position: "absolute",
      bottom: "20px",
      left: "20px",
      background: "white",
      borderRadius: "8px",
      padding: "12px 16px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      fontSize: "14px",
      lineHeight: "1.6",
      zIndex: 999,
      width: "200px"
    }}
  >
    <strong>Map Layers</strong>
    <div>
      <label>
        <input type="checkbox" defaultChecked onChange={onTogglePrecincts} />{" "}
        Precincts
      </label>
    </div>
    <div>
      <label>
        <input type="checkbox" defaultChecked onChange={onToggleAmenities} />{" "}
        Amenities
      </label>
    </div>
    <hr style={{ margin: "8px 0" }} />

    <strong>Categories</strong>
    <div style={{ marginTop: "4px" }}>
      <LegendItem color="#4CAF50" label="Developed" />
      <LegendItem color="#FFC107" label="Developing" />
      <LegendItem color="#2196F3" label="Sports City" />
      <LegendItem color="#9C27B0" label="Paradise" />
    </div>
  </div>
);

// small reusable legend row
const LegendItem = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", marginTop: "3px" }}>
    <span
      style={{
        display: "inline-block",
        width: "14px",
        height: "14px",
        background: color,
        border: "1px solid #333",
        borderRadius: "3px",
        marginRight: "6px"
      }}
    ></span>
    {label}
  </div>
);


export default BTKMapLayer;
