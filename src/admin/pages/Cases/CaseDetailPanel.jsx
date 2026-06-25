import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import { updateCase, presignDocumentUrl, fetchPassengerRides, linkCaseRide, fetchRideDetail, escalateCase } from "../../../api/adminApi";

const STATUSES = ["open", "approved", "rejected", "closed", "escalated"];
const PRIORITIES = ["low", "normal", "high", "critical"];

const openPresigned = async (url, setOpening) => {
  setOpening(true);
  try {
    const data = await presignDocumentUrl(url);
    const presigned = data?.data?.url || data?.url;
    if (presigned) window.open(presigned, "_blank", "noreferrer");
  } catch {
    window.open(url, "_blank", "noreferrer");
  } finally {
    setOpening(false);
  }
};

const DocLink = ({ url, label }) => {
  const [opening, setOpening] = useState(false);
  if (!url) {
    return (
      <div className="flex items-center justify-between rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-400">
        <span>{label}</span>
        <span>Not uploaded</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={opening}
      onClick={() => openPresigned(url, setOpening)}
      className="w-full flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-60"
    >
      <span className="font-medium">{label}</span>
      <span className="ml-2 shrink-0">{opening ? "Opening…" : "View ↗"}</span>
    </button>
  );
};

const DocSection = ({ title, accent, children }) => (
  <div className={`rounded-xl border p-3 ${accent === "amber" ? "border-amber-200 bg-amber-50" : "border-gray-200"}`}>
    <h4 className={`mb-2 font-semibold text-sm ${accent === "amber" ? "text-amber-800" : ""}`}>{title}</h4>
    <div className="space-y-2">{children}</div>
  </div>
);

const PassengerDocs = ({ profile }) => {
  const tier = profile?.accountTier || "Towner";

  if (tier === "GuestTowner") {
    return (
      <DocSection title="GuestTowner Identity Verification" accent="amber">
        <div className="rounded border border-amber-200 bg-amber-100 px-2 py-1 text-xs text-amber-800">
          GuestTowner — CNIC only, no BTK residency required
        </div>
        <DocLink url={profile?.cnicFrontUrl} label="CNIC Front" />
        <DocLink url={profile?.cnicBackUrl}  label="CNIC Back"  />
        {profile?.sponsorTownerId && (
          <div className="text-xs text-gray-500">
            Sponsor ID: <span className="font-mono">{String(profile.sponsorTownerId)}</span>
          </div>
        )}
      </DocSection>
    );
  }

  return (
    <DocSection title="Towner BTK Residency Verification">
      <DocLink url={profile?.residencyProofUrl} label="Utility Bill / Residency Proof" />
      <DocLink url={profile?.btkIdFrontUrl}     label="BTK ID Front"                  />
      <DocLink url={profile?.btkIdBackUrl}      label="BTK ID Back"                   />
      {profile?.btkAddress && (
        <div className="text-xs text-gray-500 mt-1">
          BTK Address: <span className="font-medium">{profile.btkAddress}</span>
        </div>
      )}
      {profile?.residencyType && (
        <div className="text-xs text-gray-500">
          Residency Type: <span className="font-medium capitalize">{profile.residencyType.replace(/_/g, " ")}</span>
        </div>
      )}
    </DocSection>
  );
};

const PendingBadge = () => (
  <span className="ml-2 inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
    Re-submitted — awaiting review
  </span>
);

const DriverDocs = ({ profile, referrer }) => {
  const v    = profile?.vehicle          || {};
  const id   = profile?.identity         || {};
  const face = profile?.faceVerification || {};
  const res  = profile?.residency        || {};

  const idPending  = id?.verification?.status  === "PENDING";
  const vehPending = v?.verification?.status   === "PENDING";
  const resPending = res?.verification?.status === "PENDING";

  return (
    <>
      {referrer && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs font-semibold text-green-800 mb-1">Referred by Wizer</p>
          <div className="text-xs text-green-700 space-y-0.5">
            {referrer.name  && <div>Name: <span className="font-medium">{referrer.name}</span></div>}
            {referrer.email && <div>Email: <span className="font-medium">{referrer.email}</span></div>}
            {referrer.vehicleNumber && <div>Vehicle: <span className="font-medium">{referrer.vehicleNumber}</span></div>}
            <div>Code: <span className="font-mono">{referrer.referralCode}</span></div>
          </div>
          <p className="mt-1.5 text-xs text-green-600">
            BTK residency below must be verified — the referring Wizer has vouched for this candidate.
          </p>
        </div>
      )}

      <DocSection title={<span className="flex items-center">Identity &amp; Selfie{idPending && <PendingBadge />}</span>} accent={idPending ? "amber" : undefined}>
        <DocLink url={id.cnicFrontUrl} label="CNIC Front" />
        <DocLink url={id.cnicBackUrl}  label="CNIC Back"  />
        <DocLink url={face.selfieUrl}  label="Selfie"     />
        {id.cnicNumber && (
          <div className="text-xs text-gray-500">CNIC: {id.cnicNumber}</div>
        )}
      </DocSection>

      <DocSection title={<span className="flex items-center">Vehicle &amp; Licence{vehPending && <PendingBadge />}</span>} accent={vehPending ? "amber" : undefined}>
        <DocLink url={v.vehicleRegUrl}   label="Vehicle Registration"   />
        <DocLink url={v.licenseFrontUrl} label="Driving Licence Front"  />
        <DocLink url={v.licenseBackUrl}  label="Driving Licence Back"   />
        {v.make && (
          <div className="text-xs text-gray-500 mt-1">
            {[v.year, v.make, v.model, v.number].filter(Boolean).join(" · ")}
          </div>
        )}
      </DocSection>

      {(res.proofUrl || res.btkIdFrontUrl) && (
        <DocSection title={<span className="flex items-center">Residency Proof{resPending && <PendingBadge />}</span>} accent={resPending ? "amber" : undefined}>
          <DocLink url={res.proofUrl}      label="Residency Proof" />
          <DocLink url={res.btkIdFrontUrl} label="BTK ID Front"    />
          <DocLink url={res.btkIdBackUrl}  label="BTK ID Back"     />
        </DocSection>
      )}

      {v.conditionPhotos?.length > 0 && (
        <DocSection title="Vehicle Condition Photos">
          {v.conditionPhotos.map((p) => (
            <DocLink key={p.key} url={p.url} label={p.key.replace(/_/g, " ")} />
          ))}
        </DocSection>
      )}
    </>
  );
};

