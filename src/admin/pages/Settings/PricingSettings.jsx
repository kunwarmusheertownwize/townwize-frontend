import { useEffect, useState } from "react";
import { authFetch } from "../../../utils/authFetch";

// ─── Utilities ───────────────────────────────────────────────────────────────

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
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(acc, flatten(v, p));
    else acc[p] = v;
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

const calcPreview = (cfg, { km = 5, min = 12, rideType = "PRIVATE", carType = "economy" } = {}) => {
  const tog = rideType === "RIDETOGETHER";
  const mult = tog ? 1 : (cfg.carTypeMultipliers?.[carType] || 1);
  const base = (tog ? (cfg.baseFareRideTogether || 0) : (cfg.baseFarePrivate || 0)) * mult;
  const dist = km * (tog ? (cfg.perKmRideTogether || 0) : (cfg.perKmPrivate || 0)) * mult;
  const time = cfg.perMinuteEnabled !== false
    ? min * (tog ? (cfg.perMinuteRideTogether || 0) : (cfg.perMinutePrivate || 0)) * mult : 0;
  const platFee = cfg.platformFeeEnabled !== false ? (cfg.platformFee || 0) : 0;
  const service = base + dist + time;
  const beforeMin = service + platFee;
  const subtotal = cfg.minimumFareEnabled !== false
    ? Math.max(cfg.globalMinimumFare || 0, beforeMin) : beforeMin;
  const commBase = Math.max(0, subtotal - platFee);
  const commission = cfg.commissionEnabled ? money(commBase * ((cfg.commissionPercent || 0) / 100)) : 0;
  const tax = cfg.taxEnabled ? money(subtotal * ((cfg.taxPercent || 0) / 100)) : 0;
  const step = cfg.roundingStep || 1;
  const total = Math.round((subtotal + tax) / step) * step;
  const driverEarning = Math.max(0, money(commBase - commission));
  const townwize = money(platFee + commission);
  return { base, dist, time, platFee, service, subtotal, commission, tax, total, driverEarning, townwize, minApplied: subtotal > beforeMin };
};

// ─── Shared Components ───────────────────────────────────────────────────────

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
      <span className={[
        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200",
        on ? "translate-x-5" : "translate-x-0",
      ].join(" ")} />
    </button>
  );
}

