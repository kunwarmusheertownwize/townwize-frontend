import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../services/api";
import AddCardForm from "./AddCardForm";

/**
 * The passenger's saved cards.
 *
 * Only ever shows the last four digits and the scheme. The token that can
 * actually charge a card is never sent to the browser — the API deliberately
 * omits it — so nothing rendered here is usable by anyone who obtains it.
 */
const BRAND = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    unionpay: "UnionPay",
    paypak: "PayPak",
};

export default function SavedCards() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [busyId, setBusyId] = useState("");
    const [available, setAvailable] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [methods, list] = await Promise.all([
                api.get("/payments/methods"),
                api.get("/payments/cards"),
            ]);
            const card = (methods?.data?.data?.methods || []).find((m) => m.id === "card");
            setAvailable(Boolean(card?.available));
            setCards(list?.data?.data?.cards || []);
        } catch {
            // Never promise a payment method we cannot confirm is live.
            setAvailable(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const makeDefault = async (id) => {
        setBusyId(id);
        try {
            await api.patch(`/payments/cards/${id}/default`);
            await load();
        } catch (err) {
            toast.error(err?.response?.data?.error?.message || "Could not update your default card.");
        } finally {
            setBusyId("");
        }
    };

    const remove = async (id) => {
        setBusyId(id);
        try {
            await api.delete(`/payments/cards/${id}`);
            await load();
            toast.success("Card removed.");
        } catch (err) {
            toast.error(err?.response?.data?.error?.message || "Could not remove that card.");
        } finally {
            setBusyId("");
        }
    };

    // Card payments switched off entirely — say nothing rather than offer a
    // feature that cannot work.
    if (!loading && !available) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Saved cards</h3>
                {!adding && available && (
                    <button
                        onClick={() => setAdding(true)}
                        className="text-xs font-semibold text-townwize-primary dark:text-townwize-accent underline underline-offset-2"
                    >
                        Add a card
                    </button>
                )}
            </div>

            {loading ? (
                <div className="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ) : (
                <>
                    {cards.length === 0 && !adding && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            No cards saved. Add one and your fare can be settled the
                            moment a trip ends.
                        </p>
                    )}

                    {cards.map((c) => (
                        <div
                            key={c._id}
                            className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3"
                        >
                            <span className="text-lg" aria-hidden="true">💳</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {BRAND[c.cardType] || "Card"} ···· {c.lastFour || "••••"}
                                </p>
                                {c.isDefault && (
                                    <p className="text-[11px] font-medium text-green-700 dark:text-green-400">
                                        Default — used when your trip ends
                                    </p>
                                )}
                            </div>
                            <div className="flex shrink-0 gap-2">
                                {!c.isDefault && (
                                    <button
                                        onClick={() => makeDefault(c._id)}
                                        disabled={busyId === c._id}
                                        className="text-xs font-medium text-townwize-primary dark:text-townwize-accent disabled:opacity-40"
                                    >
                                        Make default
                                    </button>
                                )}
                                <button
                                    onClick={() => remove(c._id)}
                                    disabled={busyId === c._id}
                                    className="text-xs font-medium text-red-600 dark:text-red-400 disabled:opacity-40"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}

                    {adding && (
                        <AddCardForm
                            onCancel={() => setAdding(false)}
                            onSaved={async () => {
                                setAdding(false);
                                await load();
                                toast.success("Card saved.");
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
}
