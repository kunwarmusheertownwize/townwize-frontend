import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * "Confirm your precinct" — opened from the waitlist email, no login.
 *
 * Sixteen early signups have no usable area: they either predate the landing
 * page's "Other" fix or left it blank. Two rounds of "reply with your precinct"
 * in July moved 5 of 20, because replying to an email on a phone is work. This
 * is one tap and a Save.
 *
 * The link carries the address plus a signature the server checks, so nobody
 * can edit anyone else's row, and there is nothing to log into.
 */

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2";
const OTHER = "__other__";

export default function ConfirmPrecinct() {
  const [params] = useSearchParams();
  const email = (params.get("e") || "").trim();
  const token = (params.get("t") || "").trim();

  const [state, setState] = useState("loading"); // loading | ready | saving | done | error
  const [error, setError] = useState("");
  const [info, setInfo] = useState({ role: "", precincts: [], precinct: "" });
  const [choice, setChoice] = useState("");
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email || !token) { setState("error"); setError("This link is incomplete. Please open the link from your email again."); return; }
      try {
        const res = await fetch(`${API}/waitlist/precinct?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body?.success) {
          setState("error");
          setError(body?.message || "This link is not valid. Please use the link from your email.");
          return;
        }
        setInfo(body.data);
        if (body.data.precinct) setChoice(body.data.precinct);
        setState("ready");
      } catch {
        if (!cancelled) { setState("error"); setError("We could not reach Townwize. Please check your connection and try again."); }
      }
    })();
    return () => { cancelled = true; };
  }, [email, token]);

  const save = useCallback(async () => {
    const precinct = choice === OTHER ? otherText.trim() : choice;
    if (!precinct || precinct.length < 2) { setError("Please choose your area, or type it if it is not listed."); return; }
    setState("saving"); setError("");
    try {
      const res = await fetch(`${API}/waitlist/precinct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e: email, t: token, precinct }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        setState("ready");
        setError(body?.message || "We could not save that. Please try again.");
        return;
      }
      setInfo((i) => ({ ...i, precinct: body.data.precinct }));
      setState("done");
    } catch {
      setState("ready");
      setError("We could not reach Townwize. Please check your connection and try again.");
    }
  }, [choice, otherText, email, token]);

  const shell = (children) => (
    <div className="min-h-screen bg-[#F8FAFB] px-4 py-10 dark:bg-[#071A20]">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-5 text-center">
          <img src="/images/logo-dark.png" alt="Townwize" className="mx-auto h-7 dark:hidden" />
          <img src="/images/logo-light.png" alt="Townwize" className="mx-auto hidden h-7 dark:block" />
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[2px] text-townwize-accent">Early Access Waitlist</p>
        </div>
        {children}
      </div>
    </div>
  );

  if (state === "loading") return shell(<p className="py-8 text-center text-sm text-gray-500">Checking your link…</p>);

  if (state === "error") return shell(
    <div className="text-center">
      <h1 className="text-lg font-bold text-gray-900 dark:text-white">We couldn't open this link</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
      <p className="mt-4 text-xs text-gray-400">
        Still stuck? Reply to the email, or write to{" "}
        <a className="font-semibold text-townwize-primary underline dark:text-townwize-accent" href="mailto:waitlist@townwize.com">waitlist@townwize.com</a>.
      </p>
    </div>
  );

  if (state === "done") return shell(
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-2xl dark:bg-teal-900/40">✓</div>
      <h1 className="text-lg font-bold text-gray-900 dark:text-white">You're confirmed</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        We've saved <strong>{info.precinct}</strong> for {email}. Your Early Access spot is secured, and we'll be in touch when your area opens.
      </p>
      <button
        type="button"
        onClick={() => { setState("ready"); }}
        className="mt-5 text-xs font-medium text-gray-400 underline underline-offset-2 hover:text-townwize-primary"
      >
        Change it
      </button>
    </div>
  );

  return shell(
    <>
      <h1 className="text-lg font-bold text-gray-900 dark:text-white">Confirm your area</h1>
      {/* Say what actually happened. Telling someone their area "was missing"
          when they did answer — they chose "Other / Not Listed" — reads as our
          mistake being blamed on them. */}
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        {info.reason === "other"
          ? "Your area was recorded as “Other / Not Listed” when you signed up, so we still don’t know where you live."
          : "Your area was missing from your signup."}{" "}
        We’re releasing Early Access precinct by precinct, so pick yours below to keep your place.
      </p>
      <p className="mt-2 text-xs text-gray-400">Signed up as {email}{info.role ? ` · ${info.role}` : ""}</p>

      <label className="mt-5 block text-xs font-medium text-gray-500 dark:text-gray-400">Your area in Bahria Town Karachi</label>
      <select
        value={choice}
        onChange={(e) => { setChoice(e.target.value); setError(""); }}
        className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        <option value="" disabled>Select your precinct…</option>
        {info.precincts.map((p) => <option key={p} value={p}>{p}</option>)}
        <option value={OTHER}>Other / not listed</option>
      </select>

      {choice === OTHER && (
        <input
          value={otherText}
          onChange={(e) => { setOtherText(e.target.value); setError(""); }}
          placeholder="Type your area or block name"
          className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      )}

      {error && <p className="mt-2 text-xs !text-townwize-error">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={state === "saving" || !choice}
        className="mt-5 w-full rounded-xl bg-townwize-primary py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {state === "saving" ? "Saving…" : "Save my area"}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
        Only your area is saved. Nothing else about your account changes.
      </p>
    </>
  );
}
