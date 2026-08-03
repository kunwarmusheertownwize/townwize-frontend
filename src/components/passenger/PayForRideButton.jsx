import { useState } from "react";
import { Browser } from "@capacitor/browser";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import { isNative } from "../../utils/platform";

/**
 * Collects a card fare at the END of a trip, against the settled amount.
 *
 * Nothing is charged at booking. That earlier design billed an estimate rather
 * than the real fare, and left money captured on every ride that was later
 * cancelled with no way to return it. So the charge happens here, once there is
 * a finished journey and a final fare to charge for.
 */
const PayForRideButton = ({ ride, onPaid }) => {
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    const method = ride?.paymentMethod || "cash";
    const status = ride?.paymentStatus;

    // Cash settles between passenger and Wizer; nothing to collect here.
    if (method === "cash") return null;
    if (status === "captured" || status === "refunded") return null;

    const fare = Number(ride?.finalFare ?? ride?.fareEstimate ?? 0);

    const pay = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const res = await api.post("/payments/session", { rideId: ride._id });
            const { checkoutUrl, paymentId } = res?.data?.data || {};
            if (!checkoutUrl) throw new Error("Could not start the payment");

            localStorage.setItem("pendingPaymentRideId", String(ride._id));
            localStorage.setItem("pendingPaymentId", String(paymentId));

            if (isNative()) {
                // Move to the waiting screen FIRST, then open checkout in a tab
                // over the app — the app stays alive underneath, polls, and
                // closes the tab itself once payment confirms.
                navigate(`/passenger/payment/return?ride=${ride._id}`);
                await Browser.open({ url: checkoutUrl });
                return;
            }
            window.location.href = checkoutUrl;
        } catch (err) {
            toast.error(
                err?.response?.data?.error?.message ||
                    err?.message ||
                    "Could not open the payment page. Please try again."
            );
            setBusy(false);
        }
    };

    return (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
            <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Payment due
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    {status === "failed"
                        ? "That payment didn't go through — you have not been charged. Try again, or pay your Wizer in cash."
                        : "Your trip is complete. Pay the fare below to settle it."}
                </p>
            </div>
            <button
                onClick={pay}
                disabled={busy}
                className={`w-full py-3 rounded-xl font-semibold text-white transition ${
                    busy ? "bg-gray-400 cursor-wait" : "bg-townwize-primary hover:bg-townwize-primaryDark"
                }`}
            >
                {busy ? "Opening payment…" : `Pay ${fare.toLocaleString("en-PK")} PKR`}
            </button>
            {onPaid && (
                <button
                    onClick={onPaid}
                    className="w-full text-xs font-medium text-amber-800 dark:text-amber-300 underline underline-offset-2"
                >
                    I paid my Wizer in cash instead
                </button>
            )}
        </div>
    );
};

export default PayForRideButton;
