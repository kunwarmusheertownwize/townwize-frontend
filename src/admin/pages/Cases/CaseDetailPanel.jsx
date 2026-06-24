import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import { updateCase, presignDocumentUrl } from "../../../api/adminApi";

const STATUSES = ["open", "approved", "rejected", "closed"];
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

const DriverDocs = ({ profile, referrer }) => {
  const v    = profile?.vehicle          || {};
  const id   = profile?.identity         || {};
  const face = profile?.faceVerification || {};
  const res  = profile?.residency        || {};

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

      <DocSection title="Identity &amp; Selfie">
        <DocLink url={id.cnicFrontUrl} label="CNIC Front" />
        <DocLink url={id.cnicBackUrl}  label="CNIC Back"  />
        <DocLink url={face.selfieUrl}  label="Selfie"     />
        {id.cnicNumber && (
          <div className="text-xs text-gray-500">CNIC: {id.cnicNumber}</div>
        )}
      </DocSection>

      <DocSection title="Vehicle &amp; Licence">
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
        <DocSection title="Residency Proof">
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

export default function CaseDetailPanel({ item, onUpdated }) {
  const [status, setStatus] = useState(item.status || "open");
  const [priority, setPriority] = useState(item.priority || "normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

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

      {/* Documents */}
      {item.entityType === "passenger" && <PassengerDocs profile={item.profile} />}
      {item.entityType === "driver"    && <DriverDocs    profile={item.profile} referrer={item.referrer} />}

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
        <button
          className="mt-3 rounded-md bg-townwize-primary px-3 py-2 text-white disabled:opacity-50"
          onClick={save}
          disabled={saving || !canSave}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
