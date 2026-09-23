import { useCallback, useEffect, useRef, useState } from "react";
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

    /* A FRESH tracker every attempt. A setup tracker is spent once its 3DS
       handshake has been used, so retrying against the old one fails in a way
       that looks like a card problem and is not.

       This used to retry with window.location.reload() — reloading the entire
       profile page, losing every other tab's state, to have another go at
       typing a card number. */
    const begin = useCallback(() => {
        let alive = true;
        setPhase("loading");
        setError("");
        setCard(null);
        setReady(false);
        setDeviceData(null);
        api
            .post("/payments/cards/setup")
            .then((res) => {
                if (!alive) return;
                setSetup(res?.data?.data || null);
                setPhase("collect");
            })
            .catch((err) => {
                if (!alive) return;
                setError(
                    err?.response?.data?.error?.message ||
                        "We couldn't open the card form. Please try again."
                );
                setPhase("error");
            });
        return () => { alive = false; };
    }, []);

    useEffect(() => begin(), [begin]);

    /* Safepay has tokenised the card. `payment_method` is the only thing that
     * can ever charge it, and only through our merchant account. */
    const onAuthSuccess = async (data) => {
        const token = data?.payment_method;
        if (!token) {
            setError("The card was authenticated but no token came back. Please try again.");
            setPhase("error");
            return;
        }

        /* The first production card saved with NO last four and NO scheme —
         * the row read "Card ···· ····". The SDK types say onValidated hands
         * back { bin, lastFour, cardType }, which is exactly what we read, so
         * either it never fired or it fired empty.
         *
         * A card nobody can identify is not a cosmetic problem: a passenger
         * with two saved cards cannot tell which is which, and a receipt or a
         * chargeback cannot name the one that was charged.
         *
         * So: prefer onValidated, fall back to whatever the authentication
         * payload carries — it is known to include a `paymentMethod` object —
         * and if BOTH come up empty, say so loudly rather than saving a blank
         * card in silence. */
        const fromAuth = data?.paymentMethod || data?.payment_method_details || {};
        const details = {
            lastFour: card?.lastFour || fromAuth?.lastFour || fromAuth?.last_four || "",
            cardType: card?.cardType || fromAuth?.cardType || fromAuth?.card_type || fromAuth?.scheme || "",
            bin: card?.bin || fromAuth?.bin || "",
        };

        if (!details.lastFour) {
            console.warn(
                "[atoms] no lastFour — onValidated payload:", card,
                "· auth payload:", data
            );
        }

        setPhase("saving");
        try {
            const res = await api.post("/payments/cards", {
                token,
                lastFour: details.lastFour,
                cardType: details.cardType,
                bin: details.bin,
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
                        onClick={begin}
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
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Add a card</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Saved for next time, so you can leave as soon as you arrive.
                    </p>
                </div>
                {/* The reassurance belongs NEXT TO the fields, not buried in a
                    paragraph. Someone about to type a card number wants to see
                    it at the moment they hesitate. */}
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 1a4 4 0 00-4 4v2H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 6V5a2 2 0 10-4 0v2h4z" clipRule="evenodd" />
                    </svg>
                    Encrypted
                </span>
            </div>

            {/* Stated plainly because it is the unusual and reassuring part:
                the fields below are not ours. */}
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-snug text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                Your card number goes straight to our payment provider. Townwize never
                sees or stores it — we only keep the last four digits.
            </p>

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
                    /* Logged because the first production card saved with no
                       last four and no scheme. The SDK types promise
                       { bin, lastFour, cardType } here, so this says whether
                       it fires at all — and with what. */
                    onValidated={(d) => {
                        if (!d?.lastFour) console.warn("[atoms] onValidated:", d);
                        setCard({ bin: d?.bin, lastFour: d?.lastFour, cardType: d?.cardType });
                    }}
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

            {/* 3DS can take fifteen seconds or more, and the bank's own screen
                may not appear at all on a frictionless approval. Without this
                the card block simply dimmed and nothing else happened, which
                reads as a hung form — and a passenger who gives up mid-3DS
                leaves a half-finished authentication behind. */}
            {(phase === "authenticating" || phase === "saving") && (
                <div className="flex items-center gap-3 rounded-xl border border-townwize-primary/25 bg-townwize-primary/5 px-3 py-2.5 dark:border-townwize-accent/25 dark:bg-townwize-accent/10">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-townwize-primary border-t-transparent dark:border-townwize-accent dark:border-t-transparent" />
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                            {phase === "saving" ? "Saving your card…" : "Checking with your bank"}
                        </p>
                        {phase === "authenticating" && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                This can take a few seconds. Your bank may ask you to confirm.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* The only part of the card we are ever given, shown back so the
                passenger can see we recognised it before the bank step — and
                so they can tell at a glance that they typed the right one. */}
            {card?.lastFour && (
                <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-mono tracking-widest">•••• {card.lastFour}</span>
                    {card.cardType && <span className="uppercase">{card.cardType}</span>}
                </p>
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
