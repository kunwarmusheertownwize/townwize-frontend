import { useEffect, useMemo, useRef, useState } from "react";
import { FaStar } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { authFetch } from "../../../utils/authFetch";
import { isNative } from "../../../utils/platform";

const buildShareText = (ride, fare) => {
  const toMoney = (n) => `${Number(n || 0).toLocaleString()} PKR`;
  const pickup = ride?.pickup?.address || ride?.pickup?.label || "—";
  const dropoff = ride?.dropoff?.address || ride?.dropoff?.label || "—";
  return [
    "🚕 Townwize Trip Receipt",
    `From: ${pickup}`,
    `To: ${dropoff}`,
    `Total: ${toMoney(fare.final)}`,
    `ID: ${ride?._id || ""}`,
  ].join("\n");
};

const captureReceiptAsBlob = async () => {
  const el = document.querySelector(".trip-receipt-page");
  if (!el) return null;
  // html-to-image: uses browser's SVG renderer — natively supports oklch,
  // modern CSS, and Tailwind v4 colors. html2canvas hard-crashes on oklch.
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(el, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    cacheBust: true,
    filter: (node) => {
      // Drop external stylesheet links — not needed since styles are inlined
      // by html-to-image via getComputedStyle().
      if (node.tagName === "LINK") return false;
      return true;
    },
  });
  const res = await fetch(dataUrl);
  return res.blob();
};

