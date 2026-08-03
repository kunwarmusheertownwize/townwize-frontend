import { useEffect, useState } from "react";
import api from "../../services/api";

/**
 * Payment method picker for the trip confirmation screen.
 *
 * The list comes from the server (`GET /payments/methods`) rather than being
 * hardcoded here — card availability is gated by a feature flag, and the
 * client is not the place that decision gets made. If the call fails we fall
 * back to cash-only, which is what every ride did before this existed.
 */

const CASH_ONLY = [
  {
    id: "cash",
    label: "Cash",
    description: "Pay your Wizer directly at the end of the trip",
    available: true,
  },
];

const ICONS = { cash: "💵", card: "💳", wallet: "👛" };

const PaymentMethodSelector = ({ value, onChange, disabled = false }) => {
  const [methods, setMethods] = useState(CASH_ONLY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/payments/methods")
      .then((res) => {
        if (!mounted) return;
        const list = res?.data?.data?.methods;
        if (Array.isArray(list) && list.length) setMethods(list);
      })
      .catch(() => {
        // Cash-only is the safe failure: it is the method that always works.
        if (mounted) setMethods(CASH_ONLY);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Nothing to choose between — don't show a control with one option.
  const selectable = methods.filter((m) => m.available);
  if (loading || selectable.length < 2) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
        Payment method
      </p>
      <div className="grid grid-cols-2 gap-2">
        {methods.map((m) => {
          const active = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled || !m.available}
              onClick={() => onChange(m.id)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                active
                  ? "border-townwize-primary bg-townwize-primary/5 dark:bg-townwize-primary/20"
                  : "border-gray-200 dark:border-gray-700"
              } ${m.available ? "" : "opacity-50 cursor-not-allowed"}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                <span aria-hidden="true">{ICONS[m.id] || "💳"}</span>
                {m.label}
              </span>
              <span className="block mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                {m.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
