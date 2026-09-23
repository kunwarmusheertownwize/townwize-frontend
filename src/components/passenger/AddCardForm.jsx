import { useEffect, useRef, useState } from "react";
import { CardCapture, PayerAuthentication, toEnvironment } from "@sfpy/atoms";
// `@sfpy/atoms/styles`, NOT the dist path — the package's exports map only
// publishes that one subpath, and the deep path fails the build outright.
import "@sfpy/atoms/styles";
import api from "../../services/api";

/**
 * Add a card, using Safepay's Atoms components.
 *
 * ⚠️ THE CARD NUMBER NEVER TOUCHES THIS APP. `CardCapture` renders input
 * fields that belong to Safepay; the PAN goes straight to them and we are
 * handed a token. That is the whole reason Townwize needs no PCI
 * certification, and it is why nothing here may ever read, log or forward the
 * value of those fields — not for validation, not for debugging.
 *
 * The sequence, which is why there are two components and not one:
 *   1. POST /payments/cards/setup — a zero-amount `instrument` tracker plus a
 *      short-lived passport token for the browser
 *   2. <CardCapture> collects the card and validates it → onValidated gives
 *      us the bin, last four and scheme, which are all we ever store
 *   3. <PayerAuthentication> runs 3DS with do_card_on_file: true
 *   4. onPayerAuthenticationSuccess returns `payment_method` — the saved token
 *   5. POST /payments/cards records it against the user
 *
 * Zero-amount is Safepay's own recommendation: the card is verified without
 * being charged, so there is nothing to reverse afterwards.
 */
