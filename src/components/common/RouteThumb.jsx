/**
 * The route actually driven, as a map image.
 *
 * Used on the passenger receipt and the Wizer trip summary. Renders one clean
 * line — no gap or stop markers. Those live in the admin panel: showing
 * "GPS lost here" to a customer invites a dispute about distance rather than
 * settling one, and neither Uber nor Careem expose it.
 *
 * `polyline` is the encoded trail from the API (ride.routePolyline). When a ride
 * has no trail — anything completed before trail recording existed — it falls
 * back to a straight pickup→dropoff line, which is honest: we are not claiming
 * that was the route.
 */
const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export default function RouteThumb({
  polyline,
  pickup,
  dropoff,
  height = 160,
  className = "",
}) {
  const hasEnds = pickup?.lat && dropoff?.lat;
  if (!KEY || (!polyline && !hasEnds)) return null;

  const path = polyline
    ? `path=color:0x17BEBBff|weight:4|enc:${encodeURIComponent(polyline)}`
    : `path=color:0x17BEBBff|weight:4|${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}`;

  const markers = [
    pickup?.lat  ? `markers=color:0x15803D|size:small|${pickup.lat},${pickup.lng}`   : "",
    dropoff?.lat ? `markers=color:0xB4241A|size:small|${dropoff.lat},${dropoff.lng}` : "",
  ].filter(Boolean).join("&");

  const src =
    `https://maps.googleapis.com/maps/api/staticmap?size=640x${height * 2}` +
    `&scale=2&maptype=roadmap&${path}${markers ? "&" + markers : ""}&key=${KEY}`;

  const expandUrl = hasEnds
    ? `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}` +
      `&destination=${dropoff.lat},${dropoff.lng}&travelmode=driving`
    : null;

  const img = (
    <img
      src={src}
      alt="Route travelled"
      loading="lazy"
      style={{ height }}
      className="w-full rounded-xl object-cover"
      // A broken map must not leave an empty framed box on the receipt.
      onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
    />
  );

  return (
    <div className={className}>
      {expandUrl ? (
        <a href={expandUrl} target="_blank" rel="noreferrer" aria-label="Open route in Google Maps">
          {img}
        </a>
      ) : img}
    </div>
  );
}
