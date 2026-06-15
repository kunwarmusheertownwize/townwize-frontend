/* global google */

export async function resolveAddressFromCoords(lat, lng) {
  if (!window.google?.maps) {
    throw new Error("Google Maps not loaded");
  }

  const { Geocoder } = await google.maps.importLibrary("geocoding");
  const geocoder = new Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== "OK" || !results?.length) {
        reject(new Error("Reverse geocode failed"));
        return;
      }
      resolve(results[0].formatted_address);
    });
  });
}
