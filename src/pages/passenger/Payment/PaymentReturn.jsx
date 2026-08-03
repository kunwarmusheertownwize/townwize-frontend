import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import api from "../../../services/api";
import BrandSpinner from "../../../components/common/BrandSpinner";
import { isNative } from "../../../utils/platform";

/**
 * Where Safepay sends the passenger after hosted checkout.
 *
 * The redirect itself proves nothing — a user can land here without having
 * paid, and Safepay's `sig` only proves the tracker is genuine. So this screen
 * polls our own backend, which is only updated by the signed webhook. That is
 * the difference between "the browser says it paid" and "we observed payment".
 */

const POLL_MS = 2000;
// 45 seconds was far too short. A real sandbox payment ran 4:20:29 → 4:22:21
// before capture, because 3-D Secure adds a bank round trip, and the webhook
// only fires afterwards. The app gave up while the payment was still in flight
// and told the passenger it could not confirm — for a payment that succeeded.
// Four minutes comfortably covers a 3DS step-up.
const GIVE_UP_MS = 240000;

// Safepay sends no webhook when a passenger simply abandons checkout, so the
// Payment sits at "pending" and polling alone can never tell "still paying"
// apart from "gave up". Closing the tab is the only signal we get — and if it
// arrives before anything settled, nothing was charged. Saying "your bank
// hasn't confirmed" there is alarming and wrong.
const isUnsettled = (s) => !s || s === "created" || s === "pending";

const PaymentReturn = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const rideId = params.get("ride") || localStorage.getItem("pendingPaymentRideId");
    const paymentId = localStorage.getItem("pendingPaymentId");

    const [state, setState] = useState("checking"); // checking | paid | failed | unknown | abandoned
    const startedAt = useRef(Date.now());
    // Set once payment lands, so the "user closed the tab" listener knows the
    // close was ours and not them backing out.
    const settledRef = useRef(false);

    useEffect(() => {
        if (!paymentId) {
            setState("unknown");
            return;
        }
        let mounted = true;
        let timer;

        const poll = async () => {
            try {
                const res = await api.get(`/payments/${paymentId}`);
                const status = res?.data?.data?.status;

                if (!mounted) return;

                if (status === "captured") {
                    settledRef.current = true;
                    localStorage.removeItem("pendingPaymentId");
                    localStorage.removeItem("pendingPaymentRideId");
                    // Close the checkout tab ourselves. The passenger has paid;
                    // making them find the X is a needless final obstacle.
                    if (isNative()) Browser.close().catch(() => {});
                    setState("paid");
                    if (rideId) {
                        localStorage.setItem("activePassengerRideId", rideId);
                        setTimeout(() => navigate(`/passenger/live-tracking/${rideId}`, { replace: true }), 1200);
                    }
                    return;
                }
                if (status === "failed" || status === "cancelled") {
                    settledRef.current = true;
                    if (isNative()) Browser.close().catch(() => {});
                    setState("failed");
                    return;
                }
            } catch {
                // Network blip — keep polling until the deadline.
            }

            if (!mounted) return;
            if (Date.now() - startedAt.current > GIVE_UP_MS) {
                setState("unknown");
                return;
            }
            timer = setTimeout(poll, POLL_MS);
        };

        poll();
        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [paymentId, rideId, navigate]);

    /**
     * The passenger dismissed the checkout tab.
     *
     * Without this they land back on a screen spinning "Confirming your
     * payment…" for 45 seconds after deliberately backing out — the app looking
     * broken at the exact moment they chose to stop. Payment may still be in
     * flight, though, so we keep polling underneath and only show the abandoned
     * state if nothing has settled.
     */
    useEffect(() => {
        if (!isNative()) return;
        let handle;
        Browser.addListener("browserFinished", async () => {
            if (settledRef.current) return;
            // One last check before deciding: they may have paid in the final
            // second and closed the tab before the webhook landed. Only call it
            // abandoned if the server still shows nothing charged.
            try {
                const res = await api.get(`/payments/${paymentId}`);
                if (!isUnsettled(res?.data?.data?.status)) return; // poller will handle it
            } catch { /* unreachable — fall through to abandoned */ }
            setState((s) => (s === "checking" ? "abandoned" : s));
        }).then((h) => { handle = h; });
        return () => { handle?.remove?.(); };
    }, [paymentId]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-6">
            <div className="max-w-sm w-full text-center space-y-4">
                {state === "checking" && (
                    <>
                        <BrandSpinner />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Confirming your payment…
                        </p>
                        <p className="text-xs text-gray-400">
                            Please don't close this page.
                        </p>
                    </>
                )}

                {state === "paid" && (
                    <>
                        <p className="text-4xl">✅</p>
                        <p className="text-lg font-bold text-townwize-primary dark:text-white">
                            Payment confirmed
                        </p>
                        <p className="text-sm text-gray-500">Taking you to your ride…</p>
                    </>
                )}

                {state === "failed" && (
                    <>
                        <p className="text-4xl">⚠️</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                            Payment didn't go through
                        </p>
                        <p className="text-sm text-gray-500">
                            You have not been charged. You can try again, or pay your Wizer in cash.
                        </p>
                        <button
                            onClick={() => navigate(rideId ? `/passenger/live-tracking/${rideId}` : "/passenger/home", { replace: true })}
                            className="w-full py-3 rounded-xl font-semibold text-white bg-townwize-primary"
                        >
                            Continue
                        </button>
                    </>
                )}

                {state === "abandoned" && (
                    <>
                        <p className="text-4xl">🚕</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                            Payment not completed
                        </p>
                        <p className="text-sm text-gray-500">
                            You closed the payment page, so nothing has been charged. Your ride is
                            still booked — you can pay your Wizer in cash at the end of the trip.
                        </p>
                        <button
                            onClick={() => navigate(rideId ? `/passenger/live-tracking/${rideId}` : "/passenger/home", { replace: true })}
                            className="w-full py-3 rounded-xl font-semibold text-white bg-townwize-primary"
                        >
                            Continue to my ride
                        </button>
                    </>
                )}

                {state === "unknown" && (
                    <>
                        <p className="text-4xl">⏳</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                            Taking longer than usual
                        </p>
                        <p className="text-sm text-gray-500">
                            If you completed the payment, it will appear on your receipt shortly and
                            you will not be charged twice. If you didn't, nothing has been taken and
                            you can pay your Wizer in cash. Contact support@townwize.com if anything
                            looks wrong.
                        </p>
                        <button
                            onClick={() => navigate(rideId ? `/passenger/live-tracking/${rideId}` : "/passenger/home", { replace: true })}
                            className="w-full py-3 rounded-xl font-semibold text-white bg-townwize-primary"
                        >
                            Continue
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentReturn;
