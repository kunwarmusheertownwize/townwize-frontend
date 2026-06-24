import { useEffect, useState, useCallback } from "react";
import { authFetch } from "../../../utils/authFetch";
import StatusBadge from "../../components/common/StatusBadge";
import { suspendPassenger, unsuspendPassenger, banPassenger } from "../../../api/adminApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const Row = ({ label, value, highlight }) => (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <span className="text-xs text-gray-500 shrink-0 w-36">{label}</span>
        <span className={`text-xs font-medium text-right ${highlight ? "text-townwize-primary dark:text-white font-semibold" : "text-gray-800 dark:text-gray-200"}`}>
            {value ?? "—"}
        </span>
    </div>
);

const TierBadge = ({ tier }) => {
    const isGuest = tier === "GuestTowner";
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isGuest
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        }`}>
            {tier || "Towner"}
        </span>
    );
};

const ACTION_LABELS = {
    suspend:   { title: "Suspend Passenger", cta: "Suspend",   color: "bg-orange-600 hover:bg-orange-700", needsReason: true },
    unsuspend: { title: "Reinstate Passenger", cta: "Reinstate", color: "bg-green-600 hover:bg-green-700",  needsReason: false },
    ban:       { title: "Ban Passenger",     cta: "Ban",      color: "bg-red-600 hover:bg-red-700",    needsReason: true },
};

export default function PassengerDetailPanel({ passengerId, onUpdated }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("overview");

    const [modal, setModal] = useState(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState("");

    const load = useCallback(() => {
        if (!passengerId) return;
        setLoading(true);
        setError("");
        authFetch(`${API_BASE}/admin/referral/passengers/${passengerId}`)
            .then((r) => r.json())
            .then((json) => {
                if (json?.success) setData(json.data);
                else setError(json?.error?.message || "Failed to load passenger");
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [passengerId]);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const closeModal = () => { setModal(null); setReason(""); };

    const handleAction = async () => {
        if (!modal) return;
        const cfg = ACTION_LABELS[modal];
        if (cfg.needsReason && !reason.trim()) return;
        setBusy(true);
        try {
            if (modal === "suspend")   await suspendPassenger(passengerId, reason.trim());
            if (modal === "unsuspend") await unsuspendPassenger(passengerId);
            if (modal === "ban")       await banPassenger(passengerId, reason.trim());
            showToast(`${cfg.cta} action completed`);
            closeModal();
            load();
            onUpdated?.();
        } catch (e) {
            showToast(e.message || "Action failed");
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <p className="text-sm text-gray-400 p-4">Loading passenger details…</p>;
    if (error)   return <p className="text-sm text-red-500 p-4">{error}</p>;
    if (!data)   return null;

    const { profile, coupons = [] } = data;
    const isGuest = profile?.accountTier === "GuestTowner";
    const userStatus = profile?.userId?.status || "pending";

    const tabs = [
        { key: "overview",  label: "Overview" },
        { key: "referral",  label: "Referral & Tier" },
        { key: "coupons",   label: `Coupons (${coupons.length})` },
    ];

    return (
        <div className="text-sm space-y-4">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-townwize-primary text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg">
                    {toast}
                </div>
            )}

            {/* Confirmation modal */}
            {modal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                            {ACTION_LABELS[modal].title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            {modal === "unsuspend"
                                ? `This will reinstate ${profile?.name || "this passenger"} and restore their access.`
                                : `This action will affect ${profile?.name || "this passenger"}'s account access.`}
                        </p>
                        {ACTION_LABELS[modal].needsReason && (
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Reason (required)"
                                rows={3}
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
                            />
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={busy || (ACTION_LABELS[modal].needsReason && !reason.trim())}
                                className={`flex-1 py-2 rounded-xl text-white text-sm font-bold transition disabled:opacity-50 ${ACTION_LABELS[modal].color}`}
                            >
                                {busy ? "…" : ACTION_LABELS[modal].cta}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2 text-xs font-medium transition border-b-2 -mb-px ${
                            tab === t.key
                                ? "border-townwize-primary text-townwize-primary"
                                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "overview" && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <TierBadge tier={profile?.accountTier} />
                        <StatusBadge status={userStatus} />
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-0.5">
                        <Row label="Name"   value={profile?.name} />
                        <Row label="Email"  value={profile?.userId?.email} />
                        <Row label="Phone"  value={profile?.phone} />
                        <Row label="Status" value={userStatus} />
                        <Row label="BTK Resident" value={profile?.isBTKResident ? "Yes" : "No"} />
                        <Row label="BTK Address" value={profile?.btkAddress || "—"} />
                        <Row label="Joined" value={profile?.userId?.createdAt ? new Date(profile.userId.createdAt).toLocaleDateString() : "—"} />
                    </div>

                    {/* Suspension/ban note */}
                    {(userStatus === "suspended" || userStatus === "banned") && profile?.userId?.suspensionNote && (
                        <div className={`rounded-xl border p-3 text-xs ${userStatus === "banned" ? "border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" : "border-orange-200 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"}`}>
                            <p className="font-semibold mb-1">{userStatus === "banned" ? "Ban reason" : "Suspension reason"}</p>
                            <p>{profile.userId.suspensionNote}</p>
                        </div>
                    )}

                    {isGuest && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-0.5">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">GuestTowner Details</p>
                            <Row label="Sponsor Towner" value={profile?.sponsorTownerId?.email || "—"} highlight />
                            <Row label="Invite Code Used" value={profile?.referredByCodeId?.code || "—"} />
                            <Row label="Routes Allowed" value="Karachi ↔ BTK only" />
                        </div>
                    )}

                    {/* Moderation actions */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Account Actions</p>
                        <div className="flex flex-wrap gap-2">
                            {userStatus === "suspended" && (
                                <button
                                    onClick={() => setModal("unsuspend")}
                                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition"
                                >
                                    Reinstate
                                </button>
                            )}
                            {(userStatus === "active" || userStatus === "pending") && (
                                <button
                                    onClick={() => setModal("suspend")}
                                    className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition"
                                >
                                    Suspend
                                </button>
                            )}
                            {userStatus !== "banned" && (
                                <button
                                    onClick={() => setModal("ban")}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
                                >
                                    Ban
                                </button>
                            )}
                            {userStatus === "banned" && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">Account is permanently banned.</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {tab === "referral" && (
                <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-0.5">
                        <Row label="Account Tier"    value={profile?.accountTier || "Towner"} highlight />
                        <Row label="Referred by code" value={profile?.referredByCodeId?.code || "None"} />
                        <Row label="Code type"       value={profile?.referredByCodeId?.type || "—"} />
                        <Row label="Sponsor"         value={profile?.sponsorTownerId?.email || "—"} />
                    </div>

                    {isGuest && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-1">
                            <p className="font-semibold text-amber-900 dark:text-amber-200 text-xs">GuestTowner Account</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                This passenger was invited by a Towner and is classified as a GuestTowner.
                                Their KYC responsibility lies with the sponsoring Towner.
                                Route access is limited to Karachi ↔ BTK.
                            </p>
                            <div className="mt-2 space-y-0.5">
                                <Row label="Sponsoring Towner" value={profile?.sponsorTownerId?.email || "—"} highlight />
                                <Row label="Invite Code"       value={profile?.referredByCodeId?.code  || "—"} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === "coupons" && (
                <div className="space-y-2">
                    {coupons.length === 0 ? (
                        <p className="text-xs text-gray-400">No coupons issued to this passenger.</p>
                    ) : (
                        coupons.map((c) => (
                            <div key={c._id} className={`rounded-xl border p-3 space-y-0.5 ${c.isUsed ? "border-gray-200 bg-gray-50 dark:bg-gray-800 opacity-60" : "border-green-200 bg-green-50 dark:bg-green-900/20"}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">{c.discountPct}% off fare (max {c.maxDiscountPkr} PKR)</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.isUsed ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400" : "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"}`}>
                                        {c.isUsed ? "Used" : "Active"}
                                    </span>
                                </div>
                                <Row label="Origin"  value={c.origin === "referee_welcome" ? "Welcome reward" : "Referral reward"} />
                                <Row label="Expires" value={new Date(c.expiresAt).toLocaleDateString()} />
                                {c.isUsed && <Row label="Used on" value={c.usedAt ? new Date(c.usedAt).toLocaleDateString() : "—"} />}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
