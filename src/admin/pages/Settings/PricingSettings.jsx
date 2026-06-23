import { useEffect, useState } from "react";
import { authFetch } from "../../../utils/authFetch";

// ─── Utilities ──────────────────────────────────────────────────────────────

const API = () => import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2";

const getP = (obj, path) =>
  path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);

const setP = (obj, path, value) => {
  const keys = path.split(".");
  const next = { ...(obj || {}) };
  let cur = next;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) { cur[k] = value; return; }
    cur[k] = { ...(cur[k] || {}) };
    cur = cur[k];
  });
  return next;
};

const flatten = (obj, prefix = "") =>
  Object.entries(obj || {}).reduce((acc, [k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(acc, flatten(v, path));
    else acc[path] = v;
    return acc;
  }, {});

const fmt = (v) => {
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  if (v == null || v === "") return "—";
  return String(v);
};

const money = (v, p = 2) => {
  const f = 10 ** p;
  return Math.round(Number(v || 0) * f) / f;
};

// Live fare preview (mirrors rideQuote.service.js logic, client-side)
const calcPreview = (cfg, { km = 5, min = 12, rideType = "PRIVATE", carType = "economy" } = {}) => {
  const tog = rideType === "RIDETOGETHER";
  const mult = tog ? 1 : (cfg.carTypeMultipliers?.[carType] || 1);
  const base = (tog ? (cfg.baseFareRideTogether || 0) : (cfg.baseFarePrivate || 0)) * mult;
  const dist = km * (tog ? (cfg.perKmRideTogether || 0) : (cfg.perKmPrivate || 0)) * mult;
  const time = cfg.perMinuteEnabled !== false
    ? min * (tog ? (cfg.perMinuteRideTogether || 0) : (cfg.perMinutePrivate || 0)) * mult
    : 0;
  const platFee = cfg.platformFeeEnabled !== false ? (cfg.platformFee || 0) : 0;
  const service = base + dist + time;
  const beforeMin = service + platFee;
  const subtotal = cfg.minimumFareEnabled !== false
    ? Math.max(cfg.globalMinimumFare || 0, beforeMin)
    : beforeMin;
  const commBase = Math.max(0, subtotal - platFee);
  const commission = cfg.commissionEnabled ? money(commBase * ((cfg.commissionPercent || 0) / 100)) : 0;
  const tax = cfg.taxEnabled ? money(subtotal * ((cfg.taxPercent || 0) / 100)) : 0;
  const step = cfg.roundingStep || 1;
  const total = Math.round((subtotal + tax) / step) * step;
  const driverEarning = Math.max(0, money(commBase - commission));
  const townwize = money(platFee + commission);
  return { base, dist, time, platFee, service, subtotal, commission, tax, total, driverEarning, townwize, minApplied: subtotal > beforeMin };
};

// ─── Components ─────────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => !disabled && onChange(!on)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-townwize-primary focus:ring-offset-1",
        on ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200",
          on ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

function Section({ title, desc, accent = "gray", tag, children }) {
  const borders = {
    gray:   "border-l-gray-300 dark:border-l-gray-600",
    green:  "border-l-green-400",
    orange: "border-l-orange-400",
    amber:  "border-l-amber-400",
    blue:   "border-l-blue-400",
    purple: "border-l-purple-400",
    teal:   "border-l-teal-400",
    indigo: "border-l-indigo-400",
    pink:   "border-l-pink-400",
    red:    "border-l-red-400",
  };
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 border-l-4 ${borders[accent]} overflow-hidden`}>
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
          {desc && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>}
        </div>
        {tag}
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function ToggleRow({ label, path, helper, profile, onChange, disabled = false }) {
  const on = Boolean(getP(profile, path));
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 ${disabled ? "opacity-40" : ""}`}>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {helper && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{helper}</p>}
      </div>
      <Toggle on={on} onChange={(v) => onChange(path, v)} disabled={disabled} />
    </div>
  );
}

