import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * The page Safepay's checkout returns to. PUBLIC and unguarded, deliberately.
 *
 * On Android the checkout runs in a Chrome Custom Tab, which does NOT share
 * cookies or storage with the app's WebView. So this page is always reached
 * logged-out. It used to point at a guarded route, which bounced the tab to the
 * login screen — a passenger who had just paid was asked to sign in again, on
 * what looked like a different website.
 *
 * It is deliberately inert: no API calls, no app chrome, no navigation. The app
 * itself is polling underneath and is the only thing that decides whether a
 * payment succeeded. This page exists so the tab has somewhere harmless to land.
 */
const PaymentComplete = () => {
    const [params] = useSearchParams();
    const cancelled = params.get("state") === "cancelled";

    useEffect(() => {
        // Works when the tab was opened by script (desktop web). A Custom Tab
        // ignores it, which is fine — the app closes that one itself.
        const t = setTimeout(() => {
            try { window.close(); } catch { /* not permitted here */ }
        }, 1500);
        return () => clearTimeout(t);
    }, []);

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
                            ? "You have not been charged. Close this window to return to Townwize — your ride is still booked."
                            : "Thank you. You can close this window and return to Townwize."}
                    </p>
                </div>
            </div>
        </>
    );
};

export default PaymentComplete;
