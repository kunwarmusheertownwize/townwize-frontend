import { useFormContext } from "react-hook-form";

// Kept in step with the password rules in validation/fields.js. If one changes
// and the other does not, the form goes back to asking for something it never
// checks — which is what this replaced.
const passwordRules = [
  { label: "8+ characters", test: (v) => v.length >= 8 },
  { label: "letter",        test: (v) => /[A-Za-z]/.test(v) },
  { label: "number",        test: (v) => /\d/.test(v) },
  { label: "symbol",        test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function AccountInfo({ register, errors, showPhone = true, google = null, invitedEmail = "" }) {
  // Locked for Google (the server checks the verified address) and for an
  // invitation (the gate matches this exact address). readOnly also keeps
  // browser autofill from swapping in a different saved address.
  const emailLocked = Boolean(google) || Boolean(invitedEmail);
  const { watch, setValue } = useFormContext();
  const phoneField = register("phone");
  const phoneValue = watch("phone") || "";
  const passwordValue = watch("password") || "";

  const formatPakPhoneInput = (value) => {
    const raw = String(value || "").trim();
    const keep = raw.replace(/[^\d+]/g, "");

    // International format (+92...)
    if (keep.startsWith("+92")) {
      const rest = keep.slice(3).replace(/\D/g, "").slice(0, 10);
      const p1 = rest.slice(0, 3);
      const p2 = rest.slice(3);
      return p2 ? `+92 ${p1} ${p2}` : `+92 ${p1}`;
    }

    // International without plus (92...)
    if (keep.startsWith("92")) {
      const rest = keep.slice(2).replace(/\D/g, "").slice(0, 10);
      const p1 = rest.slice(0, 3);
      const p2 = rest.slice(3);
      return p2 ? `+92 ${p1} ${p2}` : `+92 ${p1}`;
    }

    // Local format (03XX-XXXXXXX)
    let digits = keep.replace(/\D/g, "");
    if (digits.startsWith("3")) digits = `0${digits}`;
    digits = digits.slice(0, 11);
    const a = digits.slice(0, 4);
    const b = digits.slice(4);
    return b ? `${a}-${b}` : a;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPakPhoneInput(e.target.value);
    setValue("phone", formatted, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4 w-full">

      {/* Name */}
      <div>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Full Name
        </label>
        <input
          {...register("name")}
          className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
          placeholder="Your Name"
        />
        {errors.name && (
          <p className="text-xs !text-townwize-error mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Email
        </label>
        <input
          type="email"
          {...register("email")}
          readOnly={emailLocked}
          className={`mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none ${
            emailLocked
              ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-gray-50 dark:bg-gray-700"
          }`}
          placeholder="you@example.com"
        />
        {/* Locked: the server checks this against the address Google verified,
            so editing it here could only fail at submit. */}
        {google && (
          <p className="mt-1 text-xs text-gray-400">Verified by Google — cannot be changed.</p>
        )}
        {!google && invitedEmail && (
          <p className="mt-1 text-xs text-gray-400">This is the address your invitation was sent to.</p>
        )}
        {errors.email && (
          <p className="text-xs !text-townwize-error mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Phone — hidden in wizard (collected in OTP step) */}
      {showPhone && (
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">
            Phone
          </label>
          <input
            type="tel"
            name={phoneField.name}
            ref={phoneField.ref}
            onBlur={phoneField.onBlur}
            onChange={handlePhoneChange}
            value={phoneValue}
            className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
            placeholder="0300-1234567"
            inputMode="tel"
            maxLength={16}
          />
          {errors.phone && (
            <p className="text-xs !text-townwize-error  mt-1">{errors.phone.message}</p>
          )}
        </div>
      )}

      {/* Password — omitted entirely when Google owns the credential. Asking
          someone to invent a password they will never use is exactly the
          friction this path removes. "Forgot password" can set one later if
          they ever want to sign in without Google. */}
      {google ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Signing up with Google
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            No password needed — you'll sign in with Google.
          </p>
        </div>
      ) : (
        <div>
          <label
            htmlFor="password"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            aria-label="Password"
            {...register("password")}
            className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
            placeholder="Strong Password"
          />
          {/* One line, not a stacked list — this sits under every password
              field and a four-row checklist pushed the form around.
              It replaced a static grey sentence that promised rules nothing
              enforced and looked identical for "aaaa" and a strong password.
              Per-rule colour means a failure says WHICH rule; a single red
              line cannot. */}
          {/* Spacing is inline, not gap-x-2: on the live site the utility was
              not applied and the rules ran together ("8+ characters• letter").
              An inline style does not depend on which classes the CSS build kept. */}
          <p
            className="mt-1 flex flex-wrap items-center text-[11px] leading-tight"
            style={{ columnGap: "0.5rem", rowGap: "0.125rem" }}
            aria-live="polite"
          >
            {passwordRules.map((rule) => {
              const met = rule.test(passwordValue);
              // Nothing typed yet is not a failure — stay neutral until they
              // start, so the form does not open covered in red.
              const state = !passwordValue ? "idle" : met ? "met" : "unmet";
              return (
                <span
                  key={rule.label}
                  className={[
                    "transition-colors",
                    state === "met"   ? "text-green-600 dark:text-green-400" : "",
                    state === "unmet" ? "!text-townwize-error" : "",
                    state === "idle"  ? "text-gray-500 dark:text-gray-400" : "",
                  ].join(" ")}
                >
                  {state === "met" ? "✓ " : "• "}{rule.label}
                </span>
              );
            })}
          </p>

          {/* Server-side or submit-time errors that the checklist cannot express. */}
          {errors.password && passwordValue && passwordRules.every((r) => r.test(passwordValue)) && (
            <p className="text-xs !text-townwize-error mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