const RIDE_STATUS_COLORS = {
  COMPLETED:       "bg-green-100 text-green-700",
  CANCELLED:       "bg-red-100 text-red-700",
  ON_TRIP:         "bg-blue-100 text-blue-700",
  REQUESTED:       "bg-gray-100 text-gray-700",
  DRIVER_ASSIGNED: "bg-yellow-100 text-yellow-700",
  EN_ROUTE:        "bg-yellow-100 text-yellow-700",
  ARRIVED:         "bg-teal-100 text-teal-700",
};

function TripHistorySection({ userId }) {
  const [open, setOpen] = useState(false);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  const load = async () => {
    if (fetched) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchPassengerRides(userId, { page: "1" });
      setRides(res?.data?.rides || []);
      setFetched(true);
    } catch (e) {
      setError(e.message || "Failed to load trip history");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) load();
  };

  const fareFor = (r) => {
    const v = r.fareAdjustment?.finalFare ?? r.fareEstimate ?? 0;
    return `${Number(v).toLocaleString()} PKR`;
  };

  return (
    <div className="rounded-xl border border-gray-200">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-xl"
      >
        <span>Trip History</span>
        <span className="text-gray-400 text-xs">{open ? "Hide ▲" : "Show ▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
          {loading && <p className="text-xs text-gray-400">Loading trips...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {!loading && !error && rides.length === 0 && (
            <p className="text-xs text-gray-400">No rides found for this passenger.</p>
          )}
          {rides.map((r) => {
            const statusCls = RIDE_STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600";
            const pickup  = r.pickup?.address  || r.pickup?.lat  ? `${r.pickup?.address  || `${r.pickup?.lat},${r.pickup?.lng}`}`  : "-";
            const dropoff = r.dropoff?.address || r.dropoff?.lat ? `${r.dropoff?.address || `${r.dropoff?.lat},${r.dropoff?.lng}`}` : "-";
            return (
              <div key={r._id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${statusCls}`}>{r.status}</span>
                  <span className="text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "2-digit" }) : "-"}</span>
                </div>
                <div className="text-gray-600 truncate">From: <span className="font-medium text-gray-800">{pickup}</span></div>
                <div className="text-gray-600 truncate">To: <span className="font-medium text-gray-800">{dropoff}</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 capitalize">{(r.rideType || "").toLowerCase().replace(/_/g, " ")}</span>
                  <span className="font-semibold text-townwize-primary">{fareFor(r)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LinkedRideSection({ caseId, initialRideId, onRefreshed }) {
  const [rideId, setRideId] = useState("");
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  // Load initial linked ride on mount
  useEffect(() => {
    if (!initialRideId) return;
    setLoading(true);
    fetchRideDetail(String(initialRideId))
      .then((res) => setRide(res?.data || null))
      .catch(() => setRide(null))
      .finally(() => setLoading(false));
  }, [initialRideId]);

  const handleLink = async () => {
    if (!rideId.trim()) { setError("Enter a ride ID."); return; }
    setLinking(true);
    setError("");
    try {
      await linkCaseRide(caseId, rideId.trim());
      const res = await fetchRideDetail(rideId.trim());
      setRide(res?.data || null);
      setRideId("");
      onRefreshed?.();
    } catch (e) {
      setError(e?.message || "Failed to link ride");
    } finally {
      setLinking(false);
    }
  };

  const fareFor = (r) => {
    const v = r?.fareAdjustment?.finalFare ?? r?.fareEstimate ?? 0;
    return `${Number(v).toLocaleString()} PKR`;
  };

  const rideStatusCls = (s) => RIDE_STATUS_COLORS[s] || "bg-gray-100 text-gray-600";

  return (
    <div className="rounded-xl border border-gray-200 p-3 space-y-3">
      <h4 className="font-semibold text-sm">Linked Ride</h4>
      <div className="flex gap-2">
        <input
          value={rideId}
          onChange={(e) => setRideId(e.target.value)}
          placeholder="Ride ID (MongoDB ObjectId)"
          className="flex-1 rounded border px-3 py-1.5 text-xs focus:border-townwize-primary focus:outline-none"
        />
        <button
          onClick={handleLink}
          disabled={linking}
          className="rounded-lg bg-townwize-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {linking ? "Linking..." : "Link"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {loading && <p className="text-xs text-gray-400">Loading ride...</p>}
      {ride && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${rideStatusCls(ride.status)}`}>{ride.status}</span>
            <span className="text-gray-400">{ride.createdAt ? new Date(ride.createdAt).toLocaleString() : "-"}</span>
          </div>
          {ride.passengerEmail && <div className="text-gray-600">Passenger: <span className="font-medium text-gray-800">{ride.passengerEmail}</span></div>}
          {ride.driverEmail    && <div className="text-gray-600">Driver: <span className="font-medium text-gray-800">{ride.driverEmail}</span></div>}
          <div className="text-gray-600">Fare: <span className="font-semibold text-townwize-primary">{fareFor(ride)}</span></div>
          <div className="text-gray-500 capitalize">Type: {(ride.rideType || "").toLowerCase().replace(/_/g, " ") || "-"}</div>
          {ride.pickup?.address  && <div className="text-gray-600 truncate">From: {ride.pickup.address}</div>}
          {ride.dropoff?.address && <div className="text-gray-600 truncate">To: {ride.dropoff.address}</div>}
        </div>
      )}
    </div>
  );
}

function EscalateModal({ caseId, onClose, onDone }) {
  const [level, setLevel] = useState("supervisor");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) { setErr("Escalation reason is required."); return; }
    setBusy(true);
    setErr("");
    try {
      await escalateCase(caseId, { reason: reason.trim(), level });
      onDone();
      onClose();
    } catch (e) {
      setErr(e?.message || "Failed to escalate case");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-gray-900 mb-1">Escalate Case</h3>
        <p className="text-sm text-gray-500 mb-4">This will mark the case as ESCALATED and notify the selected level.</p>
        <label className="block text-xs text-gray-600 mb-1">Escalation Level</label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3 focus:border-townwize-primary focus:outline-none"
        >
          <option value="supervisor">Supervisor</option>
          <option value="senior_admin">Senior Admin</option>
        </select>
        <label className="block text-xs text-gray-600 mb-1">Reason <span className="text-red-500">*</span></label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why is this case being escalated?"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-townwize-primary focus:outline-none"
        />
        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {busy ? "Escalating..." : "Confirm Escalate"}
          </button>
          <button onClick={onClose} disabled={busy} className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CaseDetailPanel({ item, onUpdated }) {
  const [status, setStatus] = useState(item.status || "open");
  const [priority, setPriority] = useState(item.priority || "normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  useEffect(() => {
    setStatus(item.status || "open");
    setPriority(item.priority || "normal");
    setError("");
    setOk("");
  }, [item.caseId, item._id, item.status, item.priority]);

  const canSave = useMemo(
    () => status !== item.status || priority !== item.priority,
    [status, priority, item.status, item.priority]
  );

  const save = async () => {
    setSaving(true);
    setError("");
    setOk("");
    try {
      await updateCase(item.caseId || item._id, { status, priority });
      setOk("Case updated.");
      onUpdated?.();
    } catch (e) {
      setError(e.message || "Failed to update case");
    } finally {
      setSaving(false);
    }
  };

  const tier = item.profile?.accountTier;
  const passengerId = item.entityType === "passenger" ? (item.entityId || item.userId || item.profile?._id || item.profile?.userId) : null;
  const caseId = item.caseId || item._id;
  const isEscalatable = ["open", "approved", "rejected"].includes(item.status);
  const isEscalated = item.status === "escalated";

  return (
    <div className="space-y-4 text-sm">
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
      {ok    && <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-700">{ok}</div>}

      {/* Summary */}
      <div className="rounded-xl border border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <strong className="font-mono text-xs">{item.caseId || item._id}</strong>
          <StatusBadge status={item.status || "-"} />
        </div>
        <div className="space-y-0.5 text-gray-700">
          <div>
            Entity: <span className="font-medium capitalize">{item.entityType || "-"}</span>
            {tier && (
              <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${
                tier === "GuestTowner"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-800"
              }`}>{tier}</span>
            )}
          </div>
          <div>Name: <span className="font-medium">{item.name || item.profile?.name || "-"}</span></div>
          <div>Phone: {item.phone || item.profile?.phone || "-"}</div>
          <div>Assigned: {item.assigneeEmail || "Unassigned"}</div>
          <div className="text-xs text-gray-500">
            Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}
          </div>
        </div>
      </div>

      {/* Escalation info when escalated */}
      {isEscalated && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 space-y-1">
          <p className="text-xs font-semibold text-purple-800">Case is Escalated</p>
          {item.escalationLevel && (
            <p className="text-xs text-purple-700">Level: <span className="font-medium capitalize">{item.escalationLevel.replace(/_/g, " ")}</span></p>
          )}
          {item.escalationReason && (
            <p className="text-xs text-purple-700">Reason: <span className="font-medium">{item.escalationReason}</span></p>
          )}
          {item.escalatedBy && (
            <p className="text-xs text-purple-600">Escalated by: {item.escalatedBy}</p>
          )}
          {item.escalatedAt && (
            <p className="text-xs text-purple-600">At: {new Date(item.escalatedAt).toLocaleString()}</p>
          )}
        </div>
      )}

      {/* Documents */}
      {item.entityType === "passenger" && <PassengerDocs profile={item.profile} />}
      {item.entityType === "driver"    && <DriverDocs    profile={item.profile} referrer={item.referrer} />}

      {/* Linked Ride */}
      <LinkedRideSection caseId={caseId} initialRideId={item.linkedRideId} onRefreshed={onUpdated} />

      {/* Case action */}
      <div className="rounded-xl border border-gray-200 p-3">
        <h4 className="mb-2 font-semibold">Case Action</h4>
        <label className="mb-1 block text-xs text-gray-500">Status</label>
        <select className="w-full rounded border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="mb-1 mt-3 block text-xs text-gray-500">Priority</label>
        <select className="w-full rounded border px-3 py-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            className="rounded-md bg-townwize-primary px-3 py-2 text-white disabled:opacity-50"
            onClick={save}
            disabled={saving || !canSave}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {isEscalatable && (
            <button
              className="rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
              onClick={() => setShowEscalateModal(true)}
            >
              Escalate
            </button>
          )}
        </div>
      </div>

      {/* Trip History — passenger cases only */}
      {item.entityType === "passenger" && passengerId && (
        <TripHistorySection userId={passengerId} />
      )}

      {showEscalateModal && (
        <EscalateModal
          caseId={caseId}
          onClose={() => setShowEscalateModal(false)}
          onDone={() => onUpdated?.()}
        />
      )}
    </div>
  );
}
