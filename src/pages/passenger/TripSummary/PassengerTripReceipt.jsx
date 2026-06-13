import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authFetch } from "../../../utils/authFetch";

const toMoney = (n) => `${Number(n || 0).toLocaleString()} PKR`;
const toDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");
const toLocationText = (value) => {
  if (!value) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.address) return value.address;
    if (value.label) return value.label;
    const lat = Number(value.lat);
    const lng = Number(value.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }
  return String(value);
};

const completionLabel = (reason) => {
  const labels = {
    normal_dropoff: "Completed at destination",
    early_end: "Ended early",
    passenger_request: "Ended on passenger request",
    admin_closed: "Closed by support",
  };
  if (!reason) return labels.normal_dropoff;
  return labels[reason] || String(reason).replace(/_/g, " ");
};

export default function PassengerTripReceipt() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/rides/${rideId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || json?.message || "Failed to load receipt");
        if (mounted) setRide(json?.data || json);
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load receipt");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (rideId) run();
    return () => {
      mounted = false;
    };
  }, [rideId]);

  useEffect(() => {
    document.body.classList.add("trip-receipt-print-mode");
    return () => {
      document.body.classList.remove("trip-receipt-print-mode");
    };
  }, []);

  const fare = useMemo(() => {
    const f = ride?.finalFareBreakdown || ride?.fareBreakdown || ride?.estimatedFareBreakdown || {};
    const estimated = ride?.fareEstimate || ride?.fare || 0;
    const final = ride?.finalFare ?? ride?.fare ?? estimated;
    const adjustment = ride?.fareAdjustment?.adjustment ?? Number(final || 0) - Number(estimated || 0);

    return {
      estimated,
      final,
      adjustment,
      baseFare: f.baseFare || 0,
      distanceFare: f.distanceFare || 0,
      timeFare: f.timeFare || 0,
      waitFare: f.waitFare || 0,
      platformFee: f.platformFee || 0,
      taxAmount: f.taxAmount || 0,
      distanceKm: f.distanceKm ?? ride?.actualDistanceKm ?? ride?.distanceKm ?? null,
      durationMinutes: f.durationMinutes ?? ride?.actualDurationMinutes ?? null,
      pickupWaitMinutes: f.pickupWaitMinutes ?? ride?.pickupWaitMinutes ?? 0,
      stopWaitMinutes: f.stopWaitMinutes ?? ride?.stopWaitMinutes ?? 0,
    };
  }, [ride]);

  const receiptDate = ride?.completedAt || ride?.updatedAt || ride?.createdAt;
  const rideLabel = `${ride?.rideType || "PRIVATE"}${ride?.carType ? ` - ${String(ride.carType).toUpperCase()}` : ""}`;
  const hasAdjustment = Math.abs(Number(fare.adjustment || 0)) >= 1;
  const waitMinutes = Number(fare.pickupWaitMinutes || 0) + Number(fare.stopWaitMinutes || 0);
  const actualTripLabel =
    fare.distanceKm !== null || fare.durationMinutes !== null
      ? [
          fare.distanceKm !== null ? `${Number(fare.distanceKm || 0).toLocaleString()} km` : null,
          fare.durationMinutes !== null ? `${Number(fare.durationMinutes || 0).toLocaleString()} min` : null,
        ]
          .filter(Boolean)
          .join(", ")
      : "-";
  const adjustmentMessage = hasAdjustment
    ? fare.adjustment > 0
      ? `Final fare increased by ${toMoney(fare.adjustment)} after the trip was completed.`
      : `Final fare decreased by ${toMoney(Math.abs(fare.adjustment))} after the trip was completed.`
    : "Final fare matched the estimate shown at booking.";

  return (
    <div className="trip-receipt-page max-w-5xl mx-auto mt-6 bg-white dark:bg-townwize-primaryDark p-6 md:p-8 rounded-2xl shadow-lg space-y-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-townwize-primary leading-none">Trip Receipt</h2>
          <p className="text-sm text-gray-500 mt-2">{toDateTime(receiptDate)}</p>
          <p className="text-xs text-gray-500 mt-1">Receipt ID: {ride?._id || rideId}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <span className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700">
            {rideLabel}
          </span>
          <button
            type="button"
            className="rounded-lg border border-townwize-primary px-3 py-1.5 text-xs font-semibold text-townwize-primary"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading receipt...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="trip-receipt-shell grid gap-4 md:grid-cols-[1fr_280px]">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Pickup</p>
                <p className="font-semibold">{toLocationText(ride?.pickup)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Dropoff</p>
                <p className="font-semibold">{toLocationText(ride?.dropoff)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <p className="font-semibold">{ride?.status || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Trip Result</p>
                  <p className="font-semibold">{completionLabel(ride?.completionReason)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Actual Trip</p>
                  <p className="font-semibold">{actualTripLabel}</p>
                </div>
              </div>
            </div>

            <div className="trip-receipt-highlight rounded-xl bg-townwize-primary text-white p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">Final Fare</p>
                <p className="mt-2 text-4xl font-extrabold">{toMoney(fare.final)}</p>
              </div>
              <p className="mt-4 text-sm text-white/80">{adjustmentMessage}</p>
            </div>
          </div>

          <div className="trip-receipt-summary bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h3 className="text-xl font-bold text-townwize-primary mb-3">Fare Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Base Fare</span><span>{toMoney(fare.baseFare)}</span></div>
              <div className="flex justify-between"><span>Distance Fare</span><span>{toMoney(fare.distanceFare)}</span></div>
              <div className="flex justify-between"><span>Time Fare</span><span>{toMoney(fare.timeFare)}</span></div>
              {Number(fare.waitFare || 0) > 0 ? (
                <div className="flex justify-between"><span>Wait Fare</span><span>{toMoney(fare.waitFare)}</span></div>
              ) : null}
              <div className="flex justify-between"><span>Platform Fee</span><span>{toMoney(fare.platformFee)}</span></div>
              {Number(fare.taxAmount || 0) > 0 ? (
                <div className="flex justify-between"><span>Sindh Sales Tax (SST)</span><span>{toMoney(fare.taxAmount)}</span></div>
              ) : null}
              {waitMinutes > 0 ? (
                <div className="flex justify-between text-gray-500">
                  <span>Waiting Time</span>
                  <span>{waitMinutes} min</span>
                </div>
              ) : null}
              <div className="border-t border-gray-300 my-2" />
              <div className="flex justify-between"><span>Estimated at booking</span><span>{toMoney(fare.estimated)}</span></div>
              {hasAdjustment ? (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Trip adjustment</span>
                  <span>{toMoney(fare.adjustment)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold text-xl"><span>Total paid</span><span>{toMoney(fare.final)}</span></div>
            </div>
          </div>
        </>
      ) : null}

      <div className="flex justify-end print:hidden">
        <button
          className="rounded-lg bg-townwize-primary px-5 py-2.5 text-white font-semibold"
          onClick={() => navigate("/passenger/home", { replace: true })}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
