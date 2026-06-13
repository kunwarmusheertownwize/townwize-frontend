//File: \src\components\auth\ReferralSection.jsx

export default function ReferralSection({ register, errors, watch }) {
  const codeValue = watch("referralCode"); // ✅ live value from form

  return (
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-300">
        Referral Code
      </label>
      <input
        {...register("referralCode")}
        className={`mt-1 w-full rounded-lg p-3 outline-none disabled:opacity-70
          ${codeValue
            ? "bg-gray-100 dark:bg-gray-600 border-green-500 text-gray-700 dark:text-white"
            : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"}`}
        placeholder="Enter your invite code"
        disabled={!!codeValue} // ✅ now works
      />
      {errors.referralCode && (
        <p className="text-xs !text-townwize-error mt-1">
          {errors.referralCode.message}
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Invited by a verified BTK resident. Single-use codes only.
      </p>
      {codeValue && (
        <p className="text-xs text-townwize-primary dark:text-townwize-accent mt-1">
          Referral code has been auto-filled from your invite link.
        </p>
      )}
    </div>
  );
}
