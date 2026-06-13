import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import {
  assignRideDriver,
  fetchRideAvailableDrivers,
  updateRideStatus,
} from "../../../api/adminApi";

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
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [assigningDriverId, setAssigningDriverId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const options = useMemo(() => NEXT_BY_STATUS[ride?.status] || [], [ride?.status]);

  useEffect(() => {
    setSelected("");
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
    setSaving(true);
    setError("");
    setOk("");
    try {
      await updateRideStatus(ride._id || ride.rideId, selected);
      setOk("Ride status updated.");
      setSelected("");
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

  return (
    <div className="space-y-4 text-sm">
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div> : null}
      {ok ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-700">{ok}</div> : null}

      <div className="rounded-xl border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <strong>{ride.rideId || ride._id}</strong>
          <StatusBadge status={ride.status || "-"} />
        </div>
        <div className="mt-2 text-gray-600">{ride.createdAt ? new Date(ride.createdAt).toLocaleString() : "-"}</div>
      </div>

      <div className="rounded-xl border border-gray-200 p-3">
        <h4 className="mb-2 font-semibold">Participants</h4>
        <div>Passenger: {ride.passengerEmail || "-"}</div>
        <div>Driver: {ride.driverEmail || "Unassigned"}</div>
      </div>

      <div className="rounded-xl border border-gray-200 p-3">
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
        <div>Type: {ride.rideType || "-"}</div>
        <div>Car Class: {ride.carType || "economy"}</div>
      </div>

      {(ride.finalFareBreakdown || ride.estimatedFareBreakdown) ? (
        <div className="rounded-xl border border-gray-200 p-3">
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
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="font-semibold">Nearest Eligible Drivers</h4>
            <span className="text-xs text-gray-500">
              {loadingDrivers ? "Refreshing..." : `${availableDrivers.length} available`}
            </span>
          </div>
          {availableDrivers.length === 0 ? (
            <p className="text-xs text-gray-500">
              No matching online drivers found right now.
            </p>
          ) : (
            <div className="space-y-2">
              {availableDrivers.slice(0, 8).map((driver) => (
                <div
                  key={driver.driverId}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium break-words">
                        {driver.email || driver.phone || driver.driverId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {driver.carType} | {driver.vehicle?.make || "-"}{" "}
                        {driver.vehicle?.model || ""} | {driver.vehicle?.number || "-"}
                      </div>
                      <div className="text-xs text-gray-500">
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

      <div className="rounded-xl border border-gray-200 p-3">
        <h4 className="mb-2 font-semibold">Admin Action</h4>
        <p className="mb-2 text-xs text-gray-500">
          Only valid next transitions are shown based on current ride status.
        </p>
        <select
          className="w-full rounded-md border px-3 py-2"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={saving || options.length === 0}
        >
          <option value="">{options.length ? "Select next status" : "No valid transitions"}</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          className="mt-2 rounded-md bg-townwize-primary px-3 py-2 text-white disabled:opacity-50"
          onClick={onSubmit}
          disabled={saving || !selected}
        >
          {saving ? "Updating..." : "Update Status"}
        </button>
      </div>
    </div>
  );
}
