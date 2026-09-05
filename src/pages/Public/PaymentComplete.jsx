import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

/**
 * The page Safepay's checkout returns to. PUBLIC and unguarded, deliberately.
 *
 * On Android the checkout runs in a Chrome Custom Tab, which does NOT share
 * cookies or storage with the app's WebView. So this page is always reached
 * logged-out. It used to point at a guarded route, which bounced the tab to the
 * login screen — a passenger who had just paid was asked to sign in again, on
 * what looked like a different website.
 *
 * It makes no API calls. The app is polling underneath and is the only thing
 * that decides whether a payment succeeded.
 *
 * WHAT CHANGED, AND WHY:
 *
 * The page used to be entirely inert — no navigation at all — which is correct
 * for a Custom Tab that the app closes itself. On the web it stranded people.
 * `window.close()` only works on a tab OPENED BY SCRIPT; here the browser
 * navigated the SAME tab to Safepay and back, so the close is silently refused
 * and the passenger is told to close a window that will not close. There was no
 * link anywhere, because there was no app underneath any more — the SPA had
 * been replaced by this page.
 *
 * So: still try to close (Custom Tab behaviour is unchanged), but when that
 * does not happen, show a real way back.
 */
const PaymentComplete = () => {
    const [params] = useSearchParams();
    const path = useParams();

    // PATH FIRST, query second.
    //
    // Safepay appends its own return parameters with "?" without checking
    // whether the URL already has a query string, so a redirect_url of
    // /payment-complete?ride=<id> came back as
    // /payment-complete?ride=<id>?order_id=... — two question marks, and the
    // ride id parsed with their parameters glued to the end of it. The backend
    // now sends the ride as a path segment so our side carries no query at all.
    //
    // The query fallback stays for links already in flight, and strips anything
    // Safepay glued on rather than trusting the raw value.
    const rideId = path.rideId || (params.get("ride") || "").split("?")[0] || null;

    const cancelled =
        path.state === "cancelled" || params.get("state") === "cancelled";

    // Revealed only if we are still on screen after the close attempt, which
    // means closing was refused — i.e. this is a normal browser tab.
    const [stranded, setStranded] = useState(false);

    useEffect(() => {
        const closeAttempt = setTimeout(() => {
            try { window.close(); } catch { /* not permitted here */ }
        }, 1200);
        // If the close worked, nothing below ever renders.
        const reveal = setTimeout(() => setStranded(true), 1800);
        return () => { clearTimeout(closeAttempt); clearTimeout(reveal); };
    }, []);

    const backHref = rideId ? `/passenger/trip-receipt/${rideId}` : "/passenger/trips";

    // Plain white with near-black text, and the colour forced on <html>/<body>.
    // The first version used brand green with 75%-opacity white text, which came
    // out barely readable on a phone — the browser tab applies its own dark
    // treatment, and low-opacity text on a dark brand colour had almost no
    // contrast left. A page whose only job is one sentence has no business
    // being hard to read, so it now states its colours explicitly at full
    // strength rather than inheriting or dimming anything.
    return (
        <>
            <style>{`html,body,#root{background:#ffffff;margin:0;}
                     @media (prefers-color-scheme: dark){html,body,#root{background:#ffffff;}}`}</style>
            <div style={{
                minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                background: "#ffffff", color: "#111111", padding: "28px", textAlign: "center",
            }}>
                <div style={{ maxWidth: 380 }}>
                    <div style={{ fontSize: 52, marginBottom: 18, lineHeight: 1 }}>
                        {cancelled ? "↩️" : "✅"}
                    </div>
                    <h1 style={{ fontSize: 23, fontWeight: 800, margin: "0 0 12px", color: "#03311C" }}>
                        {cancelled ? "Payment cancelled" : "Payment received"}
                    </h1>
                    <p style={{ fontSize: 16, lineHeight: 1.65, color: "#333333", margin: 0 }}>
                        {cancelled
                            // NEVER "your ride is still booked". Card is collected at the
                            // END of a trip, so anyone seeing this has already travelled
                            // and still owes the fare. The old wording implied the
                            // opposite of the truth at the exact moment money was due.
                            ? "You have not been charged, and your fare is still due."
                            : "Thank you. Your fare has been paid."}
                    </p>

                    {stranded && (
                        <div style={{ marginTop: 26 }}>
                            <a
                                href={backHref}
                                style={{
                                    display: "inline-block", padding: "13px 26px", borderRadius: 12,
                                    background: "#03311C", color: "#ffffff", fontSize: 16,
                                    fontWeight: 700, textDecoration: "none",
                                }}
                            >
                                {cancelled ? "Return to your trip" : "Back to Townwize"}
                            </a>
                            {cancelled && (
                                <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666666", margin: "14px 0 0" }}>
                                    You can pay from your trip receipt.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PaymentComplete;