export default function AddCardForm({ onSaved, onCancel }) {
    const [setup, setSetup] = useState(null);
    const [phase, setPhase] = useState("loading"); // loading | collect | authenticating | saving | error
    const [error, setError] = useState("");
    const [card, setCard] = useState(null);
    const [ready, setReady] = useState(false);

    /* Device-data-collection details for 3DS, which arrive from Safepay rather
     * than from us.
     *
     * ✅ SETTLED 22 Sep 2026 against a real production card. It was the one
     * unknown in this flow — `onProceedToAuthentication(data)` is typed `any`,
     * their docs mention `access_token` and `CardinalJwt`, and their React
     * Native SDK wants `deviceDataCollectionJWT`. None of those is what comes
     * out. See takeDeviceData for the shape that actually arrives.
     */
    const [deviceData, setDeviceData] = useState(null);

    const takeDeviceData = (data) => {
        /* CONFIRMED against a real production card, 22 Sep 2026. The payload is
         * flat, and the JWT arrives as `accessToken` — camelCase, and NOT any
         * of the four spellings this used to try:
         *
         *   deviceDataCollectionJWT   device_data_collection_jwt
         *   CardinalJwt               access_token   ← snake_case, so close
         *
         * All four missed, `jwt` came back null, and every card add died on
         * "We couldn't start card verification" with the capture and 3DS
         * handshake having worked perfectly. The backend logged a clean 200.
         *
         * `deviceDataCollectionURL` was right first time and is unchanged —
         * it arrives pointing at Cardinal Commerce.
         *
         * The fallbacks stay for the URL only, where nothing is confirmed
         * beyond the one spelling seen. For the JWT they are gone: keeping
         * guesses next to a known answer invites someone to believe the
         * guesses were verified too. */
        const jwt = data?.accessToken || null;
        const url =
            data?.deviceDataCollectionURL ||
            data?.device_data_collection_url ||
            null;

        if (!jwt) {
            // Logged only on failure now. It fired on every add before, which
            // put a raw 3DS token in the console of every passenger's browser.
            console.error("[atoms] no accessToken in onProceedToAuthentication", data);
            fail(
                "We couldn't start card verification. Please try again, or use cash for this trip."
            );
            return;
        }
        setDeviceData({ jwt, url });
        setPhase("authenticating");
    };

    const cardRef = useRef(null);
    const authRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        api
            .post("/payments/cards/setup")
            .then((res) => {
                if (!mounted) return;
                setSetup(res?.data?.data || null);
                setPhase("collect");
            })
            .catch((err) => {
                if (!mounted) return;
                setError(
                    err?.response?.data?.error?.message ||
                        "We couldn't open the card form. Please try again."
                );
                setPhase("error");
            });
        return () => { mounted = false; };
    }, []);

    /* Safepay has tokenised the card. `payment_method` is the only thing that
     * can ever charge it, and only through our merchant account. */
    const onAuthSuccess = async (data) => {
        const token = data?.payment_method;
        if (!token) {
            setError("The card was authenticated but no token came back. Please try again.");
            setPhase("error");
            return;
        }
        setPhase("saving");
        try {
            const res = await api.post("/payments/cards", {
                token,
                lastFour: card?.lastFour,
                cardType: card?.cardType,
                bin: card?.bin,
            });
            onSaved?.(res?.data?.data);
        } catch (err) {
            setError(
                err?.response?.data?.error?.message ||
                    "Your card was verified but we couldn't save it. Please try again."
            );
            setPhase("error");
        }
    };

    const fail = (msg) => {
        setError(msg || "We couldn't verify that card. Please check the details and try again.");
        setPhase("error");
    };

    if (phase === "loading") {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-townwize-primary border-t-transparent" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Opening the secure card form…</p>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="rounded-2xl border border-red-200 dark:border-red-900 p-5 space-y-3">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    Couldn&rsquo;t add your card
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-xl bg-townwize-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                        Try again
                    </button>
                    {onCancel && (
                        <button onClick={onCancel} className="rounded-xl px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Add a card</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your card details go straight to our payment provider. Townwize
                    never sees or stores your card number.
                </p>
            </div>

            {/* Kept mounted through every phase. Unmounting it to show a spinner
                would destroy Safepay's iframe mid-authentication and strand the
                3DS challenge with nowhere to return to. */}
            <div className={phase === "collect" ? "" : "pointer-events-none opacity-60"}>
                <CardCapture
                    environment={toEnvironment(setup.environment)}
                    authToken={setup.authToken}
                    tracker={setup.tracker}
                    validationEvent="submit"
                    imperativeRef={cardRef}
                    onReady={() => setReady(true)}
                    onValidated={(d) => setCard({ bin: d?.bin, lastFour: d?.lastFour, cardType: d?.cardType })}
                    onProceedToAuthentication={takeDeviceData}
                    onError={(e) => fail(typeof e === "string" ? e : "")}
                    inputStyle={{
                        fontSize: "15px",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: "1px solid #d1d5db",
                    }}
                />
            </div>

            {phase === "authenticating" && deviceData?.jwt && (
                <PayerAuthentication
                    environment={toEnvironment(setup.environment)}
                    tracker={setup.tracker}
                    authToken={setup.authToken}
                    deviceDataCollectionJWT={deviceData.jwt}
                    deviceDataCollectionURL={deviceData.url}
                    user={setup.customer}
                    imperativeRef={authRef}
                    /* do_capture FALSE and do_card_on_file TRUE: verify and
                       save, take nothing. Reversed, this would charge for a
                       card the passenger was only adding. */
                    authorizationOptions={{ do_capture: false, do_card_on_file: true }}
                    onPayerAuthenticationSuccess={onAuthSuccess}
                    onPayerAuthenticationFrictionless={onAuthSuccess}
                    onPayerAuthenticationFailure={(d) => fail(d?.error || d?.errorMessage)}
                    onPayerAuthenticationUnavailable={(d) => fail(d?.errorMessage)}
                    onSafepayError={(d) => fail(d?.error?.message)}
                />
            )}

            {phase === "saving" && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Saving your card…</p>
            )}

            <div className="flex gap-2">
                <button
                    onClick={() => cardRef.current?.submit?.()}
                    disabled={!ready || phase !== "collect"}
                    className="flex-1 rounded-xl bg-townwize-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {phase === "collect" ? "Save card" : "Verifying…"}
                </button>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        disabled={phase === "authenticating" || phase === "saving"}
                        className="rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 disabled:opacity-40"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
