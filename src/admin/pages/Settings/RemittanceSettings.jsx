import { useEffect, useState } from "react";
import { authFetch } from "../../../utils/authFetch";

/**
 * Townwize's OWN receiving details — where Wizers send the commission they owe.
 *
 * ⚠️ NOT a driver's payout account. Those live on each DriverProfile and are
 * the opposite direction of money:
 *
 *   driver's bank details   Townwize → Wizer   we pay THEM
 *   this screen             Wizer → Townwize   they pay US
 *
 * They were conflated before 22 Sep 2026, when the only bank field in the
 * system was the driver's. Putting Townwize's account there would have made
 * the next payout batch pay Townwize itself, and it still would not have told
 * drivers where to send commission — the dialog that asks them to pay never
 * displayed an account at all.
 */
const FIELDS = [
    { key: "easypaisaNumber", label: "EasyPaisa number", placeholder: "03XX-XXXXXXX" },
    { key: "easypaisaTitle", label: "EasyPaisa account name", placeholder: "TOWNWIZE (PRIVATE) LIMITED" },
    { key: "jazzcashNumber", label: "JazzCash number", placeholder: "03XX-XXXXXXX" },
    { key: "jazzcashTitle", label: "JazzCash account name", placeholder: "TOWNWIZE (PRIVATE) LIMITED" },
    { key: "bankName", label: "Bank name", placeholder: "Standard Chartered Bank" },
    { key: "accountTitle", label: "Account title", placeholder: "TOWNWIZE (PRIVATE) LIMITED" },
    { key: "iban", label: "IBAN", placeholder: "PK00SCBL0000000000000000" },
];

const EMPTY = Object.fromEntries(FIELDS.map((f) => [f.key, ""]));

export default function RemittanceSettings() {
    const [form, setForm] = useState({ ...EMPTY, instructions: "" });
    const [configured, setConfigured] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/remittance`);
            const json = await res.json();
            const d = json?.data || {};
            setForm({
                ...EMPTY,
                instructions: "",
                ...Object.fromEntries(
                    [...FIELDS.map((f) => f.key), "instructions"].map((k) => [k, d[k] || ""])
                ),
            });
            setConfigured(Boolean(d.configured));
        } catch (e) {
            setError(e?.message || "Could not load the current details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const save = async () => {
        setSaving(true);
        setMessage("");
        setError("");
        try {
            const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/remittance`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || json?.message || "Save failed");
            setConfigured(Boolean(json?.data?.configured));
            setMessage("Saved. Wizers will see these details the next time they open Earnings.");
        } catch (e) {
            setError(e?.message || "Could not save.");
        } finally {
            setSaving(false);
        }
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    if (loading) {
        return <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />;
    }

    return (
        <div className="space-y-5 max-w-2xl">
            <div>
                <h1 className="text-xl font-bold text-townwize-primary dark:text-white">
                    Commission Payment Details
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Where Wizers send the commission they owe on cash trips. These
                    details are shown to every driver on the Earnings screen.
                </p>
            </div>

            {/* The state that matters operationally: if nothing usable is set,
                every driver sees "contact support" instead of an account. */}
            {!configured && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        Not configured — drivers have nowhere to pay
                    </p>
                    <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
                        Until at least one of EasyPaisa, JazzCash or IBAN is filled in,
                        the commission screen tells Wizers to contact support instead
                        of showing an account.
                    </p>
                </div>
            )}

            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 px-4 py-3">
                <p className="text-xs text-red-800 dark:text-red-300">
                    <strong>This is Townwize&rsquo;s own account.</strong> It is not a
                    driver&rsquo;s payout account — those are set by each Wizer and
                    are where we pay <em>them</em>. Putting Townwize&rsquo;s details on
                    a driver would make a payout batch pay ourselves.
                </p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                {FIELDS.map(({ key, label, placeholder }) => (
                    <div key={key}>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                            {label}
                        </label>
                        <input
                            value={form[key]}
                            onChange={set(key)}
                            placeholder={placeholder}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
                        />
                    </div>
                ))}

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                        Notes for drivers (optional)
                    </label>
                    <textarea
                        value={form.instructions}
                        onChange={set("instructions")}
                        rows={2}
                        placeholder="e.g. Quote your Wizer ID as the reference."
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-townwize-primary"
                    />
                </div>
            </div>

            {error && (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-300">
                    {error}
                </p>
            )}
            {message && (
                <p className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/25 dark:text-green-300">
                    {message}
                </p>
            )}

            <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-townwize-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
                {saving ? "Saving…" : "Save details"}
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-500">
                Previous details are kept rather than overwritten, so a transfer a
                driver made to the old account last week can still be reconciled.
            </p>
        </div>
    );
}
