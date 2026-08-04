import { useEffect, useState, useCallback } from "react";
import { authFetch } from "../../../utils/authFetch";
import PassengerDetailPanel from "../Passengers/PassengerDetailPanel";

const BASE = import.meta.env.VITE_API_BASE_URL;

const StatCard = ({ label, value, sub, accent }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1 shadow-sm">
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold ${accent ? "text-townwize-primary" : "text-gray-800"}`}>{value ?? "—"}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
);

const TierBadge = ({ tier }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        tier === "GuestTowner"
            ? "bg-amber-100 text-amber-800"
            : "bg-green-100 text-green-800"
    }`}>{tier || "Towner"}</span>
);

export default function ReferralDashboard() {
    const [tab, setTab] = useState("overview");

    // Stats
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Codes list
    const [codes, setCodes] = useState([]);
    const [codesTotal, setCodesTotal] = useState(0);
    const [codesPage, setCodesPage] = useState(1);
    const [codesLoading, setCodesLoading] = useState(false);
    const [codeTypeFilter, setCodeTypeFilter] = useState("");
    const [deactivating, setDeactivating] = useState(null);

    // GuestTowners list
    const [guests, setGuests] = useState([]);
    const [guestsTotal, setGuestsTotal] = useState(0);
    const [guestsPage, setGuestsPage] = useState(1);
    const [guestsLoading, setGuestsLoading] = useState(false);
    const [selectedGuestId, setSelectedGuestId] = useState(null);

    // Passengers list
    const [passengers, setPassengers] = useState([]);
    const [passengersTotal, setPassengersTotal] = useState(0);
    const [passengersPage, setPassengersPage] = useState(1);
    const [passengersLoading, setPassengersLoading] = useState(false);
    const [passengerTierFilter, setPassengerTierFilter] = useState("");
    const [passengerQuery, setPassengerQuery] = useState("");
    const [selectedPassengerId, setSelectedPassengerId] = useState(null);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const r = await authFetch(`${BASE}/admin/referral/stats`);
            const j = await r.json();
            if (j?.success) setStats(j.data);
        } catch { /* ignore */ } finally { setStatsLoading(false); }
    }, []);

    const loadCodes = useCallback(async () => {
        setCodesLoading(true);
        try {
            const qs = new URLSearchParams({ page: codesPage, limit: 20 });
            if (codeTypeFilter) qs.set("type", codeTypeFilter);
            const r = await authFetch(`${BASE}/admin/referral/codes?${qs}`);
            const j = await r.json();
            if (j?.success) { setCodes(j.data.items); setCodesTotal(j.data.total); }
        } catch { /* ignore */ } finally { setCodesLoading(false); }
    }, [codesPage, codeTypeFilter]);

    const loadGuests = useCallback(async () => {
        setGuestsLoading(true);
        try {
            const r = await authFetch(`${BASE}/admin/referral/guest-towners?page=${guestsPage}&limit=20`);
            const j = await r.json();
            if (j?.success) { setGuests(j.data.items); setGuestsTotal(j.data.total); }
        } catch { /* ignore */ } finally { setGuestsLoading(false); }
    }, [guestsPage]);

    const loadPassengers = useCallback(async () => {
        setPassengersLoading(true);
        try {
            const qs = new URLSearchParams({ page: passengersPage, limit: 20 });
            if (passengerTierFilter) qs.set("tier", passengerTierFilter);
            if (passengerQuery) qs.set("q", passengerQuery);
            const r = await authFetch(`${BASE}/admin/referral/passengers?${qs}`);
            const j = await r.json();
            if (j?.success) { setPassengers(j.data.items); setPassengersTotal(j.data.total); }
        } catch { /* ignore */ } finally { setPassengersLoading(false); }
    }, [passengersPage, passengerTierFilter, passengerQuery]);

    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => { if (tab === "codes")      loadCodes();      }, [tab, loadCodes]);
    useEffect(() => { if (tab === "guests")     loadGuests();     }, [tab, loadGuests]);
    useEffect(() => { if (tab === "passengers") loadPassengers(); }, [tab, loadPassengers]);

    const handleDeactivate = async (codeId) => {
        if (!window.confirm("Deactivate this referral code? The owner can no longer share it.")) return;
        setDeactivating(codeId);
        try {
            const r = await authFetch(`${BASE}/admin/referral/codes/${codeId}/deactivate`, { method: "PATCH" });
            const j = await r.json();
            if (j?.success) loadCodes();
        } catch { /* ignore */ } finally { setDeactivating(null); }
    };

    const tabs = [
        { key: "overview",   label: "Overview" },
        { key: "codes",      label: "Referral Codes" },
        { key: "guests",     label: "GuestTowners" },
        { key: "passengers", label: "All Passengers" },
    ];

    return (
        <div className="space-y-4 max-w-6xl">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Referral Management</h1>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                            tab === t.key
                                ? "border-townwize-primary text-townwize-primary"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
                <div className="space-y-4">
                    {statsLoading ? (
                        <p className="text-sm text-gray-400">Loading stats…</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="General Codes"       value={stats?.generalCodes}        accent />
                                <StatCard label="GuestTowner Invites" value={stats?.guestInviteSlots}    sub={`${stats?.guestInviteSlotsUsed} used`} />
                                <StatCard label="GuestTowners"        value={stats?.guestTowners}        accent />
                                <StatCard label="Coupons Issued"      value={stats?.couponsIssued}       sub={`${stats?.couponsUsed} used · ${stats?.couponsActive} active`} />
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Discount Given</p>
                                    <p className="text-2xl font-bold text-townwize-primary">{Number(stats?.totalDiscountGiven || 0).toLocaleString()} PKR</p>
                                    <p className="text-xs text-gray-400">Cumulative discount applied to fares via referral coupons</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── REFERRAL CODES ── */}
            {tab === "codes" && (
                <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                        <select
                            value={codeTypeFilter}
                            onChange={(e) => { setCodeTypeFilter(e.target.value); setCodesPage(1); }}
                            className="border rounded-md px-3 py-1.5 text-sm"
                        >
                            <option value="">All Types</option>
                            <option value="GENERAL">General</option>
                            <option value="GUEST_INVITE">Guest Invite</option>
                        </select>
                        <span className="text-xs text-gray-400 ml-auto">{codesTotal} total</span>
                    </div>

                    {codesLoading ? <p className="text-sm text-gray-400">Loading codes…</p> : (
                        <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {["Code", "Type", "Owner", "Role", "Uses", "Rewards", "Active", "Action"].map((h) => (
                                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {codes.map((c) => (
                                        <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-3 py-2.5 font-mono font-bold text-townwize-primary">{c.code}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.type === "GUEST_INVITE" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                                    {c.type === "GUEST_INVITE" ? "Guest Invite" : "General"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600">{c.ownerEmail}</td>
                                            <td className="px-3 py-2.5 capitalize text-xs text-gray-500">{c.ownerRole}</td>
                                            <td className="px-3 py-2.5 font-semibold">{c.totalUses}</td>
                                            <td className="px-3 py-2.5 text-green-600 font-semibold">{c.rewardsIssued}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                                    {c.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {c.isActive && (
                                                    <button
                                                        onClick={() => handleDeactivate(c._id)}
                                                        disabled={deactivating === c._id}
                                                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition"
                                                    >
                                                        {deactivating === c._id ? "…" : "Deactivate"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {codes.length === 0 && (
                                        <tr><td colSpan={8} className="px-3 py-6 text-center text-xs text-gray-400">No referral codes found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 text-sm">
                        <button disabled={codesPage <= 1} onClick={() => setCodesPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
                        <span className="text-xs text-gray-500">Page {codesPage}</span>
                        <button disabled={codes.length < 20} onClick={() => setCodesPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
                    </div>
                </div>
            )}

            {/* ── GUEST TOWNERS ── */}
            {tab === "guests" && (
                <div className="space-y-3">
                    <p className="text-xs text-gray-500">{guestsTotal} GuestTowner accounts — sponsored by Towners, limited to Karachi ↔ BTK routes.</p>

                    {guestsLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
                        <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
                            <table className="min-w-full text-sm">
                                <thead className="bg-amber-50 border-b border-amber-200">
                                    <tr>
                                        {["Name", "Email", "Phone", "Status", "Sponsor Towner", "Invite Code", "Joined", "Detail"].map((h) => (
                                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-amber-800 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {guests.map((g) => (
                                        <tr key={g.userId} className="hover:bg-amber-50">
                                            <td className="px-3 py-2.5 font-medium">{g.name}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600">{g.email}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{g.phone}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${g.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                                    {g.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-townwize-primary font-medium">{g.sponsorEmail}</td>
                                            <td className="px-3 py-2.5 font-mono text-xs">{g.inviteCode}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{g.joinedAt ? new Date(g.joinedAt).toLocaleDateString() : "—"}</td>
                                            <td className="px-3 py-2.5">
                                                <button
                                                    onClick={() => setSelectedGuestId(g.userId === selectedGuestId ? null : g.userId)}
                                                    className="text-xs text-townwize-primary hover:underline"
                                                >
                                                    {selectedGuestId === g.userId ? "Hide" : "View"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {guests.length === 0 && (
                                        <tr><td colSpan={8} className="px-3 py-6 text-center text-xs text-gray-400">No GuestTowners yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedGuestId && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <PassengerDetailPanel passengerId={selectedGuestId} />
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 text-sm">
                        <button disabled={guestsPage <= 1} onClick={() => setGuestsPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
                        <span className="text-xs text-gray-500">Page {guestsPage}</span>
                        <button disabled={guests.length < 20} onClick={() => setGuestsPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
                    </div>
                </div>
            )}

            {/* ── ALL PASSENGERS ── */}
            {tab === "passengers" && (
                <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap items-center">
                        <input
                            type="text"
                            placeholder="Search name or email…"
                            value={passengerQuery}
                            onChange={(e) => { setPassengerQuery(e.target.value); setPassengersPage(1); }}
                            className="border rounded-md px-3 py-1.5 text-sm w-64"
                        />
                        <select
                            value={passengerTierFilter}
                            onChange={(e) => { setPassengerTierFilter(e.target.value); setPassengersPage(1); }}
                            className="border rounded-md px-3 py-1.5 text-sm"
                        >
                            <option value="">All Tiers</option>
                            <option value="Towner">Towner</option>
                            <option value="GuestTowner">GuestTowner</option>
                        </select>
                        <span className="text-xs text-gray-400 ml-auto">{passengersTotal} total</span>
                    </div>

                    {passengersLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
                        <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {["Name", "Email", "Phone", "Tier", "BTK Resident", "Sponsor", "Code Used", "Joined", "Detail"].map((h) => (
                                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {passengers.map((p) => (
                                        <tr key={p.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-3 py-2.5 font-medium">{p.name}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600">{p.email}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{p.phone}</td>
                                            <td className="px-3 py-2.5"><TierBadge tier={p.accountTier} /></td>
                                            <td className="px-3 py-2.5 text-xs">{p.isBTKResident ? "Yes" : "No"}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{p.sponsorEmail || "—"}</td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-townwize-primary">{p.inviteCode || "—"}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{p.joinedAt ? new Date(p.joinedAt).toLocaleDateString() : "—"}</td>
                                            <td className="px-3 py-2.5">
                                                <button
                                                    onClick={() => setSelectedPassengerId(p.userId === selectedPassengerId ? null : p.userId)}
                                                    className="text-xs text-townwize-primary hover:underline"
                                                >
                                                    {selectedPassengerId === p.userId ? "Hide" : "View"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {passengers.length === 0 && (
                                        <tr><td colSpan={9} className="px-3 py-6 text-center text-xs text-gray-400">No passengers found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedPassengerId && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <PassengerDetailPanel passengerId={selectedPassengerId} />
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 text-sm">
                        <button disabled={passengersPage <= 1} onClick={() => setPassengersPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
                        <span className="text-xs text-gray-500">Page {passengersPage} — {passengersTotal} total</span>
                        <button disabled={passengers.length < 20} onClick={() => setPassengersPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}
