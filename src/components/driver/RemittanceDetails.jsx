import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../services/api";

/**
 * WHERE to send the commission you owe — Townwize's own receiving details.
 *
 * ⚠️ The opposite direction of money from the payout account on this same
 * screen. That one is the WIZER's, and is where Townwize pays THEM.
 *
 * This did not exist until 22 Sep 2026. The commission dialog said "Send
 * payment via EasyPaisa / JazzCash, then submit proof here" and never said
 * where — no account number, no wallet number, nothing. A Wizer owing
 * PKR 2,151 had no way to pay it, and no amount of reading the screen helped.
 */
/** The value plus its copy button, without the label/row layout around it. */
const CopyValue = ({ value, className = "" }) => {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(String(value));
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard is blocked in some WebViews. The number is on screen
            // either way, so say nothing rather than raise an error about a
            // convenience.
        }
    };

    return (
        <span className="flex items-center gap-2 min-w-0">
            <span className={`font-semibold text-gray-900 dark:text-gray-100 break-all text-end ${className || "text-sm"}`}>
                {value}
            </span>
            <button
                type="button"
                onClick={copy}
                className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-townwize-primary dark:text-townwize-accent"
            >
                {copied ? "copied" : "copy"}
            </button>
        </span>
    );
};

const Row = ({ label, value, copyable }) => {
    if (!value) return null;

    return (
        <div className="flex items-baseline justify-between gap-3 py-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
            {copyable ? (
                <CopyValue value={value} />
            ) : (
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-all text-end">
                    {value}
                </span>
            )}
        </div>
    );
};

/**
 * Whether the in-app route is offered, from the same call that fetches the
 * account details — so the button and the server cannot disagree about it.
 * The service REFUSES a session when this is off, and a visible button that
 * always errors is worse than no button.
 */
export function useInAppCommissionEnabled() {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        let mounted = true;
        api
            .get("/driver/remittance")
            .then((res) => mounted && setEnabled(Boolean(res?.data?.data?.inAppPaymentEnabled)))
            // Default OFF on failure: showing a pay button we cannot honour
            // strands a driver mid-payment, while the transfer route always works.
            .catch(() => mounted && setEnabled(false));
        return () => { mounted = false; };
    }, []);
    return enabled;
}

export default function RemittanceDetails({ compact = false, collapsible = false }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        api
            .get("/driver/remittance")
            .then((res) => mounted && setData(res?.data?.data || null))
            .catch(() => mounted && setData(null))
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return <div className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />;
    }

    /* Nothing configured. Say so plainly and give them a way forward, rather
     * than rendering empty rows that look like details to pay into. */
    if (!data?.configured) {
        return (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    Payment details not available yet
                </p>
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
                    Please contact support at support@townwize.com and we will tell
                    you where to send it. Your account will not be blocked while
                    you are waiting for us.
                </p>
            </div>
        );
    }

    const hasWallet = data.easypaisaNumber || data.jazzcashNumber;

    const details = (
        <>
            {/* Wallets first — most Wizers will use one of these rather than
                making a bank transfer. */}
            {hasWallet && (
                <div className="space-y-px">
                    <Row label="EasyPaisa" value={data.easypaisaNumber} copyable />
                    <Row label="Account name" value={data.easypaisaTitle} />
                    <Row label="JazzCash" value={data.jazzcashNumber} copyable />
                    <Row label="Account name" value={data.jazzcashTitle} />
                </div>
            )}

            {data.iban && (
                <div className={`space-y-px ${hasWallet ? "mt-2 border-t border-gray-100 dark:border-gray-700/60 pt-2" : ""}`}>
                    <Row label="Bank" value={data.bankName} />
                    <Row label="Account title" value={data.accountTitle} />
                    <Row label="IBAN" value={data.iban} copyable />
                </div>
            )}

            {/* The reference goes in the BANK's narration field — it is not the
                one read back off the receipt afterwards. It is what lets a
                credit landing in Townwize's account be matched to this driver
                without anybody asking, so it is set apart from the account rows
                rather than listed as one more thing to look at. */}
            {data.paymentReference && (
                <div className="mt-2 border-t border-gray-100 dark:border-gray-700/60 pt-2">
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            Reference
                        </span>
                        <CopyValue value={data.paymentReference} className="text-sm tracking-wide" />
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                        Quote this when you send the money so we can match it to you.
                    </p>
                </div>
            )}

            {data.instructions && (
                <p className="mt-2 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                    {data.instructions}
                </p>
            )}
        </>
    );

    /* Collapsed by default where the balance is CLEAR. The details have to be
       findable before a driver is blocked — that was the original bug — but a
       full account listing does not deserve half the screen on a day when
       nothing is owed. Open where the driver is actually paying. */
    if (collapsible) {
        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/30">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start"
                >
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Where to send payment
                    </span>
                    <span
                        className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                        aria-hidden="true"
                    >
                        ▾
                    </span>
                </button>
                {open && (
                    <div className="border-t border-gray-100 dark:border-gray-700/60 px-3 pb-3 pt-2">
                        {details}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`rounded-lg border border-gray-200 dark:border-gray-700 ${compact ? "px-3 py-2.5" : "p-3"}`}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Send your payment to
            </p>
            {details}

            {/* Only here. This form has a Transaction Reference field below it,
                so there genuinely is a next step; on the earnings card there is
                not, and the line dangled with nothing to refer to. */}
            <p className="mt-2 border-t border-gray-100 dark:border-gray-700/60 pt-2 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                Keep your receipt — the next step asks for its reference number.
            </p>
        </div>
    );
}
