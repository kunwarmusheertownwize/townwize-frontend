// How a ride was settled, for display.
//
// Rides created before Aug 2026 have no paymentMethod at all — every one of
// them was cash, so an absent value reads as cash rather than as unknown.

const LABELS = {
  cash: "Cash on Ride",
  card: "Card",
  wallet: "Wallet",
};

const ICONS = {
  cash: "💵",
  card: "💳",
  wallet: "👛",
};

export const paymentMethodLabel = (method) => LABELS[method] || LABELS.cash;

export const paymentMethodIcon = (method) => ICONS[method] || ICONS.cash;

/**
 * A card ride that never captured is worth showing — the passenger needs to
 * know the fare is still outstanding. Cash rests at "not_required" and has
 * nothing to report.
 */
export const paymentStatusNote = (method, status) => {
  if (!method || method === "cash") return null;
  switch (status) {
    case "captured":
      return "Paid";
    case "authorised":
      return "Authorised — charged when the trip completes";
    case "pending":
      return "Payment pending";
    case "failed":
      return "Payment failed";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially refunded";
    default:
      return null;
  }
};
