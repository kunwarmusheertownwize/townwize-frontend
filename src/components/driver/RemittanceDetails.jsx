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
        <div className="flex items-start justify-between gap-3 py-1.5">
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

export default function RemittanceDetails({ compact = false }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className={`rounded-xl border border-gray-200 dark:border-gray-700 ${compact ? "px-4 py-3" : "p-4"}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Send your payment to
            </p>

            {/* Wallets first — most Wizers will use one of these rather than
                making a bank transfer. */}
            {hasWallet && (
                <div className="mt-2 space-y-0.5">
                    <Row label="EasyPaisa" value={data.easypaisaNumber} copyable />
                    <Row label="Account name" value={data.easypaisaTitle} />
                    <Row label="JazzCash" value={data.jazzcashNumber} copyable />
                    <Row label="Account name" value={data.jazzcashTitle} />
                </div>
            )}

            {data.iban && (
                <div className={`space-y-0.5 ${hasWallet ? "mt-3 border-t border-gray-100 dark:border-gray-700 pt-2" : "mt-2"}`}>
                    <Row label="Bank" value={data.bankName} />
                    <Row label="Account title" value={data.accountTitle} />
                    <Row label="IBAN" value={data.iban} copyable />
                </div>
            )}

            {/* The reference the driver types into the BANK's narration field —
                not the one they read back off the receipt afterwards. It is what
                lets a credit landing in Townwize's account be matched to them
                without anybody asking. Given its own block, and stated as an
                instruction, because a row among the account details reads as
                one more thing to look at rather than something to do. */}
            {data.paymentReference && (
                <div className="mt-3 rounded-lg border border-townwize-primary/25 bg-townwize-primary/5 dark:border-townwize-accent/25 dark:bg-townwize-accent/10 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            Your payment reference
                        </span>
                        <CopyValue value={data.paymentReference} className="text-sm tracking-wide" />
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                        Put this in the reference or remarks box when you send the
                        money, so we know the payment is yours.
                    </p>
                </div>
            )}

            {data.instructions && (
                <p className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-2 text-xs text-gray-500 dark:text-gray-400">
                    {data.instructions}
                </p>
            )}

            <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                Keep your transaction receipt — you will need its reference number on
                the next step.
            </p>
        </div>
    );
}
