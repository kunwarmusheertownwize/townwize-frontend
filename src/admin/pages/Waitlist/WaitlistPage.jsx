import { useEffect, useState } from "react";
import {
  deleteWaitlistEntry, downloadWaitlistExport,
  fetchWaitlist, fetchWaitlistStats, updateWaitlistEntry, inviteWaitlistBatch,
} from "../../../api/adminApi";
import EmptyState from "../../components/common/EmptyState";

const TYPE_LABELS  = { passenger: "Towner", driver: "Wizer" };
const STATUS_META  = {
  pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  invited:  { label: "Invited",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" },
};
const TYPE_COLORS = {
  passenger: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  driver:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};
const GROUP_OPTIONS = [
  { value: "none",     label: "No Grouping" },
  { value: "type",     label: "Group by Type" },
  { value: "status",   label: "Group by Status" },
  { value: "precinct", label: "Group by Precinct" },
];

// Mirrors the server's tidy-up so a row typed as "12" reads "Precinct 12" in the
// table too. Display only — the stored value is never touched.
const showPrecinct = (value) => {
  const raw = String(value ?? "").trim();
  const m = raw.match(/^(?:precinct\s*)?(\d{1,2})\s*[-–\s]?\s*([abAB])?$/i);
  return m ? `Precinct ${m[1]}${m[2] ? `-${m[2].toUpperCase()}` : ""}` : raw;
};

const toPKT = (d) =>
  d ? new Date(d).toLocaleString("en-US", {
    timeZone: "Asia/Karachi", year: "numeric", month: "short",
    day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  }) : "—";

// ── Small reusable components ─────────────────────────────────────────────────

function Badge({ cls, label }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{label}</span>;
}

// Coloured KPI card with optional icon
function KpiCard({ label, value, sub, color = "gray", icon }) {
  const palettes = {
    gray:   { border: "border-gray-200 dark:border-gray-700", bg: "bg-white dark:bg-gray-800", val: "text-gray-900 dark:text-white", sub: "text-gray-400" },
    teal:   { border: "border-teal-200 dark:border-teal-800", bg: "bg-teal-50 dark:bg-teal-900/20", val: "text-teal-700 dark:text-teal-300", sub: "text-teal-400" },
    amber:  { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50 dark:bg-amber-900/20", val: "text-amber-700 dark:text-amber-300", sub: "text-amber-400" },
    blue:   { border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50 dark:bg-blue-900/20", val: "text-blue-700 dark:text-blue-300", sub: "text-blue-400" },
    green:  { border: "border-green-200 dark:border-green-800", bg: "bg-green-50 dark:bg-green-900/20", val: "text-green-700 dark:text-green-300", sub: "text-green-400" },
    red:    { border: "border-red-200 dark:border-red-800", bg: "bg-red-50 dark:bg-red-900/20", val: "text-red-700 dark:text-red-300", sub: "text-red-400" },
    orange: { border: "border-orange-300 dark:border-orange-700", bg: "bg-orange-50 dark:bg-orange-900/20", val: "text-orange-600 dark:text-orange-300", sub: "text-orange-400" },
    purple: { border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50 dark:bg-purple-900/20", val: "text-purple-700 dark:text-purple-300", sub: "text-purple-400" },
  };
  const p = palettes[color] || palettes.gray;
  return (
    <div className={`rounded-xl border p-4 ${p.border} ${p.bg}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {icon && <span className="text-base opacity-60">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${p.val}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${p.sub}`}>{sub}</p>}
    </div>
  );
}

// Capacity progress bar card
function CapacityCard({ label, used, limit, color = "teal", icon }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const barColor = color === "teal" ? "bg-teal-500" : "bg-purple-500";
  const remaining = limit - used;
  const urgency = pct >= 90 ? "text-red-500" : pct >= 70 ? "text-amber-500" : "text-gray-400 dark:text-gray-500";
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{icon} {label}</p>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{used} / {limit}</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-2">
        <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{pct}% filled</span>
        <span className={`text-xs font-medium ${urgency}`}>{remaining} spots left</span>
      </div>
    </div>
  );
}

/**
 * A wa.me link that opens WhatsApp with the invitation already written.
 *
 * Manual on purpose. The API route — Twilio or Meta — needs a registered
 * WhatsApp sender and a Meta-approved marketing template, which is days of
 * waiting, and the number that gets registered can never be used in the
 * normal WhatsApp app again. For a first wave of a few dozen this is one tap
 * each and nothing to configure.
 *
 * ⚠️ The link carries the RECIPIENT. Whoever it comes FROM is whichever
 * account is signed in to WhatsApp Web on this machine — intended to be the
 * support number, +92 339 4009776, on WhatsApp Business.
 *
 * ⚠️ Sending the same message to many people who do not have the number
 * saved is what WhatsApp's spam detection reacts to. Space them out.
 */
/** Bare international digits, or "" if this is not a usable Pakistani mobile. */
const waNumber = (phone) => {
  // Stored as 03XX-XXXXXXX; WhatsApp wants 92XXXXXXXXXX.
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const intl = digits.startsWith("92") ? digits : digits.replace(/^0/, "92");
  return intl.length < 11 ? "" : intl;
};

/**
 * The messages, one per situation, chosen EXPLICITLY rather than inferred.
 *
 * An earlier version picked the wording from the row on its own and got it
 * wrong: it keyed on `approvedAt`, which is written the moment somebody
 * BEGINS registering, so a Wizer who had registered successfully would have
 * been told their registration did not complete. The button now carries the
 * name of the message it will send, so a wrong choice is visible before it
 * is clicked rather than after it has been sent.
 *
 * ⚠️ None of them says WHY anything failed. The recipient has not used
 * Townwize yet, and an account of our checks failing would be their first
 * impression of it. Say what to do next, not what went wrong.
 */
const WA_MESSAGES = {
  invite: {
    label: "Invite",
    hint: "Their place is confirmed and registration is open",
    body: (g, role, url) =>
      `${g}\n\n` +
      `Your place on the Townwize waitlist is confirmed and ${role} registration is now open for you.\n\n` +
      `${url}`,
  },
  nudge: {
    label: "Nudge",
    hint: "They opened the invitation link but never began registering",
    body: (g, role, url) =>
      `${g}\n\n` +
      `We noticed you opened your ${role} invitation but have not completed your registration yet.\n\n` +
      `Your place is still held:\n\n${url}`,
  },
  continue: {
    label: "Continue",
    hint: "They began registering and did not finish",
    body: (g, role, url) =>
      `${g}\n\n` +
      `Our system recorded that your ${role} registration did not complete.\n\n` +
      `Your place is still held and you can carry on from where you left off:\n\n${url}`,
  },
};

/** A wa.me link carrying one of the messages above. */
const waLink = (entry, kind) => {
  const intl = waNumber(entry.phone);
  const msg = WA_MESSAGES[kind];
  if (!intl || !msg) return "";

  // The SAME link shape the invitation email uses, so a tap is counted by the
  // click tracking rather than vanishing.
  const role = entry.type === "driver" ? "driver" : "passenger";
  const url =
    `https://app.townwize.com/register` +
    `?invited=1&role=${role}&email=${encodeURIComponent(entry.email)}`;

  const roleLabel = entry.type === "driver" ? "Wizer" : "Towner";
  const greeting = entry.name
    ? `Greetings from Townwize, ${entry.name}.`
    : "Greetings from Townwize.";

  const text =
    msg.body(greeting, roleLabel, url) +
    `\n\nThis link is tied to your registered email address.\n\n— Townwize`;

  /* web.whatsapp.com, NOT wa.me.
   *
   * A wa.me link is handed to the installed WhatsApp DESKTOP APP when there is
   * one, and that app is signed in to whoever owns the machine — in practice a
   * personal account. The Townwize business number is signed in to WhatsApp
   * WEB, in the browser, which is also where this admin page is open.
   *
   * So wa.me sent invitations from the wrong identity. This URL stays in the
   * browser and therefore uses the account WhatsApp Web is signed in as.
   *
   * The trade-off is that this is a desktop link: on a phone web.whatsapp.com
   * will ask you to use the app instead. The waitlist admin is a desktop tool,
   * so that is the right way round. */
  return `https://web.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(text)}`;
};

/**
 * Which messages make sense for this row.
 *
 * Each condition is something the waitlist row can actually answer.
 * Deliberately NOT offered: "under review" — the waitlist does not know
 * whether somebody finished, because status "approved" means STARTED and
 * there is no join to VerificationCase. And nothing for a rejection: a
 * refusal over WhatsApp, from a number they have not saved, is the wrong
 * channel for it.
 */
const waOptions = (entry) => {
  if (!waNumber(entry.phone)) return [];
  if (entry.status === "rejected" || entry.status === "pending") return [];

  // Finished. Nothing to chase — they are waiting on a review, not on us.
  if (entry.hasAccount) return [];

  const out = [];

  /* Started and did not finish.
   *
   * `approvedAt` alone is what makes this work for people who stalled BEFORE
   * the error recording existed — it is set when somebody begins, and
   * `hasAccount` above has already excluded everyone who completed. So
   * "began, and has no account" is exactly the set worth chasing, whether or
   * not we captured a reason at the time. */
  if (entry.lastRegistrationError || entry.approvedAt) out.push("continue");
  else if (entry.inviteClickedAt) out.push("nudge");
  else out.push("invite");
  return out;
};
// Stacked horizontal bar for status distribution
function StatusBar({ totals }) {
  const all = totals?.all || 1;
  const segments = [
    { key: "pending",  label: "Pending",  color: "bg-amber-400",  pct: ((totals?.pending  || 0) / all) * 100 },
    { key: "invited",  label: "Invited",  color: "bg-blue-500",   pct: ((totals?.invited  || 0) / all) * 100 },
    { key: "approved", label: "Approved", color: "bg-green-500",  pct: ((totals?.approved || 0) / all) * 100 },
    { key: "rejected", label: "Rejected", color: "bg-red-400",    pct: ((totals?.rejected || 0) / all) * 100 },
  ].filter((s) => s.pct > 0);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Status Distribution</p>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-3">
        {segments.map((s) => (
          <div key={s.key} className={`${s.color} h-full transition-all`} style={{ width: `${s.pct}%` }}
            title={`${s.label}: ${Math.round(s.pct)}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {[
          { label: "Pending",  val: totals?.pending  || 0, dot: "bg-amber-400" },
          { label: "Invited",  val: totals?.invited  || 0, dot: "bg-blue-500" },
          { label: "Approved", val: totals?.approved || 0, dot: "bg-green-500" },
          { label: "Rejected", val: totals?.rejected || 0, dot: "bg-red-400" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className="text-xs text-gray-600 dark:text-gray-300">{s.label} <strong>{s.val}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Type split bar (Towner vs Wizer)
function TypeSplitBar({ passenger, driver }) {
  const total = (passenger?.total || 0) + (driver?.total || 0) || 1;
  const tPct = Math.round(((passenger?.total || 0) / total) * 100);
  const wPct = 100 - tPct;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Towner vs Wizer Split</p>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-3">
        <div className="bg-teal-500 h-full transition-all" style={{ width: `${tPct}%` }} title={`Towners: ${tPct}%`} />
        <div className="bg-purple-500 h-full transition-all" style={{ width: `${wPct}%` }} title={`Wizers: ${wPct}%`} />
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <span className="text-xs text-gray-600 dark:text-gray-300">Towners <strong>{passenger?.total || 0}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs text-gray-600 dark:text-gray-300">Wizers <strong>{driver?.total || 0}</strong></span>
        </div>
      </div>
    </div>
  );
}

// Top precincts horizontal bar chart
function PrecinctChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = data[0]?.count || 1;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Top Precincts</p>
      <div className="space-y-1.5">
        {data.map((row) => (
          <div key={row.precinct} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-600 dark:text-gray-300 w-24 shrink-0 truncate">{row.precinct}</span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round((row.count / max) * 100)}%`, backgroundColor: "#08110f" }} />
            </div>
            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 w-5 text-end shrink-0">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Daily signups sparkline (last 14 days)
function DailyChart({ data }) {
  if (!data || data.length === 0) return null;
  const recent = data.slice(-14);
  const max = Math.max(...recent.map((d) => d.count), 1);
  const total = recent.reduce((a, d) => a + d.count, 0);
  return (
    <div className="flex-1 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Daily Signups (last {recent.length} days)</p>
        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">{total} total</span>
      </div>
      <div className="flex items-end gap-1 flex-1 min-h-[64px]">
        {recent.map((d) => {
          const pct = Math.max(4, Math.round((d.count / max) * 100));
          const label = d.date.slice(5);
          return (
            <div key={d.date} className="flex flex-col items-center justify-end flex-1 h-full group relative" title={`${d.date}: ${d.count}`}>
              <div className="w-full rounded-t bg-teal-400 dark:bg-teal-500 hover:bg-teal-500 dark:hover:bg-teal-400 transition-colors cursor-default"
                style={{ height: `${pct}%` }} />
              <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">{d.count} on {label}</div>
                <div className="w-1.5 h-1.5 bg-gray-800 rotate-45 -mt-0.5" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">{recent[0]?.date.slice(5)}</span>
        <span className="text-[10px] text-gray-400">{recent[recent.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

// Probable duplicate people. Read-only on purpose: which address is the real
// one is a human call, and merging automatically loses the other row.
function DuplicatesCard({ groups, onSearch }) {
  if (!groups || groups.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">
        ⚠ {groups.length} possible duplicate {groups.length === 1 ? "person" : "people"} — same phone or same
        name at another domain. Each one takes a second founding spot and would get a second invitation.
      </p>
      {/* The second of a matching pair CANNOT register: phone is enforced at
          registration and they are refused with PHONE_ALREADY_REGISTERED. So
          inviting both is a guaranteed dead end for one of them, not merely a
          duplicate. Worth saying here rather than leaving it to be discovered. */}
      <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
        Only one of each pair can register — the second is refused because the mobile number is
        already taken. Invite one.
      </p>
      <div className="space-y-1.5">
        {groups.slice(0, 6).map((g, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-amber-200/70 dark:bg-amber-800/50 px-1.5 py-0.5 font-medium text-amber-900 dark:text-amber-100">
              {g.reason === "phone" ? "same phone" : "same name"}
            </span>
            {g.entries.map((e) => (
              <span key={e._id} className="inline-flex items-center gap-1">
                <button type="button" onClick={() => onSearch(e.email)}
                  className="text-amber-900 dark:text-amber-200 underline decoration-dotted">
                  {e.email}
                </button>
                {/* A Towner and a Wizer on one phone is a household sharing a
                    number. Two of the same kind is more likely one person with
                    two addresses. The banner could not tell them apart. */}
                <Badge cls={TYPE_COLORS[e.type]} label={TYPE_LABELS[e.type] || e.type} />
              </span>
            ))}
          </div>
        ))}
        {groups.length > 6 && (
          <p className="text-xs text-amber-700 dark:text-amber-300">…and {groups.length - 6} more</p>
        )}
      </div>
    </div>
  );
}

// ── Sort header ───────────────────────────────────────────────────────────────

function SortTh({ col, label, sortBy, sortOrder, onSort }) {
  const active = sortBy === col;
  return (
    <th onClick={() => onSort(col)}
      className="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none whitespace-nowrap hover:text-gray-900 dark:hover:text-white">
      <span className="flex items-center gap-1">
        {label}
        <span className="text-[10px] opacity-60">{active ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
      </span>
    </th>
  );
}

// ── Detail slide panel ────────────────────────────────────────────────────────

function DetailPanel({ entry: initial, onClose, onSaved }) {
  const [entry,   setEntry]   = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({
    name:       initial.name       || "",
    phone:      initial.phone      || "",
    precinct:   initial.precinct   || "",
    type:       initial.type,
    status:     initial.status,
    notes:      initial.notes      || "",
    suspicious: initial.suspicious || false,
  });
  const [saving, setSaving] = useState(false);
  const [ok,     setOk]     = useState("");
  const [err,    setErr]    = useState("");

  const field = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true); setOk(""); setErr("");
    try {
      const res = await updateWaitlistEntry(entry._id, form);
      setEntry(res.data);
      setOk("Saved.");
      setEditing(false);
      onSaved?.();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const toggleSuspicious = async () => {
    const next = !form.suspicious;
    setForm((f) => ({ ...f, suspicious: next }));
    try {
      const res = await updateWaitlistEntry(entry._id, { suspicious: next });
      setEntry(res.data);
      onSaved?.();
    } catch (e) { setForm((f) => ({ ...f, suspicious: !next })); setErr(e.message); }
  };

  const remove = async () => {
    if (!window.confirm("Remove this entry from the waitlist?")) return;
    try { await deleteWaitlistEntry(entry._id); onSaved?.(); onClose(); }
    catch (e) { setErr(e.message); }
  };

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">Waitlist Entry</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>

        {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
        {ok  && <p className="text-xs text-green-600 dark:text-green-400">{ok}</p>}

        <button onClick={toggleSuspicious}
          className={`w-full rounded-lg py-2 text-sm font-semibold border transition ${
            form.suspicious
              ? "bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
              : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-orange-300 hover:text-orange-600"
          }`}>
          {form.suspicious ? "⚠ Marked Suspicious — click to clear" : "Mark as Suspicious"}
        </button>

        <div className="space-y-3">
          {editing ? (
            <>
              {[["name","Name"],["phone","Phone"],["precinct","Precinct"]].map(([k, lbl]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</label>
                  <input value={form[k]} onChange={field(k)} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select value={form.type} onChange={field("type")} className={inputCls}>
                  <option value="passenger">Towner (Passenger)</option>
                  <option value="driver">Wizer (Driver)</option>
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-semibold dark:text-white">{entry.email}</p>
              {entry.name     && <p className="text-gray-500 dark:text-gray-400">{entry.name}</p>}
              {entry.phone && (
                <p className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                  <span>{entry.phone}</span>
                  {waOptions(entry).map((kind) => (
                    <a
                      key={kind}
                      href={waLink(entry, kind)}
                      /* A NAME, not _blank. Every _blank click opens another
                       * window, so working through a wave of invites buried the
                       * admin under one WhatsApp Web tab per person — each one
                       * reloading and re-syncing the whole client.
                       *
                       * A named target reuses the same tab: the second click
                       * replaces the message in the window the first one
                       * opened, and WhatsApp Web stays loaded and signed in. */
                      target="townwize-whatsapp"
                      rel="noopener noreferrer"
                      title={`WhatsApp — ${WA_MESSAGES[kind].hint}. Opens with the message written; you still press send.`}
                      className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-green-600/30 hover:bg-green-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
                    >
                      {WA_MESSAGES[kind].label}
                    </a>
                  ))}
                </p>
              )}
              {entry.precinct && <p className="text-gray-500 dark:text-gray-400">📍 {entry.precinct}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge cls={TYPE_COLORS[entry.type]}               label={TYPE_LABELS[entry.type] || entry.type} />
                <Badge cls={STATUS_META[entry.status]?.cls || ""}  label={entry.status} />
                {entry.suspicious && (
                  <Badge cls="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" label="⚠ Suspicious" />
                )}
                {entry.inviteClickedAt && (
                  <Badge
                    cls="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    label={entry.inviteClickCount > 1 ? `Clicked ×${entry.inviteClickCount}` : "Clicked"}
                  />
                )}
                {entry.lastRegistrationError && (
                  <Badge
                    cls="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    label="Registration failed"
                  />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Signed up: {toPKT(entry.createdAt)}</p>
              {entry.invitedAt  && <p className="text-xs text-gray-400">Invited: {toPKT(entry.invitedAt)}</p>}
              {entry.inviteClickedAt && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Opened the link: {toPKT(entry.inviteClickedAt)}
                  {entry.inviteLastClickedAt && entry.inviteClickCount > 1
                    ? ` · last ${toPKT(entry.inviteLastClickedAt)}`
                    : ""}
                </p>
              )}
              {/* Absence of a click is not absence of interest — the mail may
                  be unread, in spam, or simply opened on a device where the
                  link was not tapped. It is a floor, not a measurement. */}
              {entry.invitedAt && !entry.inviteClickedAt && (
                <p className="text-xs text-gray-400">Link not opened yet</p>
              )}
              {/* "Approved" is set the moment someone BEGINS registering, not
                  when an admin approves them — so on its own it says nothing
                  about whether they got through. The failure below is what
                  tells them apart. */}
              {entry.approvedAt && <p className="text-xs text-gray-400">Started registering: {toPKT(entry.approvedAt)}</p>}
              {entry.lastRegistrationError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Stopped at: <code>{entry.lastRegistrationError}</code>
                  {entry.lastRegistrationErrorAt ? ` · ${toPKT(entry.lastRegistrationErrorAt)}` : ""}
                  {entry.registrationAttempts > 1 ? ` · ${entry.registrationAttempts} attempts` : ""}
                </p>
              )}
              <p className="text-xs text-gray-400">Source: {entry.source || "landing"} · Lang: {entry.lang || "en"}</p>
            </div>
          )}
          <button onClick={() => { setEditing((v) => !v); setOk(""); setErr(""); }}
            className="text-xs text-townwize-primary dark:text-teal-400 underline">
            {editing ? "Cancel editing" : "Edit details"}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select value={form.status} onChange={field("status")} className={inputCls}>
              {["pending","invited","approved","rejected"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Admin notes</label>
            <textarea rows={3} value={form.notes} onChange={field("notes")}
              placeholder="Internal note about this subscriber..."
              className={`${inputCls} resize-none`} />
          </div>
          <button onClick={save} disabled={saving}
            className="w-full rounded-lg bg-townwize-primary py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={remove}
            className="w-full rounded-lg border border-red-300 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            Remove from waitlist
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grouping helper ───────────────────────────────────────────────────────────

function groupItems(items, groupBy) {
  if (groupBy === "none") return [{ key: null, label: null, items }];
  const map = new Map();
  items.forEach((item) => {
    const raw = item[groupBy] || "—";
    const key = groupBy === "type" ? (TYPE_LABELS[raw] || raw) : raw;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return [...map.entries()].map(([label, items]) => ({ key: label, label, items }));
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WaitlistPage() {
  const [items,          setItems]          = useState([]);
  const [stats,          setStats]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [typeFilter,     setTypeFilter]     = useState("all");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [q,              setQ]              = useState("");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [page,           setPage]           = useState(1);
  const [meta,           setMeta]           = useState({ total: 0, totalPages: 1 });
  const [sortBy,         setSortBy]         = useState("createdAt");
  const [sortOrder,      setSortOrder]      = useState("desc");
  const [groupBy,        setGroupBy]        = useState("none");
  const [selected,       setSelected]       = useState(null);
  const [exporting,      setExporting]      = useState(false);
  const [inviteCount,    setInviteCount]    = useState(25);
  const [inviteType,     setInviteType]     = useState("passenger");
  const [inviting,       setInviting]       = useState(false);
  const [inviteResult,   setInviteResult]   = useState(null);
  const [selectedIds,    setSelectedIds]    = useState(() => new Set());
  const [invitingSel,    setInvitingSel]    = useState(false);

  const load = async () => {
    // Selection is per view. Carrying it across a filter or page change means
    // inviting rows you can no longer see, which is exactly how a wave goes to
    // the wrong people.
    setSelectedIds(new Set());
    setLoading(true); setError("");
    try {
      const limitVal = groupBy !== "none" ? 1000 : 50;
      const params = { type: typeFilter, status: statusFilter, q, from: dateFrom, to: dateTo, page, limit: limitVal, sortBy, sortOrder };
      if (suspiciousOnly) params.suspicious = "true";
      const [listRes, statsRes] = await Promise.all([fetchWaitlist(params), fetchWaitlistStats()]);
      setItems(listRes?.data?.items || []);
      setMeta({ total: listRes?.data?.total || 0, totalPages: listRes?.data?.totalPages || 1 });
      setStats(statsRes?.data || null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter, suspiciousOnly, q, dateFrom, dateTo, page, sortBy, sortOrder, groupBy]);

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortOrder("asc"); }
    setPage(1);
  };

  const handleExport = async (format = "csv") => {
    setExporting(true);
    try {
      const params = { type: typeFilter, status: statusFilter, q, from: dateFrom, to: dateTo, format };
      if (suspiciousOnly) params.suspicious = "true";
      await downloadWaitlistExport(params);
    } catch (e) { alert("Export failed: " + e.message); }
    finally { setExporting(false); }
  };

  const handleInviteWave = async () => {
    // The ids are resolved here rather than server-side so the endpoint only
    // ever acts on an explicit list — "invite the next 25" computed on the
    // server is a much easier thing to fire by accident.
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await fetchWaitlist({
        type: inviteType,
        status: "pending",
        // The wave honours the signup-date range when one is set, so "invite the
        // July pool" is a range plus a count. Every other filter above the table
        // is deliberately ignored — a wave is queue order, not a search result.
        from: dateFrom,
        to: dateTo,
        sortBy: "createdAt",
        sortOrder: "asc",   // longest-waiting first
        limit: inviteCount,
        page: 1,
      });
      const ids = (res?.data?.items || []).map((i) => i._id);
      if (!ids.length) {
        setInviteResult({ message: "No pending entries match that selection." });
        return;
      }
      // Show WHO, not just how many. The table defaults to newest first while
      // the wave takes the longest waiting, so the rows on screen are not the
      // rows about to be emailed — and that is only obvious once you see them.
      const picked  = res?.data?.items || [];
      const preview = picked.slice(0, 5).map((i) => `  ${i.email}  (${toPKT(i.createdAt).split(",")[0]})`).join("\n");
      if (!window.confirm(
        `Send ${ids.length} invitation email${ids.length === 1 ? "" : "s"} to the longest-waiting ` +
        `${inviteType === "all" ? "entries" : inviteType === "driver" ? "Wizers" : "Towners"}?\n\n` +
        `${preview}${picked.length > 5 ? `\n  …and ${picked.length - 5} more` : ""}\n\n` +
        `Each recipient will be able to register immediately.`
      )) return;

      const out = await inviteWaitlistBatch(ids);
      setInviteResult({ message: out?.message || "Invitations sent.", failed: out?.data?.failed || [] });
      await load();
    } catch (e) {
      setInviteResult({ message: `Could not send invitations: ${e.message}`, failed: [] });
    } finally {
      setInviting(false);
    }
  };

  // ── Hand-picked invitations ─────────────────────────────────────────────────
  // The wave card above invites in queue order; this is the other half. Only
  // pending rows can be picked: the endpoint ignores any other status, and a
  // checkbox that silently does nothing is worse than no checkbox at all.
  const selectablePageIds = items.filter((i) => i.status === "pending").map((i) => i._id);
  const allPageSelected   = selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedIds.has(id));
  const somePageSelected  = selectablePageIds.some((id) => selectedIds.has(id));

  const toggleOne = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectablePageIds.forEach((id) => (allPageSelected ? next.delete(id) : next.add(id)));
      return next;
    });

  const handleInviteSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const rows  = items.filter((i) => selectedIds.has(i._id));
    const names = rows.slice(0, 5).map((r) => r.email).join("\n");
    if (!window.confirm(
      `Send ${ids.length} invitation email${ids.length === 1 ? "" : "s"}?\n\n${names}` +
      `${rows.length > 5 ? `\n…and ${rows.length - 5} more` : ""}\n\n` +
      `Each recipient will be able to register immediately.`
    )) return;

    setInvitingSel(true);
    setInviteResult(null);
    try {
      const out = await inviteWaitlistBatch(ids);
      setInviteResult({ message: out?.message || "Invitations sent.", failed: out?.data?.failed || [] });
      await load();
    } catch (e) {
      setInviteResult({ message: `Could not send invitations: ${e.message}`, failed: [] });
    } finally {
      setInvitingSel(false);
    }
  };

  const groups = groupItems(items, groupBy);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold dark:text-white">Early Access Waitlist</h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport("csv")} disabled={exporting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            {exporting ? "Exporting…" : "↓ CSV"}
          </button>
          <button onClick={() => handleExport("json")} disabled={exporting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            ↓ JSON
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Total Signups" value={stats.totals?.all      || 0} color="teal"   icon="👥" />
          <KpiCard label="Pending"       value={stats.totals?.pending  || 0} color="amber"  icon="⏳" />
          <KpiCard label="Invited"       value={stats.totals?.invited  || 0} color="blue"   icon="✉️" />
          <KpiCard label="Approved"      value={stats.totals?.approved || 0} color="green"  icon="✅" />
          <KpiCard label="Rejected"      value={stats.totals?.rejected || 0} color="red"    icon="🚫" />
        </div>
      )}

      {/* ── Capacity + Suspicious Row ── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CapacityCard label="Towners" used={stats.passenger?.total || 0} limit={500} color="teal"   icon="🏘" />
          <CapacityCard label="Wizers"  used={stats.driver?.total    || 0} limit={100} color="purple" icon="🚗" />
          {(stats.suspicious > 0) && (
            <KpiCard label="Flagged Suspicious" value={stats.suspicious}
              sub="Review in table below" color="orange" icon="⚠️" />
          )}
          {/* Duplicates earn a card of their own because they are not a data
              tidiness problem — each one is a founding spot that cannot become
              an account. The server now refuses to invite both halves of a
              pair, so this is the count still waiting to be resolved. */}
          {(stats.duplicates?.length > 0) && (
            <KpiCard label="Duplicate People" value={stats.duplicates.length}
              sub="Only one of each pair can register" color="amber" icon="👥" />
          )}
        </div>
      )}

      {/* ── Charts Row ── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
          <div className="flex flex-col gap-3">
            <StatusBar totals={stats.totals} />
            <DailyChart data={stats.dailySignups} />
          </div>
          <div className="space-y-3">
            <TypeSplitBar passenger={stats.passenger} driver={stats.driver} />
            <PrecinctChart data={stats.precinctDistribution} />
          </div>
        </div>
      )}

      {stats?.duplicates?.length > 0 && (
        <DuplicatesCard groups={stats.duplicates} onSearch={(email) => { setQ(email); setPage(1); }} />
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
          <option value="all">All Types</option>
          <option value="passenger">Towners</option>
          <option value="driver">Wizers</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="invited">Invited</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
          {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search email / name / precinct…"
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm w-56" />

        {/* Signed-up range. Both ends are inclusive and read in Pakistan time,
            matching the dates printed in the table. */}
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Signed up</span>
          <input type="date" value={dateFrom} max={dateTo || undefined}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            aria-label="Signed up from"
            className="rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 py-1 text-xs" />
          <span className="text-xs text-gray-400">→</span>
          <input type="date" value={dateTo} min={dateFrom || undefined}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            aria-label="Signed up to"
            className="rounded border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 py-1 text-xs" />
          {(dateFrom || dateTo) && (
            <button type="button"
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              className="text-xs text-gray-500 dark:text-gray-400 underline">clear</button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300 cursor-pointer rounded-lg border border-orange-300 dark:border-orange-700 px-3 py-2 select-none">
          <input type="checkbox" checked={suspiciousOnly} onChange={(e) => { setSuspiciousOnly(e.target.checked); setPage(1); }} />
          ⚠ Suspicious only
        </label>
      </div>

      {/* ── Invite ──
          One box, one send button. With nothing ticked it offers the queue
          ("the next 25"); once any row is ticked it becomes "invite these" and
          the queue controls step aside. Two live send buttons choosing people
          two different ways is how the wrong wave goes out. The queue settings
          are kept in state while hidden, so clearing the ticks restores them. */}
      <div className={`rounded-xl border p-4 transition-colors ${
        selectedIds.size > 0
          ? "border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}>
        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              ✓ {selectedIds.size} selected
            </span>
            <button type="button" onClick={handleInviteSelected}
              disabled={invitingSel || selectedIds.size > 50}
              className="rounded-lg bg-townwize-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {invitingSel ? "Sending…" : `Invite selected (${selectedIds.size})`}
            </button>
            <button type="button" onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-600 dark:text-gray-300 underline">Clear selection</button>
            {selectedIds.size > 50 ? (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Up to 50 at a time — untick {selectedIds.size - 50}.
              </span>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Only the ticked people will be invited. Changing a filter or page clears the ticks.
              </span>
            )}
          </div>
        ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Invite the next</label>
            <input
              type="number" min={1} max={50} value={inviteCount}
              onChange={(e) => setInviteCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Who</label>
            <select
              value={inviteType} onChange={(e) => setInviteType(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
            >
              <option value="passenger">Towners</option>
              <option value="driver">Wizers</option>
              <option value="all">Both</option>
            </select>
          </div>
          <button
            type="button"
            disabled={inviting}
            onClick={handleInviteWave}
            className="rounded-lg bg-townwize-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {inviting ? "Sending…" : "Send invitations"}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
            Takes the longest-waiting pending entries first{(dateFrom || dateTo) ? " within the signup dates set above" : ""}.
            Only those whose email sends are marked Invited. Or tick rows in the
            table to choose people yourself.
          </p>
        </div>
        )}
        {inviteResult && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            inviteResult.failed?.length
              ? "border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
              : "border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
          }`}>
            <p>{inviteResult.message}</p>
            {inviteResult.failed?.length > 0 && (
              <ul className="mt-1 list-disc ps-5 text-xs">
                {inviteResult.failed.map((f) => (
                  <li key={f.email}>{f.email} — {f.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all pending entries on this page"
                  className="cursor-pointer"
                  checked={allPageSelected}
                  // No indeterminate attribute exists in JSX — it is a DOM
                  // property only, so it has to be set on the node itself.
                  ref={(el) => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                  onChange={toggleAllOnPage}
                  disabled={selectablePageIds.length === 0}
                />
              </th>
              <SortTh col="email"     label="Email"           sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh col="name"      label="Name"            sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh col="type"      label="Type"            sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh col="precinct"  label="Precinct"        sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh col="status"    label="Status"          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th className="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300">Flags</th>
              <SortTh col="createdAt" label="Signed Up (PKT)" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="p-8">
                <EmptyState title="No entries found" description="No waitlist signups match these filters." />
              </td></tr>
            ) : groups.map((group) => (
              <>{group.label && (
                <tr key={`grp-${group.key}`} className="bg-gray-100 dark:bg-gray-700/60">
                  <td colSpan={8} className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {group.label} <span className="font-normal text-gray-400">({group.items.length})</span>
                  </td>
                </tr>
              )}
              {group.items.map((item) => (
                <tr key={item._id} onClick={() => setSelected(item)}
                  className={`border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    item.suspicious ? "bg-orange-50/40 dark:bg-orange-900/10" : ""
                  }`}>
                  {/* stopPropagation: the row opens the detail panel, and ticking
                      a box must not also slide a panel over the table. */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.email}`}
                      className="cursor-pointer disabled:cursor-not-allowed"
                      checked={selectedIds.has(item._id)}
                      onChange={() => toggleOne(item._id)}
                      disabled={item.status !== "pending"}
                      title={item.status === "pending" ? "Select for invitation" : `Already ${item.status}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium dark:text-white max-w-[180px] truncate">{item.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge cls={TYPE_COLORS[item.type]} label={TYPE_LABELS[item.type] || item.type} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{showPrecinct(item.precinct) || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge cls={STATUS_META[item.status]?.cls || ""} label={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    {item.suspicious && <span title="Flagged as suspicious" className="text-orange-500">⚠</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                    {toPKT(item.createdAt)}
                  </td>
                </tr>
              ))}</>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {groupBy === "none" && (
        <div className="flex items-center justify-between text-sm dark:text-gray-300">
          <span>Total: {meta.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-600">Prev</button>
            <span className="px-2">Page {page} / {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-600">Next</button>
          </div>
        </div>
      )}

      {selected && (
        <DetailPanel
          entry={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}