const ShareButton = ({ ride, className = "" }) => {
  const [sharing, setSharing] = useState(false);
  const [done, setDone]       = useState("");

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    setDone("");
    try {
      const blob = await captureReceiptAsBlob();
      if (!blob) { setSharing(false); return; }
      const file = new File([blob], `townwize-receipt-${ride?._id || "receipt"}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        // Mobile — native OS share sheet (WhatsApp, Telegram, etc.)
        await navigator.share({ title: "Townwize Trip Receipt", files: [file] });
      } else {
        // Desktop — download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        setDone("Downloaded!");
        setTimeout(() => setDone(""), 2500);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("[ShareReceipt]", err);
        setDone(err?.message ? `Failed: ${err.message.slice(0, 40)}` : "Failed — try again");
      }
      setTimeout(() => setDone(""), 4000);
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      className={`rounded-lg border border-townwize-primary px-3 py-1.5 text-xs font-semibold text-townwize-primary disabled:opacity-60 ${className}`}
    >
      {sharing ? "Preparing…" : done || "Share Receipt"}
    </button>
  );
};

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
    normal_dropoff: "Trip completed",
    early_end: "Ended early",
    passenger_request: "Ended on passenger request",
    admin_closed: "Closed by support",
  };
  if (!reason) return labels.normal_dropoff;
  return labels[reason] || String(reason).replace(/_/g, " ");
};

function RatingModal({ rideId, onDone }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await authFetch(`${import.meta.env.VITE_API_BASE_URL}/rides/${rideId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: selected, comment }),
      });
    } catch {
      // non-blocking — close regardless
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(onDone, 1200);
    }
  };

  const starLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const display = hovered || selected;

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-6 sm:pb-0">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-8 text-center space-y-3 shadow-2xl">
          <div className="text-5xl">⭐</div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">Thanks for your feedback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-townwize-primary px-6 pt-6 pb-8 text-white text-center">
          <p className="text-xs uppercase tracking-widest text-white/60 mb-1">How was your ride?</p>
          <h3 className="text-xl font-bold">Rate your Wizer</h3>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Stars */}
          <div className="flex justify-center gap-3" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHovered(n)}
                onClick={() => setSelected(n)}
                className="focus:outline-none transition-transform active:scale-90"
              >
                <FaStar
                  className={`text-4xl ${
                    n <= display
                      ? "text-yellow-400"
                      : "text-gray-200 dark:text-gray-700"
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm font-semibold text-townwize-primary dark:text-townwize-accent h-5">
            {starLabels[display] || ""}
          </p>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 300))}
            placeholder="Add a comment (optional)"
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 resize-none outline-none focus:border-townwize-primary"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className={`w-full py-3.5 rounded-xl font-semibold text-white transition-colors ${
              selected && !submitting
                ? "bg-townwize-primary active:bg-townwize-primaryDark"
                : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
            }`}
          >
            {submitting ? "Submitting…" : "Submit Rating"}
          </button>

          <button
            type="button"
            onClick={onDone}
            className="w-full py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PassengerTripReceipt() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRating, setShowRating] = useState(false);
  const ratingShownRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/rides/${rideId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || json?.message || "Failed to load receipt");
        const rideData = json?.data || json;
        if (mounted) {
          setRide(rideData);
          if (
            !ratingShownRef.current &&
            rideData?.status === "COMPLETED" &&
            !rideData?.passengerRating?.stars
          ) {
            ratingShownRef.current = true;
            setShowRating(true);
          }
        }
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
    const couponDiscount = ride?.couponDiscount || 0;

    return {
      estimated,
      final,
      adjustment,
      couponDiscount,
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
  const isPooled = ride?.rideType === "RIDETOGETHER";
  const coRiderCount = ride?.sharedPassengers?.length ?? 0;
  const farePerSeat = ride?.farePerSeat ?? null;
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

  // ─── Mobile (Capacitor) — simplified stacked receipt ─────────────────────
  if (isNative()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {showRating && <RatingModal rideId={rideId} onDone={() => setShowRating(false)} />}
        {/* Header banner with fare */}
        <div className="bg-townwize-primary px-5 pt-6 pb-8 text-white">
          <h2 className="text-2xl font-extrabold">Trip Receipt</h2>
          <p className="text-xs text-white/60 mt-1">{toDateTime(receiptDate)}</p>
          <p className="text-xs text-white/40 mt-0.5">ID: {ride?._id || rideId}</p>
          {!loading && !error && (
            <div className="mt-5">
              <p className="text-xs text-white/70 uppercase tracking-wider">{isPooled ? "Your Share (Split Fare)" : "Total Paid"}</p>
              <p className="text-5xl font-extrabold mt-1">{toMoney(isPooled && farePerSeat ? farePerSeat : fare.final)}</p>
              {isPooled && coRiderCount > 0 && (
                <p className="text-xs text-yellow-300 font-semibold mt-1">RideTogether · shared with {coRiderCount} co-rider{coRiderCount > 1 ? "s" : ""}</p>
              )}
              <p className="text-xs text-white/60 mt-2 leading-relaxed">{adjustmentMessage}</p>
            </div>
          )}
        </div>

        {loading && <p className="p-5 text-sm text-gray-500">Loading receipt...</p>}
        {error && <p className="p-5 text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="px-4 py-5 space-y-4">
            {/* Route card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 space-y-3 border border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400">Pickup</p>
                <p className="text-sm font-semibold mt-0.5 text-gray-800 dark:text-gray-100">
                  {toLocationText(ride?.pickup)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400">Dropoff</p>
                <p className="text-sm font-semibold mt-0.5 text-gray-800 dark:text-gray-100">
                  {toLocationText(ride?.dropoff)}
                </p>
              </div>
              <div className="flex gap-6 pt-1 flex-wrap">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">Status</p>
                  <p className="text-sm font-semibold mt-0.5">{ride?.status || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">Distance / Time</p>
                  <p className="text-sm font-semibold mt-0.5">{actualTripLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">Ride Type</p>
                  <p className="text-sm font-semibold mt-0.5">{rideLabel}</p>
                </div>
              </div>
            </div>

            {/* Fare breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-townwize-primary dark:text-white mb-3">Fare Summary</h3>
              <div className="space-y-2 text-sm">
                {[
                  ["Base Fare",    fare.baseFare],
                  ["Distance Fare", fare.distanceFare],
                  ["Time Fare",    fare.timeFare],
                  ...(Number(fare.waitFare || 0) > 0   ? [["Wait Fare",   fare.waitFare]]   : []),
                  ["Platform Fee", fare.platformFee],
                  ...(Number(fare.taxAmount || 0) > 0  ? [["SST",         fare.taxAmount]]  : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span>{toMoney(value)}</span>
                  </div>
                ))}
                {Number(fare.couponDiscount || 0) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                    <span>Referral Coupon Applied</span>
                    <span>- {toMoney(fare.couponDiscount)}</span>
                  </div>
                )}
                {isPooled && farePerSeat ? (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-1 space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Full trip fare</span>
                        <span>{toMoney(fare.final)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400 font-medium">
                        <span>Shared between {coRiderCount + 1} riders</span>
                        <span>÷ {coRiderCount + 1}</span>
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span>Your share</span>
                      <span className="text-townwize-primary dark:text-townwize-accent">{toMoney(farePerSeat)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-1 space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Estimated at booking</span>
                        <span>{toMoney(fare.estimated)}</span>
                      </div>
                      {hasAdjustment && (
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Adjustment</span>
                          <span>{toMoney(fare.adjustment)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span>Total paid</span>
                      <span className="text-townwize-primary dark:text-townwize-accent">
                        {toMoney(fare.final)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!loading && !error && (
              <ShareButton ride={ride} className="w-full text-center" />
            )}
            <button
              className="w-full rounded-xl bg-townwize-primary py-4 text-white font-semibold"
              onClick={() => navigate("/passenger/home", { replace: true })}
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    {showRating && <RatingModal rideId={rideId} onDone={() => setShowRating(false)} />}
    <div className="trip-receipt-page max-w-5xl mx-auto mt-6 bg-white dark:bg-townwize-primaryDark p-6 md:p-8 rounded-2xl shadow-lg space-y-6 border border-gray-100 dark:border-gray-700">

      {/* Print-only branding header */}
      <div className="hidden print:flex items-center justify-between pb-4 border-b border-gray-300 mb-2">
        <div className="flex items-center gap-3">
          <img src="/images/logo-dark.png" alt="Townwize" className="h-9 w-auto" />
          <p className="text-xs text-gray-500">www.townwize.com · support@townwize.com</p>
        </div>
        <p className="text-xs text-gray-400">Official Trip Receipt</p>
      </div>

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
          {!loading && !error && <ShareButton ride={ride} />}
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
                <p className="text-xs uppercase tracking-wide text-white/70">
                  {isPooled ? "Your Share (Split Fare)" : "Final Fare"}
                </p>
                <p className="mt-2 text-4xl font-extrabold">
                  {toMoney(isPooled && farePerSeat ? farePerSeat : fare.final)}
                </p>
                {isPooled && coRiderCount > 0 && (
                  <p className="mt-1 text-xs text-yellow-300 font-semibold">
                    RideTogether · shared with {coRiderCount} co-rider{coRiderCount > 1 ? "s" : ""}
                  </p>
                )}
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
              {Number(fare.couponDiscount || 0) > 0 ? (
                <div className="flex justify-between font-medium text-green-600">
                  <span>Referral Coupon Applied</span><span>- {toMoney(fare.couponDiscount)}</span>
                </div>
              ) : null}
              {waitMinutes > 0 ? (
                <div className="flex justify-between text-gray-500">
                  <span>Waiting Time</span>
                  <span>{waitMinutes} min</span>
                </div>
              ) : null}
              <div className="border-t border-gray-300 my-2" />
              {isPooled && farePerSeat ? (
                <>
                  <div className="flex justify-between text-gray-500 text-sm">
                    <span>Full trip fare</span>
                    <span>{toMoney(fare.final)}</span>
                  </div>
                  <div className="flex justify-between text-purple-700 dark:text-purple-400 text-sm font-medium">
                    <span>Shared between {coRiderCount + 1} riders</span>
                    <span>÷ {coRiderCount + 1}</span>
                  </div>
                  <div className="border-t border-gray-300 dark:border-gray-600 my-1" />
                  <div className="flex justify-between font-bold text-xl">
                    <span>Your share</span>
                    <span className="text-townwize-primary dark:text-townwize-accent">{toMoney(farePerSeat)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span>Estimated at booking</span><span>{toMoney(fare.estimated)}</span></div>
                  {hasAdjustment ? (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Trip adjustment</span>
                      <span>{toMoney(fare.adjustment)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold text-xl"><span>Total paid</span><span>{toMoney(fare.final)}</span></div>
                </>
              )}
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
    </>
  );
}
