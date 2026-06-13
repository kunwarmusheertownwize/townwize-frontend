import { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import SidePanel from "../../components/panels/SidePanel";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchAllDrivers, fetchCaseDetail, fetchCases, updateDriverVehicleApproval } from "../../../api/adminApi";
import CaseDetailPanel from "../Cases/CaseDetailPanel";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSetPass = requiredUploaded >= 6;

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
    setSaving(true);
    try {
      await updateDriverVehicleApproval(String(driver.userId), {
        carType,
        verificationStatus,
        conditionStatus,
        conditionScore: Number(conditionScore || 0),
        remarks: remarks.trim(),
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
                  <a href={found.url} target="_blank" rel="noreferrer" className="text-xs underline">
                    Open
                  </a>
                ) : (
                  <span className="text-xs text-red-600">Missing</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 p-3">
        <div className="text-sm font-semibold">Decision</div>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs text-gray-600">
            Car Type
            <select value={carType} onChange={(e) => setCarType(e.target.value)} className="mt-1 w-full rounded border px-2 py-2 text-sm">
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
              className="mt-1 w-full rounded border px-2 py-2 text-sm"
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
              className="mt-1 w-full rounded border px-2 py-2 text-sm"
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
              className="mt-1 w-full rounded border px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-gray-600">
            Remarks
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-2 text-sm"
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
          <button onClick={onClose} className="rounded border px-3 py-2 text-sm">Close</button>
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

  const reviewDriver = useMemo(
    () => driverRows.find((d) => String(d.userId || d.id || "") === String(reviewDriverKey)) || null,
    [driverRows, reviewDriverKey]
  );

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Driver Verification Cases</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm md:w-96"
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
              <th className="px-4 py-3 text-left w-[20%]">Case ID</th>
              <th className="px-4 py-3 text-left w-[14%]">Name</th>
              <th className="px-4 py-3 text-left w-[14%]">Phone</th>
              <th className="px-4 py-3 text-left w-[12%]">Status</th>
              <th className="px-4 py-3 text-left w-[12%]">Priority</th>
              <th className="px-4 py-3 text-left w-[14%]">Assigned To</th>
              <th className="px-4 py-3 text-left w-[14%]">Updated</th>
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
                <tr key={it.caseId || it._id} className="cursor-pointer border-t hover:bg-gray-50" onClick={() => setSelectedId(it.caseId || it._id)}>
                  <td className="px-4 py-3 break-all">{it.caseId || it._id}</td>
                  <td className="px-4 py-3 break-words">{it.name || "-"}</td>
                  <td className="px-4 py-3 break-words">{it.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={it.status || "-"} />
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

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold">Vehicle Reviews</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Evidence</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {driverLoading ? (
                <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={5}>Loading drivers...</td></tr>
              ) : driverRows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={5}>No drivers found.</td></tr>
              ) : (
                driverRows.map((d) => {
                  const photoCount = Array.isArray(d.vehicleMeta?.conditionPhotos) ? d.vehicleMeta.conditionPhotos.length : 0;
                  const evidencePercent = Math.min(100, Math.round((photoCount / 7) * 100));
                  return (
                    <tr key={d.userId || d.id} className="border-t border-gray-100">
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
                          className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-50"
                          onClick={() => setReviewDriverKey(String(d.userId || d.id || ""))}
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
    </div>
  );
}
