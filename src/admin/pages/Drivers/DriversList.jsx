import { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import SidePanel from "../../components/panels/SidePanel";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchAllDrivers, fetchCaseDetail, fetchCases, updateDriverVehicleApproval, presignDocumentUrl, bulkVerifyDrivers } from "../../../api/adminApi";
import CaseDetailPanel from "../Cases/CaseDetailPanel";
import SecureImg from "../../../components/SecureImg";

const REQUIRED_PHOTO_KEYS = [
  "front",
  "rear",
  "left",
  "right",
  "interior_front",
  "interior_rear",
  "odometer",
];

const labelForPhoto = (key) =>
  ({
    front: "Front",
    rear: "Rear",
    left: "Left",
    right: "Right",
    interior_front: "Interior Front",
    interior_rear: "Interior Rear",
    odometer: "Odometer",
  }[key] || key);

function VehicleReviewPanel({ driver, onClose, onSaved }) {
  const photos = Array.isArray(driver?.vehicleMeta?.conditionPhotos) ? driver.vehicleMeta.conditionPhotos : [];
  const uploadedKeys = new Set(photos.map((p) => p.key));
  const requiredUploaded = REQUIRED_PHOTO_KEYS.filter((k) => uploadedKeys.has(k)).length;
  const [carType, setCarType] = useState(driver?.vehicleMeta?.carType || "economy");
  const [verificationStatus, setVerificationStatus] = useState(String(driver?.vehicle || "PENDING").toUpperCase());
  const [conditionStatus, setConditionStatus] = useState(driver?.vehicleMeta?.conditionStatus || "pending");
  const [conditionScore, setConditionScore] = useState(Number(driver?.vehicleMeta?.conditionScore ?? 0));
  const [remarks, setRemarks] = useState("");
  // Separate from `remarks` above, which belongs to vehicle verification.
  // Sharing them would stamp a vehicle rejection reason onto an M-Tag decision.
  const [mTagStatus, setMTagStatus] = useState(String(driver?.mTag?.status || "PENDING").toUpperCase());
  const [mTagRemarks, setMTagRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSetPass = requiredUploaded >= 6;
  const mTagPhotoUrl = driver?.mTag?.photoUrl || "";

  const handleSave = async () => {
    setError("");
    if (conditionStatus === "pass" && !canSetPass) {
      setError("At least 6 condition photos are required before marking condition as pass.");
      return;
    }
    if (verificationStatus === "REJECTED" && !remarks.trim()) {
      setError("Remarks are required when rejecting vehicle.");
      return;
    }
    // Mirrors the server so the admin is told before the round trip.
    if (mTagStatus === "APPROVED" && !mTagPhotoUrl) {
      setError("An M-Tag photo is required before approving. Ask the Wizer to upload one.");
      return;
    }
    if (mTagStatus === "REJECTED" && !mTagRemarks.trim()) {
      setError("Remarks are required when rejecting an M-Tag.");
      return;
    }
    setSaving(true);
    try {
      await updateDriverVehicleApproval(String(driver.userId), {
        carType,
        verificationStatus,
        conditionStatus,
        conditionScore: Number(conditionScore || 0),
        remarks: remarks.trim(),
        mTagStatus,
        mTagRemarks: mTagRemarks.trim(),
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to save vehicle decision");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{driver?.name || "-"}</div>
            <div className="mt-1 text-xs text-gray-600">{driver?.phone || "-"}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={driver?.vehicle || "pending"} />
            <StatusBadge status={driver?.vehicleMeta?.conditionStatus || "pending"} />
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-700">
          {driver?.vehicleMeta?.type || "-"} / {driver?.vehicleMeta?.make || "-"} {driver?.vehicleMeta?.model || "-"} ({driver?.vehicleMeta?.year || "-"})
        </div>
        <div className="text-xs text-gray-700">Plate: {driver?.vehicleMeta?.number || "-"} | Seats: {driver?.vehicleMeta?.seats || "-"}</div>
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Condition Evidence</div>
          <div className={`text-xs ${requiredUploaded >= 6 ? "text-green-700" : "text-amber-700"}`}>
            {requiredUploaded}/7 required photos
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {REQUIRED_PHOTO_KEYS.map((key) => {
            const found = photos.find((p) => p.key === key);
            return (
              <div key={key} className="rounded border border-gray-200 p-2">
                <div className="mb-1 text-[11px] text-gray-600">{labelForPhoto(key)}</div>
                {found?.url ? (
                  <SecureImg
                    src={found.url}
                    alt={labelForPhoto(key)}
                    className="w-full h-24 object-cover rounded cursor-pointer"
                    onClick={() =>
                      presignDocumentUrl(found.url)
                        .then((d) => { const u = d?.data?.url || d?.url; if (u) window.open(u, "_blank", "noreferrer"); })
                        .catch(() => window.open(found.url, "_blank", "noreferrer"))
                    }
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-gray-50 rounded text-xs text-red-500">Missing</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">M-Tag</div>
          <div className={`text-xs ${driver?.hasMTag ? "text-green-700" : "text-amber-700"}`}>
            {driver?.hasMTag ? "verified — can go online" : "not verified — blocked from going online"}
          </div>
        </div>
        {mTagPhotoUrl ? (
          <SecureImg
            src={mTagPhotoUrl}
            alt="M-Tag on windscreen"
            className="w-full h-40 object-cover rounded cursor-pointer"
            onClick={() =>
              presignDocumentUrl(mTagPhotoUrl)
                .then((d) => { const u = d?.data?.url || d?.url; if (u) window.open(u, "_blank", "noreferrer"); })
                .catch(() => window.open(mTagPhotoUrl, "_blank", "noreferrer"))
            }
          />
        ) : (
          <div className="flex h-24 items-center justify-center rounded bg-gray-50 text-xs text-red-500">
            {driver?.mTag?.declared ? "Claimed but no photo uploaded" : "Not submitted"}
          </div>
        )}
        {/* Nothing in the system checks the tag belongs to THIS vehicle, so the
            reviewer is the only control. Say so rather than assume they know. */}
        <p className="mt-2 text-[11px] text-gray-500">
          Check the number plate visible in the photo matches
          <span className="font-semibold"> {driver?.vehicleMeta?.number || "the registered plate"}</span>.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 p-3">
        <div className="text-sm font-semibold">Decision</div>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs text-gray-600">
            Car Type
            <select value={carType} onChange={(e) => setCarType(e.target.value)} className="mt-1 w-full rounded border px-2 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">
              <option value="economy">economy</option>
              <option value="comfort">comfort</option>
              <option value="xl">xl</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Vehicle Verification
            <select
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Condition Status
            <select
              value={conditionStatus}
              onChange={(e) => setConditionStatus(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            >
              <option value="pending">pending</option>
              <option value="pass" disabled={!canSetPass}>
                pass
              </option>
              <option value="fail">fail</option>
              <option value="needs_recheck">needs_recheck</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Condition Score (0-100)
            <input
              type="number"
              min="0"
              max="100"
              value={conditionScore}
              onChange={(e) => setConditionScore(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />
          </label>
          <label className="text-xs text-gray-600">
            M-Tag Verification
            <select
              value={mTagStatus}
              onChange={(e) => setMTagStatus(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED" disabled={!mTagPhotoUrl}>APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            M-Tag Remarks
            <textarea
              value={mTagRemarks}
              onChange={(e) => setMTagRemarks(e.target.value)}
              rows={2}
              placeholder="Required when rejecting — the Wizer sees this"
              className="mt-1 w-full rounded border px-2 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />
          </label>
          <label className="text-xs text-gray-600">
            Remarks
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
              rows={3}
              placeholder="Reason for rejection or recheck notes"
            />
          </label>
        </div>
        {error ? <div className="rounded border border-red-300 bg-red-50 px-2 py-2 text-xs text-red-700">{error}</div> : null}
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="rounded bg-townwize-primary px-3 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save Decision"}
          </button>
          <button onClick={onClose} className="rounded border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">Close</button>
        </div>
      </div>
    </div>
  );
}

function BulkRejectModal({ count, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) { setErr("Rejection reason is required."); return; }
    setBusy(true);
    setErr("");
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      setErr(e?.message || "Failed to reject documents");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-gray-900 mb-1">Reject Documents</h3>
        <p className="text-sm text-gray-500 mb-4">You are rejecting documents for <strong>{count}</strong> driver(s). Provide a reason.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Reason for rejection..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-townwize-primary focus:outline-none"
        />
        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Rejecting..." : "Confirm Reject"}
          </button>
          <button onClick={onCancel} disabled={busy} className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriversList() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [driverRows, setDriverRows] = useState([]);
  const [driverLoading, setDriverLoading] = useState(true);
  const [reviewDriverKey, setReviewDriverKey] = useState("");

  // Bulk selection state
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const reviewDriver = useMemo(
    () => driverRows.find((d) => String(d.userId || d.id || "") === String(reviewDriverKey)) || null,
    [driverRows, reviewDriverKey]
  );

  const allIds = useMemo(() => driverRows.map((d) => String(d.userId || d.id || "")), [driverRows]);
  const allChecked = allIds.length > 0 && allIds.every((id) => checkedIds.has(id));
  const someChecked = checkedIds.size > 0;

  const toggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(allIds));
    }
  };

  const toggleOne = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const json = await fetchCases({
          entityType: "driver",
          q: query,
          status,
          page: String(page),
          limit: "20",
        });
        if (!mounted) return;
        setItems(json?.data?.items || []);
        setMeta({
          page: json?.data?.page || 1,
          totalPages: json?.data?.totalPages || 1,
          total: json?.data?.total || 0,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load drivers");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => (mounted = false);
  }, [query, status, page]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let mounted = true;
    const run = async () => {
      try {
        const json = await fetchCaseDetail(selectedId);
        if (!mounted) return;
        setSelected(json?.data || null);
      } catch {
        if (!mounted) return;
        setSelected(null);
      }
    };
    run();
    return () => (mounted = false);
  }, [selectedId]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setDriverLoading(true);
      try {
        const json = await fetchAllDrivers();
        if (!mounted) return;
        setDriverRows(json?.data || []);
      } catch {
        if (!mounted) return;
        setDriverRows([]);
      } finally {
        if (mounted) setDriverLoading(false);
      }
    };
    run();
    return () => (mounted = false);
  }, []);

  const refresh = async () => {
    const [cases, drivers] = await Promise.all([
      fetchCases({ entityType: "driver", q: query, status, page: String(page), limit: "20" }),
      fetchAllDrivers(),
    ]);
    setItems(cases?.data?.items || []);
    setMeta({
      page: cases?.data?.page || 1,
      totalPages: cases?.data?.totalPages || 1,
      total: cases?.data?.total || 0,
    });
    setDriverRows(drivers?.data || []);
    if (selectedId) {
      const detail = await fetchCaseDetail(selectedId);
      setSelected(detail?.data || null);
    }
  };

  const handleBulkApprove = async () => {
    setBulkError("");
    try {
      await bulkVerifyDrivers({ driverIds: [...checkedIds], action: "approve" });
      setCheckedIds(new Set());
      await refresh();
    } catch (e) {
      setBulkError(e?.message || "Bulk approve failed");
    }
  };

  const handleBulkReject = async (reason) => {
    await bulkVerifyDrivers({ driverIds: [...checkedIds], action: "reject", rejectionReason: reason });
    setCheckedIds(new Set());
    setShowRejectModal(false);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <h1 className="dark:text-white text-xl font-semibold">Driver Verification Cases</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <select
            className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="resubmitted">Re-submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm md:w-96 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            placeholder="Search drivers"
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full table-fixed text-sm min-w-[940px]">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-start w-[20%]">Case ID</th>
              <th className="px-4 py-3 text-start w-[14%]">Name</th>
              <th className="px-4 py-3 text-start w-[14%]">Phone</th>
              <th className="px-4 py-3 text-start w-[12%]">Status</th>
              <th className="px-4 py-3 text-start w-[12%]">Priority</th>
              <th className="px-4 py-3 text-start w-[14%]">Assigned To</th>
              <th className="px-4 py-3 text-start w-[14%]">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={7}>
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-10 text-center text-red-600" colSpan={7}>
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="p-8" colSpan={7}>
                  <EmptyState title="No drivers found" description="Try adjusting filters" />
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.caseId || it._id} className="cursor-pointer border-t hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setSelectedId(it.caseId || it._id)}>
                  <td className="px-4 py-3 break-all">{it.caseId || it._id}</td>
                  <td className="px-4 py-3 break-words">{it.name || "-"}</td>
                  <td className="px-4 py-3 break-words">{it.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={it.status || "-"} />
                      {(it.status === "resubmitted" || it.resubmittedAt) && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Re-submitted
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 break-words">{it.priority || "-"}</td>
                  <td className="px-4 py-3 break-words">{it.assigneeEmail || "Unassigned"}</td>
                  <td className="px-4 py-3 break-words">{it.updatedAt ? new Date(it.updatedAt).toLocaleString() : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vehicle Reviews with bulk checkboxes */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="dark:text-white text-base font-semibold">Vehicle Reviews</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-townwize-primary"
                    title="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-start">Driver</th>
                <th className="px-4 py-3 text-start">Vehicle</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-start">Evidence</th>
                <th className="px-4 py-3 text-start">Action</th>
              </tr>
            </thead>
            <tbody>
              {driverLoading ? (
                <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>Loading drivers...</td></tr>
              ) : driverRows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No drivers found.</td></tr>
              ) : (
                driverRows.map((d) => {
                  const driverId = String(d.userId || d.id || "");
                  const photoCount = Array.isArray(d.vehicleMeta?.conditionPhotos) ? d.vehicleMeta.conditionPhotos.length : 0;
                  const evidencePercent = Math.min(100, Math.round((photoCount / 7) * 100));
                  const isChecked = checkedIds.has(driverId);
                  return (
                    <tr key={driverId} className={`border-t border-gray-100 ${isChecked ? "bg-blue-50" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(driverId)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-townwize-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{d.name || "-"}</div>
                        <div className="text-xs text-gray-600">{d.phone || "-"}</div>
                        <div className="text-xs text-gray-500">{d.email || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{d.vehicleMeta?.make || "-"} {d.vehicleMeta?.model || ""}</div>
                        <div className="text-xs text-gray-600">
                          {d.vehicleMeta?.type || "-"} | {d.vehicleMeta?.carType || "-"} | Plate: {d.vehicleMeta?.number || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge status={d.vehicle || "pending"} />
                          <StatusBadge status={d.vehicleMeta?.conditionStatus || "pending"} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium">{photoCount}/7 photos</div>
                        <div className="mt-1 h-1.5 w-28 rounded bg-gray-100">
                          <div className={`h-1.5 rounded ${photoCount >= 6 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${evidencePercent}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => setReviewDriverKey(driverId)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>Total: {meta.total}</span>
        <div className="flex items-center gap-2">
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>Page {meta.page} / {meta.totalPages}</span>
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>

      <SidePanel open={!!selectedId} title={`Driver Case ${selectedId || ""}`} onClose={() => setSelectedId(null)}>
        {selected ? <CaseDetailPanel item={selected} onUpdated={refresh} /> : <div className="py-6 text-sm text-gray-500">Loading details...</div>}
      </SidePanel>

      <SidePanel open={Boolean(reviewDriverKey && reviewDriver)} title={`Vehicle Review: ${reviewDriver?.name || ""}`} onClose={() => setReviewDriverKey("")}>
        {reviewDriver ? (
          <VehicleReviewPanel driver={reviewDriver} onClose={() => setReviewDriverKey("")} onSaved={refresh} />
        ) : (
          <div className="py-6 text-sm text-gray-500">Loading driver...</div>
        )}
      </SidePanel>

      {/* Bulk Action Bar */}
      {someChecked && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-2xl">
            <span className="text-sm font-semibold text-gray-800">{checkedIds.size} selected</span>
            <span className="h-4 w-px bg-gray-200" />
            <button
              onClick={handleBulkApprove}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
            >
              Approve Documents
            </button>
            <button
              onClick={() => { setBulkError(""); setShowRejectModal(true); }}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Reject Documents
            </button>
            <button
              onClick={() => setCheckedIds(new Set())}
              className="rounded-lg border px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
            {bulkError && <span className="text-xs text-red-600">{bulkError}</span>}
          </div>
        </div>
      )}

      {showRejectModal && (
        <BulkRejectModal
          count={checkedIds.size}
          onConfirm={handleBulkReject}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </div>
  );
}
