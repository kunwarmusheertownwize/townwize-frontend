import { useFormContext } from "react-hook-form";

export default function AccountInfo({ register, errors }) {
  const { watch, setValue } = useFormContext();
  const phoneField = register("phone");
  const phoneValue = watch("phone") || "";

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
          className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-xs !text-townwize-error mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
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

      {/* Password */}
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
        {errors.password && (
          <p className="text-xs !text-townwize-error mt-1">
            {errors.password.message}
          </p>
        )}

        {/* Strength indicator */}
        {!errors.password && (
          <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            Use at least 8 characters, mix of letters, numbers & symbols.
          </p>
        )}
      </div>
    </div>
  );
}
