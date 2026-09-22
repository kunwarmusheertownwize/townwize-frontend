import { useEffect, useState } from "react";
import { fetchCancellationPolicy, saveCancellationPolicy } from "../../../api/adminApi";

const DEFAULTS = {
  passengerFreeWindowMinutes: 3,
  passengerCancellationFee: 75,
  passengerFeesEnabled: true,
  noShowWaitMinutes: 6,
  noShowFee: 120,
  noShowEnabled: true,
  driverCancelRateThresholdPct: 9,
  driverOnTripSuspendEnabled: true,
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "—";

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-townwize-primary" : "bg-gray-300 dark:bg-gray-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min = 0, suffix, disabled }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        disabled={disabled}
        className="w-24 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-600 bg-white dark:bg-gray-900 dark:bg-gray-700 px-3 py-1.5 text-sm text-end focus:outline-none focus:ring-2 focus:ring-townwize-primary disabled:opacity-50"
      />
      {suffix && <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{suffix}</span>}
    </div>
  );
}

export default function CancellationPolicy() {
  const [config, setConfig] = useState(DEFAULTS);
  const [meta, setMeta] = useState({ updatedAt: null, updatedByEmail: "—" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchCancellationPolicy()
      .then((res) => {
        if (!mounted) return;
        setConfig({ ...DEFAULTS, ...(res?.data?.config || {}) });
        setMeta({ updatedAt: res?.data?.updatedAt, updatedByEmail: res?.data?.updatedByEmail || "—" });
      })
      .catch((e) => { if (mounted) setError(e.message || "Failed to load policy"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const set = (key) => (val) => setConfig((c) => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await saveCancellationPolicy(config);
      setConfig({ ...DEFAULTS, ...(res?.data?.config || {}) });
      setMeta({ updatedAt: res?.data?.updatedAt, updatedByEmail: res?.data?.updatedByEmail || "—" });
      setSuccess("Policy saved successfully.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e.message || "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(config) !== JSON.stringify(DEFAULTS);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Cancellation Policy</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Controls fees, waiting periods, and enforcement rules for ride cancellations.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-xl bg-townwize-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-townwize-primary/90"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-gray-800 dark:text-white dark:border-gray-600">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-gray-800 dark:text-white dark:border-gray-600">{success}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700 dark:bg-gray-800" />)}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Passenger Cancellation ─────────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:bg-gray-800 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Passenger Cancellation
            </h2>

            <FieldRow
              label="Enable cancellation fees"
              hint="Master switch — when off, no fees are charged regardless of timing."
            >
              <Toggle checked={config.passengerFeesEnabled} onChange={set("passengerFeesEnabled")} />
            </FieldRow>

            <FieldRow
              label="Free cancellation window"
              hint="Passenger can cancel for free within this many minutes of driver being assigned."
            >
              <NumberInput
                value={config.passengerFreeWindowMinutes}
                onChange={set("passengerFreeWindowMinutes")}
                min={0}
                suffix="min"
                disabled={!config.passengerFeesEnabled}
              />
            </FieldRow>

            <FieldRow
              label="Late cancellation fee"
              hint="Charged when passenger cancels after the free window expires."
            >
              <NumberInput
                value={config.passengerCancellationFee}
                onChange={set("passengerCancellationFee")}
                min={0}
                suffix="PKR"
                disabled={!config.passengerFeesEnabled}
              />
            </FieldRow>
          </section>

          {/* ── No-Show ────────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:bg-gray-800 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Passenger No-Show
            </h2>

            <FieldRow
              label="Enable no-show fees"
              hint="Master switch — when off, driver can still report no-show but no fee is charged."
            >
              <Toggle checked={config.noShowEnabled} onChange={set("noShowEnabled")} />
            </FieldRow>

            <FieldRow
              label="Minimum wait time"
              hint="Driver must wait this many minutes at pickup before the no-show button becomes active."
            >
              <NumberInput
                value={config.noShowWaitMinutes}
                onChange={set("noShowWaitMinutes")}
                min={1}
                suffix="min"
              />
            </FieldRow>

            <FieldRow
              label="No-show fee"
              hint="Charged to the passenger when the driver reports no-show after waiting."
            >
              <NumberInput
                value={config.noShowFee}
                onChange={set("noShowFee")}
                min={0}
                suffix="PKR"
                disabled={!config.noShowEnabled}
              />
            </FieldRow>
          </section>

          {/* ── Driver Rules ───────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:bg-gray-800 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Driver Rules
            </h2>

            <FieldRow
              label="Cancellation rate flag threshold"
              hint="Driver is flagged for review when their cancellation rate exceeds this percentage."
            >
              <NumberInput
                value={config.driverCancelRateThresholdPct}
                onChange={set("driverCancelRateThresholdPct")}
                min={1}
                suffix="%"
              />
            </FieldRow>

            <FieldRow
              label="Suspend on 2nd ON_TRIP cancellation"
              hint="When enabled, a driver who cancels a second in-progress trip is automatically suspended. When off, only a warning is issued."
            >
              <Toggle
                checked={config.driverOnTripSuspendEnabled}
                onChange={set("driverOnTripSuspendEnabled")}
              />
            </FieldRow>
          </section>

        </div>
      )}

      {/* Meta */}
      {meta.updatedAt && (
        <p className="text-xs text-gray-400 text-end">
          Last saved {fmtDate(meta.updatedAt)} by {meta.updatedByEmail}
        </p>
      )}
    </div>
  );
}
