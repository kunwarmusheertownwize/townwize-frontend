// File: townwize-frontend/src/pages/passenger/Home/BTKMapContainer.jsx

// src/pages/passenger/Home/BTKMapContainer.jsx
import { useEffect } from "react";
import BTKMapLayer from "../../../components/maps/BTKMapLayer";

const BTKMapContainer = ({ mapRef, mapInstanceRef, pickupCoords }) => {
  useEffect(() => {
    if (!mapInstanceRef.current || !pickupCoords) return;

    const { lat, lng } = pickupCoords;
    const position = new window.google.maps.LatLng(lat, lng);
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);
  }, [pickupCoords, mapInstanceRef]);

  return (
    <div className="w-full h-[400px] mt-10 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 relative">
      <div ref={mapRef} className="w-full h-full" />
      {mapInstanceRef.current && (
        <BTKMapLayer mapInstance={mapInstanceRef.current} />
      )}
    </div>
  );
};

export default BTKMapContainer;

