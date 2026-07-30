import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import {
  assignRideDriver,
  fetchRideAvailableDrivers,
  openRideDispute,
  resolveRideDispute,
  updateRideStatus,
} from "../../../api/adminApi";

import TrailMap from "./TrailMap";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Small labelled row used by the distance-provenance card.
function Line({ k, v, strong, warn }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{k}</span>
      <span
        className={
          (strong ? "font-bold " : "font-medium ") +
          (warn ? "text-amber-600" : "text-gray-900 dark:text-white")
        }
      >
        {v}
      </span>
    </div>
  );
}

function RouteMapCard({ pickup, dropoff }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${dropoff.lat},${dropoff.lng}&travelmode=driving`;
  const staticSrc = MAPS_KEY
    ? `https://maps.googleapis.com/maps/api/staticmap?size=480x180&maptype=roadmap&markers=color:green%7Clabel:A%7C${pickup.lat},${pickup.lng}&markers=color:red%7Clabel:B%7C${dropoff.lat},${dropoff.lng}&path=color:0x023645cc%7Cweight:3%7C${pickup.lat},${pickup.lng}%7C${dropoff.lat},${dropoff.lng}&key=${MAPS_KEY}`
    : null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">Route Map</h4>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-townwize-accent underline underline-offset-2"
        >
          Open in Google Maps ↗
        </a>
      </div>
      {staticSrc ? (
        <img
          src={staticSrc}
          alt="Route map"
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: 180 }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 px-4 py-5 text-center text-xs text-gray-400">
          <div className="mb-1 text-lg">🗺️</div>
          <div>Pickup: {pickup.lat?.toFixed(5)}, {pickup.lng?.toFixed(5)}</div>
          <div>Dropoff: {dropoff.lat?.toFixed(5)}, {dropoff.lng?.toFixed(5)}</div>
          <div className="mt-2 text-[10px] text-gray-300">Set VITE_GOOGLE_MAPS_API_KEY to show map thumbnail</div>
        </div>
      )}
    </div>
  );
}

