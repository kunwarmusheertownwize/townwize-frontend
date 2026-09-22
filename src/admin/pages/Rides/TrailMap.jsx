import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../../../utils/googleMapsLoader";

/**
 * Draws the ride's recorded GPS trail — the actual road the vehicle took.
 *
 * The panel previously showed a Static Maps image with a two-point path from
 * pickup to dropoff: a straight line that had nothing to do with the route
 * driven. This renders what was really recorded, and distinguishes:
 *
 *   solid teal   observed movement (GPS was reporting)
 *   dashed red   a gap where GPS stopped reporting — endpoints known, path not
 *   grey dot     the vehicle was stationary for a while (traffic, refuelling)
 *
 * That distinction is the whole point: a dashed leg is the only place distance
 * is inferred rather than measured, so it is where any fare dispute lives.
 */
export default function TrailMap({ trail = [], gaps = [], pickup, dropoff }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const [err, setErr] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!divRef.current || !trail.length) return;
      try {
        await loadGoogleMaps();
        if (cancelled) return;

        const { Map } = await window.google.maps.importLibrary("maps");
        const g = window.google.maps;

        const map = new Map(divRef.current, {
          mapTypeId: "roadmap",
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        mapRef.current = map;

        const bounds = new g.LatLngBounds();
        const gapKeys = new Set(
          gaps.map((x) => `${x.from.lat},${x.from.lng}->${x.to.lat},${x.to.lng}`)
        );

        // Walk the trail, splitting it into observed runs broken by gaps, so a
        // gap is never drawn as though we watched the vehicle cross it.
        let run = [];
        const flushRun = () => {
          if (run.length > 1) {
            new g.Polyline({
              map,
              path: run,
              strokeColor: "#17BEBB",
              strokeOpacity: 0.95,
              strokeWeight: 4,
            });
          }
          run = [];
        };

        for (let i = 0; i < trail.length; i++) {
          const p = { lat: trail[i].lat, lng: trail[i].lng };
          bounds.extend(p);
          run.push(p);
          if (i === 0) continue;
          const key = `${trail[i - 1].lat},${trail[i - 1].lng}->${trail[i].lat},${trail[i].lng}`;
          if (gapKeys.has(key)) {
            run.pop();          // the gap leg is not observed movement
            flushRun();
            run.push(p);        // the far side starts the next observed run
          }
        }
        flushRun();

        // Gaps, drawn dashed so they read as inferred rather than measured.
        const dash = {
          path: "M 0,-1 0,1",
          strokeOpacity: 1,
          strokeWeight: 3,
          scale: 3,
        };
        gaps.forEach((gp, idx) => {
          if (gp.stationary) {
            // The vehicle did not move, so there is no line to draw. A dot with
            // the duration says "stopped here" honestly; a dashed line between
            // two points a few metres apart just looks like a rendering fault.
            new g.Marker({
              map,
              position: gp.from,
              title: `Stopped ${Math.round(gp.seconds)}s (moved ${gp.metres} m)`,
              icon: {
                path: g.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#9AA5A3",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              },
              zIndex: 50,
            });
            return;
          }

          // GPS gap. Draw the ROAD route recorded at settlement — the same path
          // the fare was calculated from. Falling back to a straight line when
          // routing was unavailable is why these used to cut across the map.
          let path = [gp.from, gp.to];
          if (gp.polyline && g.geometry?.encoding) {
            try {
              const decoded = g.geometry.encoding.decodePath(gp.polyline);
              if (decoded.length > 1) path = decoded;
            } catch { /* keep the straight fallback */ }
          }

          new g.Polyline({
            map,
            path,
            strokeOpacity: 0,
            icons: [{
              icon: { ...dash, strokeColor: "#D92D20" },
              offset: "0",
              repeat: "12px",
            }],
          });
          new g.Marker({
            map,
            position: gp.from,
            title:
              `GPS gap ${idx + 1}: ${gp.metres} m apart over ${gp.seconds}s` +
              (gp.polyline ? " — drawn along the road route" : " — straight line, routing unavailable"),
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: "#D92D20",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            zIndex: 50,
          });
        });

        const endpoint = (pos, label, color) => {
          if (!pos?.lat) return;
          bounds.extend(pos);
          new g.Marker({
            map, position: pos, label: { text: label, color: "#fff", fontSize: "11px" },
            icon: {
              path: g.SymbolPath.CIRCLE, scale: 10,
              fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2,
            },
            zIndex: 100,
          });
        };
        endpoint(pickup, "A", "#15803D");
        endpoint(dropoff, "B", "#B4241A");

        map.fitBounds(bounds, 32);
        setReady(true);
      } catch (e) {
        console.error("TrailMap failed:", e);
        if (!cancelled) setErr(e?.message || "Map failed to load");
      }
    })();

    return () => { cancelled = true; };
  }, [trail, gaps, pickup, dropoff]);

  if (!trail.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-6 text-center text-xs text-gray-400">
        <div className="mb-1 text-lg">🛰️</div>
        No GPS trail recorded for this ride.
        <div className="mt-1 text-[10px]">
          Trips completed before trail recording was added will not have one.
        </div>
      </div>
    );
  }

  const movingGaps = gaps.filter((g) => !g.stationary).length;
  const stoppedGaps = gaps.length - movingGaps;

  return (
    <div className="space-y-2">
      <div ref={divRef} className="h-72 w-full rounded-xl border border-gray-200 dark:border-gray-700" />
      {err && <p className="text-xs text-red-600">{err}</p>}
      {ready && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          <span><span className="me-1 inline-block h-[3px] w-4 align-middle bg-[#17BEBB]" />Recorded route ({trail.length} points)</span>
          {movingGaps > 0 && (
            <span><span className="me-1 inline-block h-[3px] w-4 align-middle bg-[#D92D20]" />GPS gap, road route ({movingGaps})</span>
          )}
          {stoppedGaps > 0 && (
            <span><span className="me-1 inline-block h-2 w-2 rounded-full align-middle bg-[#9AA5A3]" />Stopped ({stoppedGaps})</span>
          )}
        </div>
      )}
    </div>
  );
}