function NumField({ label, path, suffix = "", helper, disabled = false, step, min = 0, profile, onChange }) {
  return (
    <div className={disabled ? "opacity-40 pointer-events-none select-none" : ""}>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={step}
          min={min}
          value={getP(profile, path) ?? ""}
          onChange={(e) => onChange(path, Number(e.target.value))}
          className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-townwize-primary"
        />
        {suffix && (
          <span className="shrink-0 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-lg whitespace-nowrap">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="text-[10px] text-gray-400 mt-1 leading-tight">{helper}</p>}
    </div>
  );
}

function Grid({ cols = 2, children }) {
  const cls = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3" }[cols] || "grid-cols-2";
  return <div className={`grid ${cls} gap-4`}>{children}</div>;
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

// ─── Fare Preview ────────────────────────────────────────────────────────────

function FarePreview({ profile }) {
  const [km, setKm] = useState(5);
  const [min, setMin] = useState(12);
  const [rideType, setRideType] = useState("PRIVATE");
  const [carType, setCarType] = useState("economy");

  const p = calcPreview(profile, { km, min, rideType, carType });
  const tog = rideType === "RIDETOGETHER";

  const Row = ({ label, value, sub, bold, accent }) => (
    <div className={`flex items-center justify-between py-1.5 ${accent ? "border-t border-gray-200 dark:border-gray-700 pt-2.5 mt-1" : ""}`}>
      <span className={`text-xs ${sub ? "text-gray-400 pl-3" : "text-gray-600 dark:text-gray-300"}`}>{label}</span>
      <span className={`text-xs font-${bold ? "bold" : "medium"} ${accent === "green" ? "text-green-600 dark:text-green-400" : accent === "orange" ? "text-orange-500" : accent === "blue" ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
        {value}
      </span>
    </div>
  );

  return (
    <Section title="Live Fare Preview" desc="Real-time estimate using current settings (mirrors backend calculation)" accent="teal">
      <Grid cols={2}>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Distance</label>
          <div className="flex items-center gap-1.5">
            <input type="number" min={0.1} step={0.5} value={km} onChange={(e) => setKm(Number(e.target.value))}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-townwize-primary" />
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-lg">km</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Duration</label>
          <div className="flex items-center gap-1.5">
            <input type="number" min={1} step={1} value={min} onChange={(e) => setMin(Number(e.target.value))}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-townwize-primary" />
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-lg">min</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Ride Type</label>
          <select value={rideType} onChange={(e) => setRideType(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary">
            <option value="PRIVATE">Private</option>
            <option value="RIDETOGETHER">RideTogether</option>
          </select>
        </div>
        {!tog && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Car Class</label>
            <select value={carType} onChange={(e) => setCarType(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary">
              <option value="economy">Economy</option>
              <option value="comfort">Comfort</option>
              <option value="xl">XL</option>
            </select>
          </div>
        )}
      </Grid>

      <div className="mt-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3">
        <Row label="Base fare" value={`PKR ${p.base.toFixed(2)}`} />
        <Row label="Distance fare" value={`PKR ${p.dist.toFixed(2)}`} sub />
        {profile.perMinuteEnabled !== false && <Row label="Time fare" value={`PKR ${p.time.toFixed(2)}`} sub />}
        {profile.platformFeeEnabled !== false && <Row label="Platform fee" value={`PKR ${p.platFee.toFixed(2)}`} sub />}
        {p.minApplied && (
          <Row label="Min fare applied" value={`→ PKR ${p.subtotal.toFixed(2)}`} sub />
        )}
        {profile.commissionEnabled && <Row label={`Commission (${profile.commissionPercent}%)`} value={`− PKR ${p.commission.toFixed(2)}`} sub />}
        {profile.taxEnabled && <Row label={`Tax (${profile.taxPercent}%)`} value={`+ PKR ${p.tax.toFixed(2)}`} sub />}

        <Row label="Passenger pays" value={`PKR ${p.total}`} bold accent="blue" />
        <Row label="Driver earns" value={`PKR ${p.driverEarning.toFixed(2)}`} bold accent="green" />
        <Row label="Townwize earns" value={`PKR ${p.townwize.toFixed(2)}`} bold accent="orange" />
      </div>
    </Section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PricingSettings() {
  const [profile, setProfile] = useState({});
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "ok" });
  const [note, setNote] = useState("");
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: "-" });
  const [simLoading, setSimLoading] = useState(false);
  const [simData, setSimData] = useState(null);
  const [simError, setSimError] = useState("");
  const [simLat, setSimLat] = useState("");
  const [simLng, setSimLng] = useState("");

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "ok" }), 3500);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/pricing`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || "Failed to load");
        if (!alive) return;
        const p = json?.data?.profile || {};
        setProfile(p); setSaved(p);
        setMeta({ updatedAt: json?.data?.meta?.updatedAt, updatedBy: json?.data?.meta?.updatedBy || "-" });
      } catch (e) {
        if (alive) showToast(e?.message || "Failed to load pricing", "err");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onChange = (key, value) => {
    setProfile((p) => setP(p, key, value));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/pricing`, {
        method: "PATCH",
        body: JSON.stringify({ profile, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to save");
      const p = json?.data?.profile || profile;
      setProfile(p); setSaved(p);
      setMeta({ updatedAt: json?.data?.meta?.updatedAt || new Date().toISOString(), updatedBy: json?.data?.meta?.updatedBy || "admin" });
      showToast(`Saved — ${json?.data?.changedCount ?? 0} field(s) updated`);
      setNote("");
    } catch (e) {
      showToast(e?.message || "Failed to save pricing", "err");
    } finally {
      setSaving(false);
    }
  };

  const runSim = async () => {
    setSimLoading(true); setSimError(""); setSimData(null);
    try {
      const params = new URLSearchParams();
      if (simLat && simLng) { params.set("pickupLat", simLat); params.set("pickupLng", simLng); }
      const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/drivers/dispatch-simulator${params.toString() ? `?${params}` : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Simulator failed");
      setSimData(json?.data || null);
    } catch (e) {
      setSimError(e?.message || "Simulator error");
    } finally {
      setSimLoading(false);
    }
  };

  const pFlat = flatten(profile);
  const sFlat = flatten(saved);
  const changed = Object.keys(pFlat).filter((k) => pFlat[k] !== sFlat[k]);
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const F = ({ label, path, suffix, helper, step, min, disabled, cols }) =>
    <NumField label={label} path={path} suffix={suffix} helper={helper} step={step} min={min}
      disabled={disabled} profile={profile} onChange={onChange} />;
  const T = ({ label, path, helper, disabled }) =>
    <ToggleRow label={label} path={path} helper={helper} disabled={disabled} profile={profile} onChange={onChange} />;

  const rtOn = profile.rideTogetherEnabled !== false;
  const commOn = Boolean(profile.commissionEnabled);
  const taxOn = Boolean(profile.taxEnabled);
  const platOn = profile.platformFeeEnabled !== false;
  const minOn = profile.minimumFareEnabled !== false;
  const perMinOn = profile.perMinuteEnabled !== false;
  const pickupWaitOn = Boolean(profile.pickupWaitChargeEnabled);
  const stopWaitOn = Boolean(profile.stopWaitChargeEnabled);
  const referralOn = profile.referralEnabled !== false;

  return (
    <div className="space-y-5 pb-28">

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold ${toast.type === "err" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pricing Settings</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Last updated {fmtDate(meta.updatedAt)} by {meta.updatedBy}
          </p>
        </div>
        {changed.length > 0 && (
          <span className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-bold">
            {changed.length} unsaved change{changed.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading pricing configuration…</div>
      ) : (
        <>
          {/* ── SECTION 1: Fare Basis ── */}
          <Section title="Fare Basis" desc="Base components added to every ride" accent="green">
            <Divider label="Base + Distance" />
            <Grid cols={2}>
              <F label="Base Fare — Private" path="baseFarePrivate" suffix="PKR" />
              <F label="Base Fare — RideTogether" path="baseFareRideTogether" suffix="PKR" disabled={!rtOn} />
              <F label="Per KM — Private" path="perKmPrivate" suffix="PKR/km" />
              <F label="Per KM — RideTogether" path="perKmRideTogether" suffix="PKR/km" disabled={!rtOn} />
            </Grid>

            <Divider label="Time-Based Charging" />
            <T label="Charge per minute" path="perMinuteEnabled"
              helper="When off, trip duration does not affect fare — distance only" />
            <Grid cols={2}>
              <F label="Per Minute — Private" path="perMinutePrivate" suffix="PKR/min" disabled={!perMinOn} />
              <F label="Per Minute — RideTogether" path="perMinuteRideTogether" suffix="PKR/min" disabled={!perMinOn || !rtOn} />
            </Grid>

            <Divider label="Minimum Fare" />
            <T label="Enforce global minimum fare" path="minimumFareEnabled"
              helper="Short trips are charged at least this amount" />
            <Grid cols={2}>
              <F label="Global Minimum Fare" path="globalMinimumFare" suffix="PKR" disabled={!minOn} />
            </Grid>
          </Section>

          {/* ── SECTION 2: Platform Revenue ── */}
          <Section
            title="Platform Revenue"
            desc="Controls how Townwize earns per ride — does not change passenger fare"
            accent="amber"
            tag={
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                INTERNAL SPLIT
              </span>
            }
          >
            <Divider label="Platform Fee" />
            <T label="Charge platform fee" path="platformFeeEnabled"
              helper="Flat fee deducted from every ride before driver earning is calculated" />
            <Grid cols={2}>
              <F label="Platform Fee" path="platformFee" suffix="PKR" disabled={!platOn}
                helper="Fixed per-ride fee. Goes to Townwize regardless of commission." />
            </Grid>

            <Divider label="Commission" />
            <T label="Deduct commission from driver earning" path="commissionEnabled"
              helper="Percentage of (fare − platform fee) kept by Townwize" />
            <Grid cols={2}>
              <F label="Commission Rate" path="commissionPercent" suffix="%" min={0} step={0.5} disabled={!commOn}
                helper="Applied to service fare after platform fee. Tracked in driver's balance ledger." />
            </Grid>

            {/* Money flow summary */}
            <div className="mt-1 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold mb-1">Money flow per completed cash ride</p>
              <p>Passenger pays → Driver collects cash (full fare)</p>
              <p>Driver owes Townwize: <strong>Platform fee + Commission %</strong> → tracked in balance ledger</p>
              <p>Driver pays back weekly via EasyPaisa / JazzCash</p>
            </div>
          </Section>

          {/* ── SECTION 3: Tax ── */}
          <Section title="Tax" desc="Passenger-facing tax added on top of the final fare" accent="red">
            <T label="Apply tax to passenger fare" path="taxEnabled"
              helper="When enabled, tax is added after minimum fare and before rounding" />
            <Grid cols={2}>
              <F label="Tax Rate" path="taxPercent" suffix="%" min={0} step={0.5} disabled={!taxOn}
                helper="Applied to the subtotal (after minimum fare check)" />
            </Grid>
          </Section>

          {/* ── SECTION 4: Car Classes ── */}
          <Section title="Car Class Multipliers" desc="How much each private ride class adjusts the base fare. 1.0 = standard price." accent="blue">
            <Grid cols={3}>
              <F label="Economy" path="carTypeMultipliers.economy" suffix="×" step={0.01} min={0.5} />
              <F label="Comfort" path="carTypeMultipliers.comfort" suffix="×" step={0.01} min={0.5} />
              <F label="XL" path="carTypeMultipliers.xl" suffix="×" step={0.01} min={0.5} />
            </Grid>
            <p className="text-xs text-gray-400 mt-1">
              These multiply base fare, per-km, and per-minute for private rides. RideTogether always uses 1.0×.
            </p>
          </Section>

          {/* ── SECTION 5: Wait Charges ── */}
          <Section title="Wait Charges" desc="Extra charges when the driver waits beyond the grace period" accent="purple">
            <Divider label="Pickup Wait" />
            <T label="Charge for pickup waiting time" path="pickupWaitChargeEnabled"
              helper="Applied only after the driver waits beyond the grace period at pickup" />
            <Grid cols={2}>
              <F label="Pickup Grace" path="pickupWaitGraceMin" suffix="min" disabled={!pickupWaitOn}
                helper="Free waiting time before charging begins" />
              <F label="Charge Rate" path="pickupWaitChargePerMin" suffix="PKR/min" disabled={!pickupWaitOn} />
            </Grid>

            <Divider label="Stop Wait" />
            <T label="Charge for stop waiting time" path="stopWaitChargeEnabled"
              helper="Applied when driver waits beyond grace period at a mid-trip stop" />
            <Grid cols={2}>
              <F label="Stop Grace" path="stopWaitGraceMin" suffix="min" disabled={!stopWaitOn} />
              <F label="Charge Rate" path="stopWaitChargePerMin" suffix="PKR/min" disabled={!stopWaitOn} />
            </Grid>
          </Section>

          {/* ── SECTION 6: RideTogether ── */}
          <Section title="RideTogether (Pooling)" desc="Controls availability and matching parameters for shared rides" accent="teal">
            <T label="RideTogether available to passengers" path="rideTogetherEnabled"
              helper="When off, passengers cannot book pooled rides" />
            <Grid cols={3}>
              <F label="Match Window" path="rideTogetherMatchWindowMinutes" suffix="min" disabled={!rtOn}
                helper="How long to wait for a co-rider match" />
              <F label="Pickup Radius" path="rideTogetherPickupRadiusKm" suffix="km" step={0.1} disabled={!rtOn}
                helper="Max distance between co-rider pickup points" />
              <F label="Dropoff Radius" path="rideTogetherDropoffRadiusKm" suffix="km" step={0.1} disabled={!rtOn}
                helper="Max distance between co-rider dropoff points" />
            </Grid>
          </Section>

          {/* ── SECTION 7: Dispatch ── */}
          <Section title="Dispatch Engine" desc="Controls how ride requests are broadcast to available drivers" accent="indigo">
            <Grid cols={2}>
              <F label="Wave Size" path="dispatchWaveSize" suffix="drivers"
                helper="Drivers notified per dispatch wave" />
              <F label="Wave Delay" path="dispatchWaveDelaySec" suffix="sec"
                helper="Wait between waves if no driver accepts" />
              <F label="Location Freshness" path="dispatchLocationFreshSec" suffix="sec"
                helper="Max age of driver location data to be considered 'online'" />
              <F label="Post-Trip Cooldown" path="dispatchPostTripCooldownSec" suffix="sec"
                helper="Pause before a driver re-enters the dispatch pool after a trip" />
              <F label="Request Lookback" path="dispatchRequestLookbackMin" suffix="min"
                helper="How far back to look for open ride requests on driver login" />
            </Grid>
          </Section>

          {/* ── SECTION 8: Referral & Coupons ── */}
          <Section title="Referral & Coupons" desc="Discount coupons issued when a referred user completes their first ride" accent="pink">
            <T label="Referral program active" path="referralEnabled"
              helper="When off, no coupons are issued for new referrals" />

            <Divider label="Passenger Coupon (fare discount)" />
            <Grid cols={2}>
              <F label="Discount" path="referralFareDiscountPct" suffix="%" disabled={!referralOn} />
              <F label="Cap" path="referralFareDiscountMaxPkr" suffix="PKR max" disabled={!referralOn} />
            </Grid>

            <Divider label="Wizer Coupon (commission discount)" />
            <Grid cols={2}>
              <F label="Discount" path="referralCommissionDiscountPct" suffix="%" disabled={!referralOn} />
              <F label="Cap" path="referralCommissionDiscountMaxPkr" suffix="PKR max" disabled={!referralOn} />
            </Grid>

            <Divider label="Expiry" />
            <Grid cols={2}>
              <F label="Coupon Validity" path="referralCouponExpiryDays" suffix="days" disabled={!referralOn} />
            </Grid>
          </Section>

          {/* ── SECTION 9: Settlement ── */}
          <Section title="Trip Settlement" desc="End-of-trip calculation guards and rounding behaviour" accent="gray">
            <Grid cols={2}>
              <F label="End Trip Guard — Min Duration" path="endTripGuardMinTime" suffix="min"
                helper="Trip must run at least this long to complete normally" />
              <F label="End Trip Guard — Min Distance" path="endTripGuardMinDistanceKm" suffix="km"
                helper="Trip must cover at least this distance to complete normally" />
              <F label="Rounding Step" path="roundingStep" suffix="PKR"
                helper="Final fare is rounded to the nearest multiple of this value" />
              <F label="Line Precision" path="linePrecision" suffix="decimals"
                helper="Decimal places used for intermediate fare calculations" />
            </Grid>
          </Section>

          {/* ── Live Fare Preview ── */}
          <FarePreview profile={profile} />

          {/* ── Dispatch Simulator ── */}
          <Section title="Dispatch Simulator" desc="Preview which drivers would receive a dispatch for a given pickup" accent="indigo">
            <Grid cols={2}>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Pickup Latitude</label>
                <input type="number" value={simLat} onChange={(e) => setSimLat(e.target.value)} placeholder="25.042722"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-townwize-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Pickup Longitude</label>
                <input type="number" value={simLng} onChange={(e) => setSimLng(e.target.value)} placeholder="67.343652"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-townwize-primary" />
              </div>
            </Grid>
            <button onClick={runSim} disabled={simLoading}
              className="px-4 py-2 rounded-xl bg-townwize-primary hover:bg-townwize-primaryDark text-white text-sm font-semibold disabled:opacity-60 transition">
              {simLoading ? "Running…" : "Run Simulator"}
            </button>
            {simError && <p className="text-sm text-red-600">{simError}</p>}
            {simData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    ["Online", simData?.counts?.onlineTotal ?? 0],
                    ["Fresh", simData?.counts?.onlineFresh ?? 0],
                    ["Verified", simData?.counts?.eligibleVerified ?? 0],
                    ["Busy", simData?.counts?.busyActiveRide ?? 0],
                    ["Dispatch Ready", simData?.counts?.dispatchReady ?? 0],
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-center">
                      <p className="text-[10px] text-gray-500">{label}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{val}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-[10px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Driver</th>
                        <th className="px-4 py-2 text-left font-semibold">Car Type</th>
                        <th className="px-4 py-2 text-left font-semibold">Distance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(simData?.rankedCandidates || []).slice(0, 10).map((c) => (
                        <tr key={c.driverId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{c.driverId}</td>
                          <td className="px-4 py-2 capitalize">{c.carType}</td>
                          <td className="px-4 py-2 text-gray-500">{c.pickupDistanceKm ?? "—"} km</td>
                        </tr>
                      ))}
                      {!(simData?.rankedCandidates?.length) && (
                        <tr><td className="px-4 py-3 text-sm text-gray-400" colSpan={3}>No dispatch-ready drivers found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Section>

          {/* Changed fields diff */}
          {changed.length > 0 && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-5 py-4 space-y-3">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-300">{changed.length} pending change{changed.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {changed.map((k) => (
                  <div key={k} className="text-xs text-amber-800 dark:text-amber-300 font-mono bg-amber-100/50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5">
                    <span className="font-semibold">{k}</span>:{" "}
                    <span className="line-through opacity-60">{fmt(sFlat[k])}</span>
                    {" → "}
                    <span className="font-bold">{fmt(pFlat[k])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Sticky Save Footer ── */}
      {!loading && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-6 py-3.5 flex items-center gap-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Change note (optional, goes to audit log)"
            className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
          />
          <button
            onClick={onSave}
            disabled={saving || changed.length === 0}
            className="shrink-0 px-5 py-2 rounded-xl bg-townwize-primary hover:bg-townwize-primaryDark text-white text-sm font-bold disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : changed.length > 0 ? `Save (${changed.length})` : "Saved ✓"}
          </button>
        </div>
      )}
    </div>
  );
}
