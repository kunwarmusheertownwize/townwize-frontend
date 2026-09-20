import { useEffect, useMemo, useState } from "react";
import { fetchFeatureFlags, updateFeatureFlag } from "../../../api/adminApi";

/**
 * Feature flags.
 *
 * The old screen showed a label, the raw key and a checkbox — nothing about what
 * a flag DOES, who it applies to, or whether anything reads it. Three of the
 * eight rows (pool_rides, surge_pricing, driver_auto_approval, plus their older
 * `_enabled` twins) are not read anywhere in the code, so toggling them changes
 * nothing; presented as plain switches they looked like working controls.
 *
 * So: the stored description is shown, the audience is spelled out, dead flags
 * are separated and labelled, and the switches that can affect real customers
 * ask before turning ON.
 */

/* Fallback only. The BACKEND is now the authority: it stamps
 * `payload.implemented` on every flag it returns, and refuses a toggle on one
 * that nothing reads. This list stays for older responses that predate that,
 * but it must never be the primary answer — a hardcoded copy of "what the
 * backend reads", maintained by hand in a different repo half, drifts the
 * first time someone wires a flag up and forgets this file.
 */
const WIRED = new Set(["card_payments", "public_registration", "guest_invites"]);

const isWired = (flag) =>
  typeof flag?.payload?.implemented === "boolean"
    ? flag.payload.implemented
    : WIRED.has(flag.key);

// Turning these ON changes what real people can do, so they confirm first.
// Turning them OFF is always allowed without a prompt — that is the safe direction.
const CONFIRM_ON = {
  card_payments:
    "Turn card payments ON for everyone?\n\nPassengers will be offered card at checkout. If Safepay production cards are not enabled, they hit a dead end.",
  public_registration:
    "Open registration to the public?\n\nAnyone will be able to register without a waitlist invitation. This is how the invite-only gate is removed.",
  guest_invites:
    "Allow Towners to invite guests again?\n\nEach Towner can generate 6 single-use codes, and anyone using one registers WITHOUT being on the waitlist.",
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        timeZone: "Asia/Karachi", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : null;

function Switch({ on, busy, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy || disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        on ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function FlagRow({ flag, busy, onToggle, wired }) {
  const allow = flag.payload?.allowUserIds || [];
  const on = Boolean(flag.enabled);
  const updated = fmtDate(flag.updatedAt);

  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      wired && on
        ? "border-green-200 bg-green-50/40 dark:border-green-800/60 dark:bg-green-900/10"
        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {flag.payload?.label || flag.key}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              on
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
            }`}>
              {on ? "On" : "Off"}
            </span>
            {!wired && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Not connected
              </span>
            )}
          </div>

          <p className="mt-0.5 font-mono text-[11px] text-gray-400">{flag.key}</p>

          {flag.payload?.description && (
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {flag.payload.description}
            </p>
          )}

          {!wired && (
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-amber-700 dark:text-amber-300">
              Nothing in the app reads this flag, so switching it has no effect. It is
              kept only so the setting is not lost.
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
            {wired && (
              <span>
                Applies to:{" "}
                <strong className="font-semibold text-gray-600 dark:text-gray-300">
                  {allow.length ? `${allow.length} named account${allow.length === 1 ? "" : "s"}` : "everyone"}
                </strong>
              </span>
            )}
            {updated && <span>Last changed {updated} PKT</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <Switch
            on={on}
            busy={busy}
            onChange={(next) => onToggle(flag.key, next)}
            label={flag.payload?.label || flag.key}
          />
          {busy && <span className="text-[10px] text-gray-400">saving…</span>}
        </div>
      </div>
    </div>
  );
}

export default function FeatureFlags() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const json = await fetchFeatureFlags();
      setItems(json?.data?.items || []);
    } catch (e) {
      setError(e.message || "Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onToggle = async (key, enabled) => {
    // Only ever prompts on the way ON. Switching something off in a hurry is
    // exactly what this screen is for.
    if (enabled && CONFIRM_ON[key] && !window.confirm(CONFIRM_ON[key])) return;

    setSavingKey(key);
    setError("");
    try {
      await updateFeatureFlag(key, { enabled });
      await load();
    } catch (e) {
      setError(e.message || "Failed to update feature flag");
    } finally {
      setSavingKey("");
    }
  };

  const { live, dead, onCount } = useMemo(() => {
    const live = items.filter(isWired);
    const dead = items.filter((f) => !isWired(f));
    return { live, dead, onCount: live.filter((f) => f.enabled).length };
  }, [items]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Feature Flags</h1>
        {!loading && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {onCount} of {live.length} working {live.length === 1 ? "switch" : "switches"} on
            {dead.length > 0 && ` · ${dead.length} not connected`}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Connected to the app
            </p>
            {live.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No working flags found.</p>
            ) : (
              live.map((flag) => (
                <FlagRow
                  key={flag.key}
                  flag={flag}
                  wired
                  busy={savingKey === flag.key}
                  onToggle={onToggle}
                />
              ))
            )}
          </section>

          {dead.length > 0 && (
            <section className="space-y-3 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Not connected — switching these does nothing
              </p>
              {dead.map((flag) => (
                <FlagRow
                  key={flag.key}
                  flag={flag}
                  wired={false}
                  busy={savingKey === flag.key}
                  onToggle={onToggle}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
