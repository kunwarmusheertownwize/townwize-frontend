import { useEffect, useState } from "react";
import { authFetch } from "../../../utils/authFetch";

const getPathValue = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

const setPathValue = (obj, path, value) => {
  const keys = path.split(".");
  const next = { ...(obj || {}) };
  let cursor = next;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    cursor[key] = { ...(cursor[key] || {}) };
    cursor = cursor[key];
  });
  return next;
};

const flattenValues = (obj, prefix = "") =>
  Object.entries(obj || {}).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, flattenValues(value, path));
    } else {
      acc[path] = value;
    }
    return acc;
  }, {});

const formatConfigValue = (value) => {
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

export default function PricingSettings() {
  const [profile, setProfile] = useState({});
  const [savedProfile, setSavedProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [note, setNote] = useState("");
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: "-" });
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");
  const [simData, setSimData] = useState(null);
  const [simPickupLat, setSimPickupLat] = useState("");
  const [simPickupLng, setSimPickupLng] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/pricing`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || json?.message || "Failed to load pricing");
        if (!mounted) return;
        const p = json?.data?.profile || {};
        setProfile(p);
        setSavedProfile(p);
        setMeta({
          updatedAt: json?.data?.meta?.updatedAt || null,
          updatedBy: json?.data?.meta?.updatedBy || "-",
        });
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load pricing");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const onChange = (key, value) => {
    setProfile((prev) => setPathValue(prev, key, value));
    setSuccess("");
  };

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/pricing`, {
        method: "PATCH",
        body: JSON.stringify({ profile, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.message || "Failed to save pricing");
      const p = json?.data?.profile || profile;
      setProfile(p);
      setSavedProfile(p);
      setMeta({
        updatedAt: json?.data?.meta?.updatedAt || new Date().toISOString(),
        updatedBy: json?.data?.meta?.updatedBy || "admin",
      });
      setSuccess(`Pricing settings saved. ${json?.data?.changedCount ?? 0} field(s) updated.`);
    } catch (e) {
      setError(e?.message || "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const runDispatchSimulator = async () => {
    setSimLoading(true);
    setSimError("");
    try {
      const params = new URLSearchParams();
      if (simPickupLat !== "" && simPickupLng !== "") {
        params.set("pickupLat", simPickupLat);
        params.set("pickupLng", simPickupLng);
      }
      const qs = params.toString();
      const url = `${import.meta.env.VITE_API_BASE_URL}/admin/drivers/dispatch-simulator${qs ? `?${qs}` : ""}`;
      const res = await authFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.message || "Failed to run simulator");
      setSimData(json?.data || null);
    } catch (e) {
      setSimError(e?.message || "Failed to run simulator");
    } finally {
      setSimLoading(false);
    }
  };

  const numberField = (label, key, suffix = "PKR") => (
    <label className="space-y-1">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={getPathValue(profile, key) ?? ""}
          onChange={(e) => onChange(key, Number(e.target.value))}
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">{suffix}</span>
      </div>
    </label>
  );

  const checkboxField = (label, key, helper = "") => (
    <label className="flex items-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
      <input
        type="checkbox"
        checked={Boolean(getPathValue(profile, key))}
        onChange={(e) => onChange(key, e.target.checked)}
        className="mt-1"
      />
      <span>
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        {helper ? <span className="block text-xs text-gray-500">{helper}</span> : null}
      </span>
    </label>
  );

  const profileFlat = flattenValues(profile);
  const savedProfileFlat = flattenValues(savedProfile);
  const changedKeys = Object.keys(profileFlat).filter((k) => profileFlat[k] !== savedProfileFlat[k]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pricing Settings</h1>
      <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {loading ? <p className="text-sm text-gray-500">Loading pricing profile...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">{success}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border p-3 bg-gray-50">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Last Updated</p>
            <p className="text-sm font-medium">{meta.updatedAt ? new Date(meta.updatedAt).toLocaleString() : "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Updated By</p>
            <p className="text-sm font-medium">{meta.updatedBy || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending Changes</p>
            <p className="text-sm font-medium">{changedKeys.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {numberField("Base Fare - Private", "baseFarePrivate")}
          {numberField("Base Fare - RideTogether", "baseFareRideTogether")}
          {numberField("Global Minimum Fare", "globalMinimumFare")}
          {numberField("Per KM - Private", "perKmPrivate", "PKR/km")}
          {numberField("Per KM - RideTogether", "perKmRideTogether", "PKR/km")}
          {numberField("Platform Fee", "platformFee")}
          {numberField("Per Minute - Private", "perMinutePrivate", "PKR/min")}
          {numberField("Per Minute - RideTogether", "perMinuteRideTogether", "PKR/min")}
        </div>

        <div className="rounded-lg border p-3 bg-gray-50 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Taxes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checkboxField(
              "Apply tax to passenger fare",
              "taxEnabled",
              "Keep this off unless tax should be charged in the estimated and final fare."
            )}
            {numberField("Tax Percentage", "taxPercent", "%")}
          </div>
        </div>

        <div className="rounded-lg border p-3 bg-gray-50 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Townwize Commission</p>
            <p className="text-xs text-gray-500">
              Internal split only. This does not change the passenger fare; it controls driver payout and Townwize revenue reporting.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checkboxField(
              "Apply commission to driver payout",
              "commissionEnabled",
              "Commission is calculated after platform fee and before tax."
            )}
            {numberField("Commission Percentage", "commissionPercent", "%")}
          </div>
        </div>

        <div className="rounded-lg border p-3 bg-gray-50 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Car Class Pricing</p>
            <p className="text-xs text-gray-500">
              Controls how much each private ride class changes the estimated fare.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {numberField("Economy Factor", "carTypeMultipliers.economy", "x")}
            {numberField("Comfort Factor", "carTypeMultipliers.comfort", "x")}
            {numberField("XL Factor", "carTypeMultipliers.xl", "x")}
          </div>
          <p className="text-xs text-gray-500">
            1.00 keeps the standard price. 1.18 makes that car class 18% higher.
          </p>
        </div>

        <div className="rounded-lg border p-3 bg-gray-50 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Dispatch Settings</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {numberField("Dispatch Wave Size", "dispatchWaveSize", "drivers")}
            {numberField("Dispatch Wave Delay", "dispatchWaveDelaySec", "sec")}
            {numberField("Location Freshness", "dispatchLocationFreshSec", "sec")}
            {numberField("After-trip Cooldown", "dispatchPostTripCooldownSec", "sec")}
            {numberField("Open Request Lookback", "dispatchRequestLookbackMin", "min")}
          </div>
        </div>

        <div className="rounded-lg border p-3 bg-gray-50 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Waiting And Settlement</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checkboxField(
              "Charge pickup waiting time",
              "pickupWaitChargeEnabled",
              "Applies only after the pickup grace time."
            )}
            {checkboxField(
              "Charge stop waiting time",
              "stopWaitChargeEnabled",
              "Applies only after the stop grace time."
            )}
            {numberField("Pickup Wait Grace", "pickupWaitGraceMin", "min")}
            {numberField("Pickup Wait Charge", "pickupWaitChargePerMin", "PKR/min")}
            {numberField("Stop Wait Grace", "stopWaitGraceMin", "min")}
            {numberField("Stop Wait Charge", "stopWaitChargePerMin", "PKR/min")}
            {numberField("End Trip Guard - Minimum Time", "endTripGuardMinTime", "min")}
            {numberField("End Trip Guard - Minimum Distance", "endTripGuardMinDistanceKm", "km")}
            {numberField("Rounding Step", "roundingStep", "PKR")}
            {numberField("Line Precision", "linePrecision", "decimals")}
          </div>
        </div>

        <div className="rounded-lg border p-3 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Dispatch Simulator</p>
            <button
              type="button"
              onClick={runDispatchSimulator}
              disabled={simLoading}
              className="px-3 py-1.5 rounded-md bg-townwize-primary text-white text-sm disabled:opacity-60"
            >
              {simLoading ? "Running..." : "Run Preview"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-gray-600">Pickup Latitude (optional)</span>
              <input
                type="number"
                value={simPickupLat}
                onChange={(e) => setSimPickupLat(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="25.042722"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-600">Pickup Longitude (optional)</span>
              <input
                type="number"
                value={simPickupLng}
                onChange={(e) => setSimPickupLng(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="67.343652"
              />
            </label>
          </div>

          {simError ? <p className="text-sm text-red-600">{simError}</p> : null}

          {simData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div className="rounded border p-2"><span className="text-gray-500">Online</span><div className="font-semibold">{simData?.counts?.onlineTotal ?? 0}</div></div>
                <div className="rounded border p-2"><span className="text-gray-500">Fresh</span><div className="font-semibold">{simData?.counts?.onlineFresh ?? 0}</div></div>
                <div className="rounded border p-2"><span className="text-gray-500">Verified</span><div className="font-semibold">{simData?.counts?.eligibleVerified ?? 0}</div></div>
                <div className="rounded border p-2"><span className="text-gray-500">Busy</span><div className="font-semibold">{simData?.counts?.busyActiveRide ?? 0}</div></div>
                <div className="rounded border p-2"><span className="text-gray-500">Dispatch Ready</span><div className="font-semibold">{simData?.counts?.dispatchReady ?? 0}</div></div>
              </div>
              <div className="text-xs text-gray-600">
                Wave: {simData?.dispatchConfig?.dispatchWaveSize} drivers, delay: {simData?.dispatchConfig?.dispatchWaveDelaySec}s, freshness: {simData?.dispatchConfig?.dispatchLocationFreshSec}s
              </div>
              <div className="rounded border overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Driver</th>
                      <th className="px-3 py-2 text-left">Car Type</th>
                      <th className="px-3 py-2 text-left">Distance (km)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(simData?.rankedCandidates || []).slice(0, 10).map((c) => (
                      <tr key={c.driverId} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{c.driverId}</td>
                        <td className="px-3 py-2">{c.carType}</td>
                        <td className="px-3 py-2">{c.pickupDistanceKm ?? "-"}</td>
                      </tr>
                    ))}
                    {(simData?.rankedCandidates || []).length === 0 ? (
                      <tr><td className="px-3 py-3 text-gray-500" colSpan={3}>No dispatch-ready drivers.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <label className="space-y-1 block">
          <span className="text-sm text-gray-600 dark:text-gray-300">Change Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Reason for this pricing update"
          />
        </label>

        <button
          onClick={onSave}
          disabled={saving || loading || changedKeys.length === 0}
          className="px-4 py-2 rounded-md bg-townwize-primary text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Pricing"}
        </button>

        {changedKeys.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">Updated values (before save)</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-amber-900">
              {changedKeys.map((k) => (
                <div key={k}>
                  <span className="font-medium">{k}:</span> {formatConfigValue(savedProfileFlat[k])} {"->"} {formatConfigValue(profileFlat[k])}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
