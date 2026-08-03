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

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            background: "#03311C", color: "#ffffff", padding: "24px", textAlign: "center",
        }}>
            <div style={{ maxWidth: 360 }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>{cancelled ? "↩️" : "✅"}</div>
                <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>
                    {cancelled ? "Payment cancelled" : "Payment received"}
                </h1>
                <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, margin: 0 }}>
                    {cancelled
                        ? "You have not been charged. Close this window to return to Townwize — your ride is still booked."
                        : "Thank you. Close this window to return to Townwize."}
                </p>
            </div>
        </div>
    );
};

export default PaymentComplete;