const NEXT_BY_STATUS = {
  REQUESTED: ["DRIVER_ASSIGNED", "CANCELLED"],
  DRIVER_ASSIGNED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["ON_TRIP", "CANCELLED"],
  ON_TRIP: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export default function RideDetailPanel({ ride, onUpdated }) {
  const [selected, setSelected] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [completionDistance, setCompletionDistance] = useState("");
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [assigningDriverId, setAssigningDriverId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Dispute modal state
  const [disputeModal, setDisputeModal] = useState(null); // null | 'open' | 'resolve'
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeResolution, setDisputeResolution] = useState("");
  const [disputeFareAdj, setDisputeFareAdj] = useState("");
  const [disputeSaving, setDisputeSaving] = useState(false);
  const [disputeError, setDisputeError] = useState("");

  const options = useMemo(() => NEXT_BY_STATUS[ride?.status] || [], [ride?.status]);

  useEffect(() => {
    setSelected("");
    setCancelReason("");
    setCompletionDistance("");
    setError("");
    setOk("");
  }, [ride?._id, ride?.rideId, ride?.status]);

  useEffect(() => {
    const rideId = ride?._id || ride?.rideId;
    if (!rideId || ride?.status !== "REQUESTED") {
      setAvailableDrivers([]);
      return;
    }
    let mounted = true;
    const loadDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const json = await fetchRideAvailableDrivers(rideId);
        if (!mounted) return;
        setAvailableDrivers(json?.data?.items || []);
      } catch {
        if (!mounted) return;
        setAvailableDrivers([]);
      } finally {
        if (mounted) setLoadingDrivers(false);
      }
    };
    loadDrivers();
    const timer = setInterval(loadDrivers, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [ride?._id, ride?.rideId, ride?.status]);

  const onSubmit = async () => {
    if (!selected) return;
    if (selected === "CANCELLED" && !cancelReason.trim()) {
      setError("A cancellation reason is required.");
      return;
    }
    if (selected === "COMPLETED") {
      const dist = Number(completionDistance);
      if (completionDistance !== "" && (!Number.isFinite(dist) || dist < 0)) {
        setError("Actual distance must be a positive number.");
        return;
      }
    }
    setSaving(true);
    setError("");
    setOk("");
    try {
      const extras = {};
      if (selected === "COMPLETED" && completionDistance !== "") {
        extras.actualDistanceKm = Number(completionDistance);
      }
      await updateRideStatus(ride._id || ride.rideId, selected, cancelReason.trim() || undefined, extras);
      setOk("Ride status updated.");
      setSelected("");
      setCancelReason("");
      setCompletionDistance("");
      onUpdated?.();
    } catch (e) {
      setError(e.message || "Failed to update ride status");
    } finally {
      setSaving(false);
    }
  };

  const onAssignDriver = async (driverId) => {
    const rideId = ride?._id || ride?.rideId;
    if (!rideId || !driverId) return;
    setAssigningDriverId(driverId);
    setError("");
    setOk("");
    try {
      await assignRideDriver(rideId, driverId);
      setOk("Driver assigned.");
      onUpdated?.();
    } catch (e) {
      setError(e.message || "Failed to assign driver");
    } finally {
      setAssigningDriverId("");
    }
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  const onOpenDisputeSubmit = async () => {
    if (!disputeReason.trim()) { setDisputeError("Reason is required."); return; }
    setDisputeSaving(true);
    setDisputeError("");
    try {
      const adj = disputeFareAdj !== "" && !isNaN(Number(disputeFareAdj)) ? Number(disputeFareAdj) : undefined;
      await openRideDispute(ride._id || ride.rideId, { reason: disputeReason.trim(), ...(adj !== undefined ? { fareAdjustment: adj } : {}) });
      setDisputeModal(null);
      setDisputeReason("");
      setDisputeFareAdj("");
      onUpdated?.();
    } catch (e) {
      setDisputeError(e.message || "Failed to open dispute");
    } finally {
      setDisputeSaving(false);
    }
  };

  const onResolveDisputeSubmit = async () => {
    if (!disputeResolution.trim()) { setDisputeError("Resolution is required."); return; }
    setDisputeSaving(true);
    setDisputeError("");
    try {
      const adj = disputeFareAdj !== "" && !isNaN(Number(disputeFareAdj)) ? Number(disputeFareAdj) : undefined;
      await resolveRideDispute(ride._id || ride.rideId, { resolution: disputeResolution.trim(), ...(adj !== undefined ? { fareAdjustment: adj } : {}) });
      setDisputeModal(null);
      setDisputeResolution("");
      setDisputeFareAdj("");
      onUpdated?.();
    } catch (e) {
      setDisputeError(e.message || "Failed to resolve dispute");
    } finally {
      setDisputeSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div> : null}
      {ok ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-700">{ok}</div> : null}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <strong>{ride.rideId || ride._id}</strong>
          <StatusBadge status={ride.status || "-"} />
        </div>
        <div className="mt-2 text-gray-600 dark:text-gray-400">{ride.createdAt ? new Date(ride.createdAt).toLocaleString() : "-"}</div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <h4 className="mb-2 font-semibold">Participants</h4>
        <div>Passenger: {ride.passengerEmail || "-"}</div>
        <div>Driver: {ride.driverEmail || "Unassigned"}</div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <h4 className="mb-2 font-semibold">Route & Metrics</h4>
        <div>{ride.route || "-"}</div>
        <div className="mt-2">ETA: {ride.etaMinutes ?? "-"}m</div>
        <div>Distance: {ride.distanceKm ?? "-"} km</div>
        <div>Fare Estimate: {Number(ride.fareEstimate || 0).toLocaleString()} PKR</div>
        {ride.finalFare != null ? (
          <div>Final Fare: {Number(ride.finalFare || 0).toLocaleString()} PKR</div>
        ) : null}
        {ride.fareAdjustment?.adjustment != null ? (
          <div>
            Fare Difference: {Number(ride.fareAdjustment.adjustment || 0).toLocaleString()} PKR
          </div>
        ) : null}
        {ride.completionReason ? <div>Trip Result: {String(ride.completionReason).replace(/_/g, " ")}</div> : null}
        {ride.adminCancelReason ? (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-xs">
            <span className="font-semibold">Admin cancel reason:</span> {ride.adminCancelReason}
            {ride.adminCancelledByEmail ? ` — by ${ride.adminCancelledByEmail}` : ""}
          </div>
        ) : null}
        <div>Type: {ride.rideType || "-"}</div>
        <div>Car Class: {ride.carType || "economy"}</div>
      </div>

      {ride.trail?.length ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold">Recorded Route (GPS)</h4>
            {(ride.pickup?.lat && ride.dropoff?.lat) && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${ride.pickup.lat},${ride.pickup.lng}&destination=${ride.dropoff.lat},${ride.dropoff.lng}&travelmode=driving`}
                target="_blank" rel="noreferrer"
                className="text-xs font-semibold text-townwize-accent underline underline-offset-2"
              >
                Planned route ↗
              </a>
            )}
          </div>
          <TrailMap
            trail={ride.trail}
            gaps={ride.trailGaps || []}
            pickup={ride.pickup}
            dropoff={ride.dropoff}
          />
        </div>
      ) : (ride.pickup?.lat && ride.dropoff?.lat) ? (
        <RouteMapCard pickup={ride.pickup} dropoff={ride.dropoff} />
      ) : null}

      {ride.distanceSource ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <h4 className="mb-2 font-semibold">How the billed distance was derived</h4>
          <div className="space-y-1 text-xs">
            <Line k="Billed distance"          v={`${ride.actualDistanceKm ?? "-"} km`} strong />
            <Line k="Measured on roads"        v={`${ride.distanceSource.observedKm ?? "-"} km`} />
            <Line
              k="Recovered across GPS gaps"
              v={`${ride.distanceSource.gapKm ?? 0} km over ${ride.distanceSource.gapsFilled ?? 0} gap(s)`}
              warn={Number(ride.distanceSource.gapKm || 0) > 5}
            />
            <Line k="Longest single gap"       v={`${ride.distanceSource.longestGapKm ?? 0} km`} />
            <Line k="Time stopped (no distance)" v={`${ride.distanceSource.stationaryMinutes ?? 0} min`} />
            <Line k="GPS points recorded"      v={`${ride.distanceSource.pointsUsed ?? 0}`} />
            <Line k="Method"                   v={ride.distanceSource.method || "-"} />
            <div className="mt-1 border-t border-dotted border-gray-200 pt-1 dark:border-gray-700" />
            <Line
              k="Booking quote (not billed)"
              v={`${ride.distanceSource.routeEstimateKm ?? "-"} km${
                ride.distanceSource.vsEstimatePct != null
                  ? `  (${ride.distanceSource.vsEstimatePct > 0 ? "+" : ""}${ride.distanceSource.vsEstimatePct}%)`
                  : ""
              }`}
            />
            <Line k="Driver device said (cross-check)" v={`${ride.distanceSource.clientReportedKm ?? "-"} km`} />

            {ride.distanceSource.needsReview && (
              <p className="pt-1 text-[11px] font-semibold text-amber-600">
                ⚠ Settled distance diverges more than 40% from the booking quote.
                The fare was NOT adjusted — check the route on the map. A Wizer
                may legitimately have taken a longer or shorter way.
              </p>
            )}
            {Number(ride.distanceSource.gapKm || 0) > 5 && (
              <p className="pt-1 text-[11px] text-amber-600">
                Over 5 km of this fare came from distance inferred across GPS
                gaps rather than observed. Check the dashed sections on the map.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {(ride.finalFareBreakdown || ride.estimatedFareBreakdown) ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <h4 className="mb-2 font-semibold">Internal Fare Split</h4>
          <div>
            Townwize Commission:{" "}
            {Number(
              (ride.finalFareBreakdown || ride.estimatedFareBreakdown)?.townwizeCommission || 0
            ).toLocaleString()}{" "}
            PKR
          </div>
          <div>
            Platform Fee:{" "}
            {Number(
              (ride.finalFareBreakdown || ride.estimatedFareBreakdown)?.platformFee || 0
            ).toLocaleString()}{" "}
            PKR
          </div>
          <div>
            Townwize Revenue:{" "}
            {Number(
              (ride.finalFareBreakdown || ride.estimatedFareBreakdown)?.townwizeEarning || 0
            ).toLocaleString()}{" "}
            PKR
          </div>
          <div>
            Driver Earning:{" "}
            {Number(
              (ride.finalFareBreakdown || ride.estimatedFareBreakdown)?.driverEarning || 0
            ).toLocaleString()}{" "}
            PKR
          </div>
        </div>
      ) : null}

      {ride.status === "REQUESTED" ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="font-semibold">Nearest Eligible Drivers</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {loadingDrivers ? "Refreshing..." : `${availableDrivers.length} available`}
            </span>
          </div>
          {availableDrivers.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No matching online drivers found right now.
            </p>
          ) : (
            <div className="space-y-2">
              {availableDrivers.slice(0, 8).map((driver) => (
                <div
                  key={driver.driverId}
                  className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium break-words">
                        {driver.email || driver.phone || driver.driverId}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {driver.carType} | {driver.vehicle?.make || "-"}{" "}
                        {driver.vehicle?.model || ""} | {driver.vehicle?.number || "-"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {driver.pickupDistanceKm == null
                          ? "Distance unknown"
                          : `${driver.pickupDistanceKm} km from pickup`}{" "}
                        | location {driver.locationAgeSec}s ago
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-md bg-townwize-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={Boolean(assigningDriverId)}
                      onClick={() => onAssignDriver(driver.driverId)}
                    >
                      {assigningDriverId === driver.driverId ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <h4 className="mb-2 font-semibold">Admin Action</h4>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Only valid next transitions are shown based on current ride status.
        </p>
        <select
          className="w-full rounded-md border px-3 py-2"
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setCancelReason(""); }}
          disabled={saving || options.length === 0}
        >
          <option value="">{options.length ? "Select next status" : "No valid transitions"}</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {selected === "CANCELLED" && (
          <div className="mt-2">
            <label className="block text-xs font-semibold text-red-700 mb-1">
              Cancellation reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm placeholder-red-300 focus:border-red-400 focus:outline-none resize-none dark:bg-gray-800 dark:text-white dark:border-gray-600"
              placeholder="Explain why this ride is being cancelled (required)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              disabled={saving}
            />
          </div>
        )}
        {selected === "COMPLETED" && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">Fare will be calculated from this distance</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mb-3">
              Enter the actual distance the driver covered. If left blank, the booking estimate ({ride?.distanceKm ?? "?"} km) is used.
              Ask the driver or check with the passenger before confirming — early/late dropoffs will be wrong if you use the estimate.
            </p>
            <label className="block text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">
              Actual distance (km)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className="w-full rounded-md border border-amber-300 bg-white dark:bg-gray-800 dark:text-white dark:border-amber-700 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              placeholder={`e.g. ${ride?.distanceKm ?? "16.7"} (booking estimate)`}
              value={completionDistance}
              onChange={(e) => setCompletionDistance(e.target.value)}
              disabled={saving}
            />
          </div>
        )}
        <button
          className={`mt-2 rounded-md px-3 py-2 text-white disabled:opacity-50 ${selected === "CANCELLED" ? "bg-red-600 hover:bg-red-700" : "bg-townwize-primary"}`}
          onClick={onSubmit}
          disabled={saving || !selected}
        >
          {saving ? "Updating..." : selected === "CANCELLED" ? "Force Cancel Ride" : "Update Status"}
        </button>
      </div>

      {/* ── Dispute Section ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <h4 className="mb-2 font-semibold dark:text-white">Dispute</h4>

        {(!ride.disputeStatus || ride.disputeStatus === "NONE") && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">No dispute has been raised for this ride.</p>
            <button
              onClick={() => { setDisputeModal("open"); setDisputeReason(""); setDisputeFareAdj(""); setDisputeError(""); }}
              className="rounded-md bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Open Dispute
            </button>
          </div>
        )}

        {ride.disputeStatus === "OPEN" && (
          <div className="space-y-2">
            <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">Dispute Open</span>
              </div>
              <p className="text-sm text-red-800 dark:text-red-300">{ride.disputeReason}</p>
              <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                Opened by {ride.disputeOpenedBy || "-"} on {fmtDate(ride.disputeOpenedAt)}
              </div>
              {ride.disputeFareAdjustment != null && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Fare adjustment: {Number(ride.disputeFareAdjustment).toLocaleString()} PKR
                </div>
              )}
            </div>
            <button
              onClick={() => { setDisputeModal("resolve"); setDisputeResolution(""); setDisputeFareAdj(""); setDisputeError(""); }}
              className="rounded-md bg-green-600 hover:bg-green-700 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Resolve Dispute
            </button>
          </div>
        )}

        {ride.disputeStatus === "RESOLVED" && (
          <div className="rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Resolved</span>
            </div>
            <p className="text-sm text-green-800 dark:text-green-300">{ride.disputeResolution}</p>
            <div className="text-xs text-green-600 dark:text-green-400">
              Resolved by {ride.resolvedBy || "-"} on {fmtDate(ride.resolvedAt)}
            </div>
            {ride.disputeFareAdjustment != null && (
              <div className="text-xs text-green-600 dark:text-green-400">
                Fare adjustment: {Number(ride.disputeFareAdjustment).toLocaleString()} PKR
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dispute Modal ─────────────────────────────────────────────── */}
      {disputeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 space-y-3 shadow-xl">
            <h3 className="font-semibold dark:text-white">
              {disputeModal === "open" ? "Open Dispute" : "Resolve Dispute"}
            </h3>
            {disputeModal === "open" ? (
              <>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Reason <span className="text-red-500">*</span>
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white focus:outline-none resize-none"
                    placeholder="Describe the dispute..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    disabled={disputeSaving}
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Fare adjustment (PKR, negative = refund)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white focus:outline-none"
                    placeholder="e.g. -200"
                    value={disputeFareAdj}
                    onChange={(e) => setDisputeFareAdj(e.target.value)}
                    disabled={disputeSaving}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Resolution <span className="text-red-500">*</span>
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white focus:outline-none resize-none"
                    placeholder="Describe the resolution..."
                    value={disputeResolution}
                    onChange={(e) => setDisputeResolution(e.target.value)}
                    disabled={disputeSaving}
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Fare adjustment (PKR, negative = refund)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white focus:outline-none"
                    placeholder="e.g. -200"
                    value={disputeFareAdj}
                    onChange={(e) => setDisputeFareAdj(e.target.value)}
                    disabled={disputeSaving}
                  />
                </label>
              </>
            )}
            {disputeError && <div className="rounded border border-red-200 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 text-xs text-red-700 dark:text-red-400">{disputeError}</div>}
            <div className="flex gap-2 justify-end">
              <button
                className="rounded-md border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold dark:text-gray-300"
                onClick={() => setDisputeModal(null)}
                disabled={disputeSaving}
              >Cancel</button>
              <button
                className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${disputeModal === "open" ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}`}
                onClick={disputeModal === "open" ? onOpenDisputeSubmit : onResolveDisputeSubmit}
                disabled={disputeSaving}
              >
                {disputeSaving ? "Saving..." : disputeModal === "open" ? "Open Dispute" : "Resolve Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
