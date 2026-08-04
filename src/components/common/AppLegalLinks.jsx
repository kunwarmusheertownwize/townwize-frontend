import { Link } from "react-router-dom";

/**
 * Legal and support links for signed-in users.
 *
 * The marketing footer used to carry these, and it was the ONLY route to Terms
 * and Privacy from inside the app — so removing the footer without this would
 * have broken a requirement both Google Play and payment providers check for.
 *
 * Placed on the account screen, which is where Uber, Careem and Bolt all keep
 * it: reachable when someone goes looking, invisible when they are working.
 */
const AppLegalLinks = ({ className = "" }) => (
  <div className={`rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 p-5 ${className}`}>
    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Legal &amp; support</h3>

    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {[
        { to: "/terms", label: "Terms of Use" },
        { to: "/privacy", label: "Privacy Policy" },
        { to: "/refunds", label: "Refunds & Cancellations" },
        { to: "/pricing", label: "Fares & Charges" },
      ].map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="text-xs text-gray-600 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent transition-colors"
        >
          {label}
        </Link>
      ))}
    </div>

    {/* Support email stays — it is how a signed-in user reaches us. The phone
        number and registered address deliberately do NOT appear in the app:
        they belong on the public Terms, Privacy, Refunds and Support pages,
        which is where payment providers and app stores look for them. Repeating
        them on every account screen just puts a direct line to the company in
        front of every user. */}
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
      <a
        href="mailto:support@townwize.com"
        className="block text-xs font-medium text-townwize-primary dark:text-townwize-accent"
      >
        support@townwize.com
      </a>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-1">
        Townwize (PVT) LTD.
      </p>
    </div>
  </div>
);

export default AppLegalLinks;
