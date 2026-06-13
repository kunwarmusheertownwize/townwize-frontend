/* global google */

// -----------------------------------------------------
// Google-accurate reverse geocoding (no bounds, no bias)
// -----------------------------------------------------
export async function resolveAddressFromCoords(lat, lng) {
    if (!window.google?.maps) {
        throw new Error("Google Maps not loaded");
    }

    const { Geocoder } = await google.maps.importLibrary("geocoding");
    const geocoder = new Geocoder();

    return new Promise((resolve, reject) => {
        geocoder.geocode(
            {
                location: { lat, lng },
            },
            (results, status) => {
                if (status !== "OK" || !results?.length) {
                    reject(new Error("Reverse geocode failed"));
                    return;
                }

                // -------------------------------------------------
                // Google Maps UI–style result selection
                // -------------------------------------------------

                // 1️⃣ Prefer exact rooftop / street address
                const rooftop = results.find(
                    (r) =>
                        r.geometry?.location_type === "ROOFTOP" &&
                        r.types?.includes("street_address")
                );
                if (rooftop) {
                    resolve(rooftop.formatted_address);
                    return;
                }

                // 2️⃣ Next best: street address
                const street = results.find((r) =>
                    r.types?.includes("street_address")
                );
                if (street) {
                    resolve(street.formatted_address);
                    return;
                }

                // 3️⃣ Next: premise / establishment
                const premise = results.find(
                    (r) =>
                        r.types?.includes("premise") ||
                        r.types?.includes("establishment")
                );
                if (premise) {
                    resolve(premise.formatted_address);
                    return;
                }

                // 4️⃣ Fallback: first non-political result
                const nonPolitical = results.find(
                    (r) => !r.types?.includes("political")
                );
                if (nonPolitical) {
                    resolve(nonPolitical.formatted_address);
                    return;
                }

                // 5️⃣ Absolute fallback
                resolve(results[0].formatted_address);
            }
        );
    });
}
