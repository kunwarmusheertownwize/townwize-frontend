/**
 * The founding badge — "The BTK Originals" (first 500 Towners) and
 * "Elite Wizer" (first 100 Wizers).
 *
 * It was assigned at registration (auth.service.js) and announced in the
 * welcome email in both English and Urdu, and then appeared NOWHERE in the app.
 * So the first thing a founding member was told about their status was also the
 * last. `/users/me` has always returned the field; nothing rendered it.
 *
 * Deliberately small and quiet: it is a mark of standing, not a promotion, and
 * a loud banner on a profile screen would read as marketing at the very people
 * who already signed up.
 */
const BADGES = {
  btk_originals: {
    label: "BTK Original",
    title: "One of the first 500 Towners in Bahria Town Karachi",
    emoji: "🏅",
    className:
      "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-700",
  },
  elite_wizer: {
    label: "Elite Wizer",
    title: "One of the first 100 Wizers on Townwize",
    emoji: "⭐",
    className:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-700",
  },
};

export default function FoundingBadge({ badge, className = "" }) {
  const meta = BADGES[badge];
  // Most people have no badge, and an empty element would still take layout.
  if (!meta) return null;

  return (
    <span
      title={meta.title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className} ${className}`}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