function Card({ title, desc, accent = "gray", tag, children }) {
  const borders = {
    gray: "border-l-gray-300 dark:border-l-gray-600",
    green: "border-l-green-400", orange: "border-l-orange-400", amber: "border-l-amber-400",
    blue: "border-l-blue-400", purple: "border-l-purple-400", teal: "border-l-teal-400",
    indigo: "border-l-indigo-400", pink: "border-l-pink-400", red: "border-l-red-400",
  };
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 border-l-4 ${borders[accent]} overflow-hidden`}>
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 dark:border-gray-800 flex items-center justify-between gap-3">
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
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number" step={step} min={min}
          value={getP(profile, path) ?? ""}
          onChange={(e) => onChange(path, Number(e.target.value))}
          className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-townwize-primary"
        />
        {suffix && <span className="shrink-0 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-lg whitespace-nowrap">{suffix}</span>}
      </div>
      {helper && <p className="text-[10px] text-gray-400 mt-1 leading-tight">{helper}</p>}
    </div>
  );
}

function Grid({ cols = 2, children }) {
  const cls = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3" }[cols];
  return <div className={`grid ${cls || "grid-cols-2"} gap-4`}>{children}</div>;
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700 dark:bg-gray-800" />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700 dark:bg-gray-800" />
    </div>
  );
}

// ─── Live Fare Preview (floating panel) ──────────────────────────────────────

function FarePreviewPanel({ profile, open, onToggle }) {
  const [km, setKm] = useState(5);
  const [min, setMin] = useState(12);
  const [rideType, setRideType] = useState("PRIVATE");
  const [carType, setCarType] = useState("economy");

  const p = calcPreview(profile, { km, min, rideType, carType });
  const tog = rideType === "RIDETOGETHER";

  return (
    <div className="fixed bottom-16 right-4 z-40 w-[320px]">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="ml-auto mb-1 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg transition"
      >
        <span>{open ? "▾ Fare Preview" : "▸ Fare Preview"}</span>
        {!open && <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-900/20 text-[10px]">live</span>}
      </button>

      {open && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
          {/* Inputs */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 dark:border-gray-800 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Distance</label>
              <div className="flex items-center gap-1">
                <input type="number" min={0.1} step={0.5} value={km} onChange={(e) => setKm(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-townwize-primary" />
                <span className="text-[10px] text-gray-400 shrink-0">km</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Duration</label>
              <div className="flex items-center gap-1">
                <input type="number" min={1} step={1} value={min} onChange={(e) => setMin(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-townwize-primary" />
                <span className="text-[10px] text-gray-400 shrink-0">min</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Ride Type</label>
              <select value={rideType} onChange={(e) => setRideType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-townwize-primary">
                <option value="PRIVATE">Private</option>
                <option value="RIDETOGETHER">RideTogether</option>
              </select>
            </div>
            {!tog && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Car Class</label>
                <select value={carType} onChange={(e) => setCarType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-townwize-primary">
                  <option value="economy">Economy</option>
                  <option value="comfort">Comfort</option>
                  <option value="xl">XL</option>
                </select>
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="px-4 py-3 space-y-1 text-xs">
            <PvRow label="Base fare" value={p.base} />
            <PvRow label="Distance" value={p.dist} sub />
            {profile.perMinuteEnabled !== false && <PvRow label="Time" value={p.time} sub />}
            {profile.platformFeeEnabled !== false && <PvRow label="Platform fee" value={p.platFee} sub />}
            {p.minApplied && <PvRow label="Min fare applied" value={p.subtotal} sub note="→" />}
            {profile.commissionEnabled && <PvRow label={`Commission ${profile.commissionPercent}%`} value={-p.commission} sub />}
            {profile.taxEnabled && <PvRow label={`Tax ${profile.taxPercent}%`} value={p.tax} sub />}
          </div>

          {/* Result */}
          <div className="border-t border-gray-100 dark:border-gray-700 dark:border-gray-800 px-4 py-3 space-y-1.5">
            <div className="flex justify-between font-bold text-sm">
              <span className="text-gray-700 dark:text-gray-300 dark:text-gray-200">Passenger pays</span>
              <span className="text-blue-600 dark:text-blue-400">PKR {p.total}</span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-gray-500 dark:text-gray-400">Driver earns</span>
              <span className="text-green-600 dark:text-green-400">PKR {p.driverEarning.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-gray-500 dark:text-gray-400">Townwize earns</span>
              <span className="text-orange-500">PKR {p.townwize.toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PvRow({ label, value, sub, note }) {
  const positive = value >= 0;
  return (
    <div className={`flex justify-between ${sub ? "pl-3 text-gray-400" : "text-gray-600 dark:text-gray-300"}`}>
      <span>{label}</span>
      <span className={positive ? "" : "text-red-500"}>
        {note && `${note} `}{!positive && "−"}PKR {Math.abs(value).toFixed(2)}
      </span>
    </div>
  );
}

// ─── Tab Definitions ─────────────────────────────────────────────────────────

const TABS = [
  { id: "fares",     label: "Fares",     icon: "PKR" },
  { id: "revenue",   label: "Revenue",   icon: "%" },
  { id: "operations",label: "Operations",icon: "⏱" },
  { id: "pooling",   label: "Pooling",   icon: "⇄" },
  { id: "dispatch",  label: "Dispatch",  icon: "📡" },
  { id: "referral",  label: "Referral",  icon: "🎁" },
];

// ─── Tab Content ─────────────────────────────────────────────────────────────

function TabFares({ profile, onChange }) {
  const perMinOn = profile.perMinuteEnabled !== false;
  const minOn = profile.minimumFareEnabled !== false;
  const rtOn = profile.rideTogetherEnabled !== false;
  const F = (props) => <NumField {...props} profile={profile} onChange={onChange} />;
  const T = (props) => <ToggleRow {...props} profile={profile} onChange={onChange} />;
  return (
    <div className="space-y-4">
      <Card title="Base Fares" desc="Fixed amount added at the start of every trip" accent="green">
        <Grid cols={2}>
          <F label="Private" path="baseFarePrivate" suffix="PKR" />
          <F label="RideTogether" path="baseFareRideTogether" suffix="PKR" disabled={!rtOn} />
        </Grid>
      </Card>

      <Card title="Distance Rate" desc="Fare added per kilometre driven" accent="green">
        <Grid cols={2}>
          <F label="Private" path="perKmPrivate" suffix="PKR/km" />
          <F label="RideTogether" path="perKmRideTogether" suffix="PKR/km" disabled={!rtOn} />
        </Grid>
      </Card>

      <Card title="Time Rate" desc="Fare added per minute of trip duration" accent="green">
        <T label="Charge per minute" path="perMinuteEnabled"
          helper="Off = distance-only pricing" />
        <Grid cols={2}>
          <F label="Private" path="perMinutePrivate" suffix="PKR/min" disabled={!perMinOn} />
          <F label="RideTogether" path="perMinuteRideTogether" suffix="PKR/min" disabled={!perMinOn || !rtOn} />
        </Grid>
      </Card>

      <Card title="Car Class Multipliers" desc="How each private ride class scales the base fare. 1.0 = standard. RideTogether always 1.0×." accent="blue">
        <Grid cols={3}>
          <F label="Economy" path="carTypeMultipliers.economy" suffix="×" step={0.01} min={0.5} />
          <F label="Comfort" path="carTypeMultipliers.comfort" suffix="×" step={0.01} min={0.5} />
          <F label="XL" path="carTypeMultipliers.xl" suffix="×" step={0.01} min={0.5} />
        </Grid>
      </Card>

      <Card title="Minimum Fare" desc="Floor applied after all components are summed" accent="green">
        <T label="Enforce minimum fare" path="minimumFareEnabled"
          helper="Short trips charge at least this amount" />
        <Grid cols={2}>
          <F label="Minimum Fare" path="globalMinimumFare" suffix="PKR" disabled={!minOn} />
        </Grid>
      </Card>
    </div>
  );
}

function TabRevenue({ profile, onChange }) {
  const platOn = profile.platformFeeEnabled !== false;
  const commOn = Boolean(profile.commissionEnabled);
  const taxOn = Boolean(profile.taxEnabled);
  const F = (props) => <NumField {...props} profile={profile} onChange={onChange} />;
  const T = (props) => <ToggleRow {...props} profile={profile} onChange={onChange} />;
  return (
    <div className="space-y-4">
      <Card
        title="Platform Fee"
        desc="Flat fee deducted from every ride. Goes to Townwize before commission is calculated."
        accent="amber"
      >
        <T label="Charge platform fee" path="platformFeeEnabled" />
        <Grid cols={2}>
          <F label="Platform Fee" path="platformFee" suffix="PKR" disabled={!platOn} />
        </Grid>
      </Card>

      <Card
        title="Commission"
        desc="Percentage of (fare − platform fee) kept by Townwize. Does not change passenger fare."
        accent="amber"
        tag={<span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">INTERNAL SPLIT</span>}
      >
        <T label="Deduct commission from driver earning" path="commissionEnabled"
          helper="Tracked in driver's cash balance ledger — collected via EasyPaisa/JazzCash weekly" />
        <Grid cols={2}>
          <F label="Commission Rate" path="commissionPercent" suffix="%" min={0} step={0.5} disabled={!commOn} />
        </Grid>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <p className="font-semibold">Cash commission flow</p>
          <p>Passenger pays driver in cash → driver owes Townwize: <strong>platform fee + commission %</strong> → deducted from driver balance ledger → driver pays back via EasyPaisa</p>
        </div>
      </Card>

      <Card title="Tax" desc="Passenger-facing tax added on top of the final fare" accent="red">
        <T label="Apply tax to passenger fare" path="taxEnabled"
          helper="Added after minimum fare check, before rounding" />
        <Grid cols={2}>
          <F label="Tax Rate" path="taxPercent" suffix="%" min={0} step={0.5} disabled={!taxOn} />
        </Grid>
      </Card>
    </div>
  );
}

function TabOperations({ profile, onChange }) {
  const pickupOn = Boolean(profile.pickupWaitChargeEnabled);
  const stopOn = Boolean(profile.stopWaitChargeEnabled);
  const F = (props) => <NumField {...props} profile={profile} onChange={onChange} />;
  const T = (props) => <ToggleRow {...props} profile={profile} onChange={onChange} />;
  return (
    <div className="space-y-4">
      <Card title="Pickup Wait Charge" desc="Extra charge when driver waits beyond grace period at pickup" accent="purple">
        <T label="Charge for pickup waiting time" path="pickupWaitChargeEnabled" />
        <Grid cols={2}>
          <F label="Grace Period" path="pickupWaitGraceMin" suffix="min" disabled={!pickupOn}
            helper="Free wait before charges begin" />
          <F label="Charge Rate" path="pickupWaitChargePerMin" suffix="PKR/min" disabled={!pickupOn} />
        </Grid>
      </Card>

      <Card title="Stop Wait Charge" desc="Extra charge when driver waits beyond grace period at a mid-trip stop" accent="purple">
        <T label="Charge for stop waiting time" path="stopWaitChargeEnabled" />
        <Grid cols={2}>
          <F label="Grace Period" path="stopWaitGraceMin" suffix="min" disabled={!stopOn} />
          <F label="Charge Rate" path="stopWaitChargePerMin" suffix="PKR/min" disabled={!stopOn} />
        </Grid>
      </Card>

      <Card title="Trip Settlement" desc="Guards and rounding applied when a trip completes" accent="gray">
        <Grid cols={2}>
          <F label="End Trip Guard — Min Duration" path="endTripGuardMinTime" suffix="min"
            helper="Trip must run at least this long to complete normally" />
          <F label="End Trip Guard — Min Distance" path="endTripGuardMinDistanceKm" suffix="km"
            helper="Trip must cover at least this distance" />
          <F label="Rounding Step" path="roundingStep" suffix="PKR"
            helper="Final fare rounds to nearest multiple of this" />
          <F label="Line Precision" path="linePrecision" suffix="decimals"
            helper="Decimal places for intermediate fare calculations" />
        </Grid>
      </Card>
    </div>
  );
}

function TabPooling({ profile, onChange }) {
  const rtOn = profile.rideTogetherEnabled !== false;
  const F = (props) => <NumField {...props} profile={profile} onChange={onChange} />;
  const T = (props) => <ToggleRow {...props} profile={profile} onChange={onChange} />;
  return (
    <div className="space-y-4">
      <Card title="RideTogether Mode" desc="Controls pooled ride availability and matching behaviour" accent="teal">
        <T label="RideTogether available to passengers" path="rideTogetherEnabled"
          helper="When off, passengers cannot book pooled rides" />
      </Card>

      <Card title="Matching Parameters" desc="How broadly the system searches for compatible co-riders" accent="teal">
        <Grid cols={3}>
          <F label="Match Window" path="rideTogetherMatchWindowMinutes" suffix="min" disabled={!rtOn}
            helper="How long to wait for a co-rider match" />
          <F label="Pickup Radius" path="rideTogetherPickupRadiusKm" suffix="km" step={0.1} disabled={!rtOn}
            helper="Max distance between co-rider pickup points" />
          <F label="Dropoff Radius" path="rideTogetherDropoffRadiusKm" suffix="km" step={0.1} disabled={!rtOn}
            helper="Max distance between co-rider dropoff points" />
        </Grid>
      </Card>

      <Card title="RideTogether Fares" desc="These are set on the Fares tab — shown here for reference" accent="gray">
        <Grid cols={2}>
          <F label="Base Fare" path="baseFareRideTogether" suffix="PKR" disabled={!rtOn} />
          <F label="Per KM" path="perKmRideTogether" suffix="PKR/km" disabled={!rtOn} />
          <F label="Per Minute" path="perMinuteRideTogether" suffix="PKR/min" disabled={!rtOn || profile.perMinuteEnabled === false} />
        </Grid>
      </Card>
    </div>
  );
}

function TabDispatch({ profile, onChange }) {
  const [simLoading, setSimLoading] = useState(false);
  const [simData, setSimData] = useState(null);
  const [simError, setSimError] = useState("");
  const [simLat, setSimLat] = useState("");
  const [simLng, setSimLng] = useState("");

  const F = (props) => <NumField {...props} profile={profile} onChange={onChange} />;

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

  return (
    <div className="space-y-4">
      <Card title="Dispatch Engine" desc="Controls how ride requests are broadcast to available drivers" accent="indigo">
        <Grid cols={2}>
          <F label="Wave Size" path="dispatchWaveSize" suffix="drivers"
            helper="Drivers notified per dispatch wave" />
          <F label="Wave Delay" path="dispatchWaveDelaySec" suffix="sec"
            helper="Wait between waves if no driver accepts" />
          <F label="Location Freshness" path="dispatchLocationFreshSec" suffix="sec"
            helper="Max age of driver location data to count as online" />
          <F label="Post-Trip Cooldown" path="dispatchPostTripCooldownSec" suffix="sec"
            helper="Pause before a driver re-enters the dispatch pool" />
          <F label="Request Lookback" path="dispatchRequestLookbackMin" suffix="min"
            helper="How far back to look for open requests when driver comes online" />
        </Grid>
      </Card>

      <Card title="Dispatch Simulator" desc="Preview which drivers would receive a dispatch for a given pickup" accent="indigo">
        <Grid cols={2}>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Pickup Latitude</label>
            <input type="number" value={simLat} onChange={(e) => setSimLat(e.target.value)} placeholder="25.042722"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-townwize-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Pickup Longitude</label>
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
              {[["Online", simData?.counts?.onlineTotal], ["Fresh", simData?.counts?.onlineFresh],
                ["Verified", simData?.counts?.eligibleVerified], ["Busy", simData?.counts?.busyActiveRide],
                ["Ready", simData?.counts?.dispatchReady]].map(([label, val]) => (
                <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{val ?? 0}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Driver</th>
                    <th className="px-4 py-2 text-left font-semibold">Car Type</th>
                    <th className="px-4 py-2 text-left font-semibold">Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(simData?.rankedCandidates || []).slice(0, 10).map((c) => (
                    <tr key={c.driverId} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400 dark:text-gray-300">{c.driverId}</td>
                      <td className="px-4 py-2 capitalize">{c.carType}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{c.pickupDistanceKm ?? "—"} km</td>
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
      </Card>
    </div>
  );
}

function TabReferral({ profile, onChange }) {
  const refOn = profile.referralEnabled !== false;
  const F = (props) => <NumField {...props} profile={profile} onChange={onChange} />;
  const T = (props) => <ToggleRow {...props} profile={profile} onChange={onChange} />;
  return (
    <div className="space-y-4">
      <Card title="Referral Program" desc="Discount coupons issued when a referred user completes their first ride" accent="pink">
        <T label="Referral program active" path="referralEnabled"
          helper="When off, no new coupons are issued for referrals" />
      </Card>

      <Card title="Passenger Coupon" desc="Fare discount for the newly referred passenger" accent="pink">
        <Grid cols={2}>
          <F label="Discount Rate" path="referralFareDiscountPct" suffix="%" disabled={!refOn} />
          <F label="Cap" path="referralFareDiscountMaxPkr" suffix="PKR max" disabled={!refOn} />
        </Grid>
      </Card>

      <Card title="Wizer Coupon" desc="Commission discount for the referring driver (Wizer)" accent="pink">
        <Grid cols={2}>
          <F label="Discount Rate" path="referralCommissionDiscountPct" suffix="%" disabled={!refOn} />
          <F label="Cap" path="referralCommissionDiscountMaxPkr" suffix="PKR max" disabled={!refOn} />
        </Grid>
      </Card>

      <Card title="Coupon Expiry" accent="pink">
        <Grid cols={2}>
          <F label="Validity" path="referralCouponExpiryDays" suffix="days" disabled={!refOn}
            helper="Days before an issued coupon expires" />
        </Grid>
      </Card>
    </div>
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
  const [activeTab, setActiveTab] = useState("fares");
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const onChange = (key, value) => setProfile((p) => setP(p, key, value));

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

  const pFlat = flatten(profile);
  const sFlat = flatten(saved);
  const changed = Object.keys(pFlat).filter((k) => pFlat[k] !== sFlat[k]);
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "—";

  // Which tabs have unsaved changes (for badge indicators)
  const tabFields = {
    fares:      ["baseFarePrivate","baseFareRideTogether","perKmPrivate","perKmRideTogether","perMinutePrivate","perMinuteRideTogether","perMinuteEnabled","minimumFareEnabled","globalMinimumFare","carTypeMultipliers.economy","carTypeMultipliers.comfort","carTypeMultipliers.xl"],
    revenue:    ["platformFeeEnabled","platformFee","commissionEnabled","commissionPercent","taxEnabled","taxPercent"],
    operations: ["pickupWaitChargeEnabled","pickupWaitGraceMin","pickupWaitChargePerMin","stopWaitChargeEnabled","stopWaitGraceMin","stopWaitChargePerMin","endTripGuardMinTime","endTripGuardMinDistanceKm","roundingStep","linePrecision"],
    pooling:    ["rideTogetherEnabled","rideTogetherMatchWindowMinutes","rideTogetherPickupRadiusKm","rideTogetherDropoffRadiusKm"],
    dispatch:   ["dispatchWaveSize","dispatchWaveDelaySec","dispatchLocationFreshSec","dispatchPostTripCooldownSec","dispatchRequestLookbackMin"],
    referral:   ["referralEnabled","referralFareDiscountPct","referralFareDiscountMaxPkr","referralCommissionDiscountPct","referralCommissionDiscountMaxPkr","referralCouponExpiryDays"],
  };
  const tabChanges = Object.fromEntries(
    Object.entries(tabFields).map(([tab, fields]) => [tab, fields.filter((f) => changed.includes(f)).length])
  );

  const renderTab = () => {
    if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>;
    const props = { profile, onChange };
    switch (activeTab) {
      case "fares":      return <TabFares {...props} />;
      case "revenue":    return <TabRevenue {...props} />;
      case "operations": return <TabOperations {...props} />;
      case "pooling":    return <TabPooling {...props} />;
      case "dispatch":   return <TabDispatch {...props} />;
      case "referral":   return <TabReferral {...props} />;
      default:           return null;
    }
  };

  return (
    <div className="pb-24">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold ${toast.type === "err" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pricing Settings</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Last updated {fmtDate(meta.updatedAt)} · by {meta.updatedBy}
          </p>
        </div>
        {changed.length > 0 && (
          <span className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-bold">
            {changed.length} unsaved change{changed.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-700 dark:bg-gray-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const n = tabChanges[tab.id] || 0;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150",
                active
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200",
              ].join(" ")}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
              {n > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-amber-400 text-[9px] font-bold text-white px-1">
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {renderTab()}

      {/* Pending changes diff */}
      {!loading && changed.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-5 py-4 space-y-3">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
            {changed.length} pending change{changed.length !== 1 ? "s" : ""} across all tabs
          </p>
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

      {/* Live Fare Preview (floating) */}
      {!loading && <FarePreviewPanel profile={profile} open={previewOpen} onToggle={() => setPreviewOpen((v) => !v)} />}

      {/* Sticky save footer */}
      {!loading && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-6 py-3 flex items-center gap-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Change note for audit log (optional)"
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
