import { useEffect, useState } from "react";
import { authFetch } from "../../../utils/authFetch";
import StatusBadge from "../../components/common/StatusBadge";

const Row = ({ label, value, highlight }) => (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0">
        <span className="text-xs text-gray-500 shrink-0 w-36">{label}</span>
        <span className={`text-xs font-medium text-right ${highlight ? "text-townwize-primary font-semibold" : "text-gray-800"}`}>
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

export default function PassengerDetailPanel({ passengerId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("overview");

    useEffect(() => {
        if (!passengerId) return;
        let mounted = true;
        setLoading(true);
        setError("");
        authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/referral/passengers/${passengerId}`)
            .then((r) => r.json())
            .then((json) => {
                if (!mounted) return;
                if (json?.success) {
                    setData(json.data);
                } else {
                    setError(json?.error?.message || "Failed to load passenger");
                }
            })
            .catch((e) => { if (mounted) setError(e.message); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [passengerId]);

    if (loading) return <p className="text-sm text-gray-400 p-4">Loading passenger details…</p>;
    if (error)   return <p className="text-sm text-red-500 p-4">{error}</p>;
    if (!data)   return null;

    const { profile, coupons = [] } = data;
    const isGuest = profile?.accountTier === "GuestTowner";

    const tabs = [
        { key: "overview",  label: "Overview" },
        { key: "referral",  label: "Referral & Tier" },
        { key: "coupons",   label: `Coupons (${coupons.length})` },
    ];

    return (
        <div className="text-sm space-y-4">
            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2 text-xs font-medium transition border-b-2 -mb-px ${
                            tab === t.key
                                ? "border-townwize-primary text-townwize-primary"
                                : "border-transparent text-gray-500 hover:text-gray-700"
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
                        <StatusBadge status={profile?.userId?.status || "pending"} />
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-0.5">
                        <Row label="Name"   value={profile?.name} />
                        <Row label="Email"  value={profile?.userId?.email} />
                        <Row label="Phone"  value={profile?.phone} />
                        <Row label="Status" value={profile?.userId?.status} />
                        <Row label="BTK Resident" value={profile?.isBTKResident ? "Yes" : "No"} />
                        <Row label="BTK Address" value={profile?.btkAddress || "—"} />
                        <Row label="Joined" value={profile?.userId?.createdAt ? new Date(profile.userId.createdAt).toLocaleDateString() : "—"} />
                    </div>

                    {isGuest && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-0.5">
                            <p className="text-xs font-semibold text-amber-800 mb-2">GuestTowner Details</p>
                            <Row label="Sponsor Towner" value={profile?.sponsorTownerId?.email || "—"} highlight />
                            <Row label="Invite Code Used" value={profile?.referredByCodeId?.code || "—"} />
                            <Row label="Routes Allowed" value="Karachi ↔ BTK only" />
                        </div>
                    )}
                </div>
            )}

            {tab === "referral" && (
                <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-0.5">
                        <Row label="Account Tier"    value={profile?.accountTier || "Towner"} highlight />
                        <Row label="Referred by code" value={profile?.referredByCodeId?.code || "None"} />
                        <Row label="Code type"       value={profile?.referredByCodeId?.type || "—"} />
                        <Row label="Sponsor"         value={profile?.sponsorTownerId?.email || "—"} />
                    </div>

                    {isGuest && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-1">
                            <p className="font-semibold text-amber-900 text-xs">GuestTowner Account</p>
                            <p className="text-xs text-amber-700 leading-relaxed">
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
                            <div key={c._id} className={`rounded-xl border p-3 space-y-0.5 ${c.isUsed ? "border-gray-200 bg-gray-50 opacity-60" : "border-green-200 bg-green-50"}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-green-700">{c.discountPct}% off fare (max {c.maxDiscountPkr} PKR)</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.isUsed ? "bg-gray-200 text-gray-600" : "bg-green-200 text-green-800"}`}>
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
