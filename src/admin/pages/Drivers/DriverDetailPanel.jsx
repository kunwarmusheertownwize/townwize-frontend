import { useState } from "react";
import ProfileTabs from "../../../components/common/ProfileTabs";
import StatusBadge from "../../components/common/StatusBadge";
import { suspendDriver, reinstateDriver } from "../../../api/adminApi";

function SuspendModal({ driverId, onClose, onDone }) {
    const [reason, setReason] = useState("");
    const [duration, setDuration] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const handleConfirm = async () => {
        if (!reason.trim()) { setErr("Suspension reason is required."); return; }
        setBusy(true);
        setErr("");
        try {
            await suspendDriver(driverId, {
                reason: reason.trim(),
                ...(duration ? { durationDays: Number(duration) } : {}),
            });
            onDone();
            onClose();
        } catch (e) {
            setErr(e?.message || "Failed to suspend driver");
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="text-base font-bold text-gray-900 mb-1">Suspend Driver</h3>
                <p className="text-sm text-gray-500 mb-4">
                    This is an admin-initiated suspension. Block = permanent; Suspend = temporary with reason.
                </p>
                <label className="block text-xs text-gray-600 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for suspension..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-townwize-primary focus:outline-none"
                />
                <label className="mt-3 block text-xs text-gray-600 mb-1">Duration (days, optional)</label>
                <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Leave blank for indefinite"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-townwize-primary focus:outline-none"
                />
                {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
                <div className="mt-4 flex gap-3">
                    <button
                        onClick={handleConfirm}
                        disabled={busy}
                        className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                        {busy ? "Suspending..." : "Confirm Suspend"}
                    </button>
                    <button onClick={onClose} disabled={busy} className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DriverDetailPanel({ driver, onRefresh }) {
    const [tab, setTab] = useState("overview");
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [reinstating, setReinstating] = useState(false);
    const [actionErr, setActionErr] = useState("");

    const tabs = [
        { key: "overview", label: "Overview" },
        { key: "residency", label: "Residency" },
        { key: "vehicle", label: "Vehicle & License" },
        { key: "identity", label: "Identity" },
        { key: "face", label: "Face" },
        { key: "notes", label: "Notes" },
    ];

    const handleReinstate = async () => {
        setReinstating(true);
        setActionErr("");
        try {
            await reinstateDriver(driver.userId);
            onRefresh?.();
        } catch (e) {
            setActionErr(e?.message || "Failed to reinstate driver");
        } finally {
            setReinstating(false);
        }
    };

    const isSuspended = driver?.status === "suspended";

    return (
        <div className="text-sm space-y-4">
            <ProfileTabs tabs={tabs} activeTab={tab} onChange={setTab} />

            {tab === "overview" && (
                <>
                    <div>Name: {driver.name}</div>
                    <div className="flex items-center gap-2">
                        Status: <StatusBadge status={driver.status} />
                    </div>
                    <div>Registration: {driver.regPercent}</div>

                    {/* Suspension info when suspended */}
                    {isSuspended && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                            <p className="text-xs font-semibold text-amber-800">Driver is currently suspended</p>
                            {driver.suspensionNote && (
                                <p className="text-xs text-amber-700">Reason: <span className="font-medium">{driver.suspensionNote}</span></p>
                            )}
                            {driver.suspendedAt && (
                                <p className="text-xs text-amber-600">Suspended at: {new Date(driver.suspendedAt).toLocaleString()}</p>
                            )}
                            {driver.suspendedUntil && (
                                <p className="text-xs text-amber-600">Expires: {new Date(driver.suspendedUntil).toLocaleString()}</p>
                            )}
                        </div>
                    )}

                    {actionErr && <p className="text-xs text-red-600">{actionErr}</p>}

                    <div className="flex flex-wrap gap-2 mt-1">
                        {!isSuspended ? (
                            <button
                                className="px-3 py-2 text-xs bg-amber-100 text-amber-800 border border-amber-300 rounded-md hover:bg-amber-200"
                                onClick={() => setShowSuspendModal(true)}
                            >
                                Suspend Driver
                            </button>
                        ) : (
                            <button
                                className="px-3 py-2 text-xs bg-green-100 text-green-800 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50"
                                onClick={handleReinstate}
                                disabled={reinstating}
                            >
                                {reinstating ? "Reinstating..." : "Reinstate Driver"}
                            </button>
                        )}
                    </div>
                </>
            )}

            {tab === "residency" && (
                <>
                    <div>BTK Residency Documents</div>
                    <button className="mt-2 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-md">
                        Verify
                    </button>
                    <button className="ml-2 px-3 py-2 text-xs bg-red-100 text-red-700 rounded-md">
                        Reject
                    </button>
                </>
            )}

            {tab === "vehicle" && <div>Vehicle & License documents (read-only)</div>}
            {tab === "identity" && <div>CNIC documents (read-only)</div>}
            {tab === "face" && <div>Face verification result (view-only)</div>}
            {tab === "notes" && <div>Internal admin notes & audit log</div>}

            {showSuspendModal && (
                <SuspendModal
                    driverId={driver.userId}
                    onClose={() => setShowSuspendModal(false)}
                    onDone={() => onRefresh?.()}
                />
            )}
        </div>
    );
}
