import { Link } from "react-router-dom";
import DeleteAccountPanel from "../../components/account/DeleteAccountPanel";
import useAuth from "../../hooks/useAuth";

/**
 * The PUBLIC account-deletion page — /delete-account.
 *
 * Google Play requires apps that allow account creation to publish a web URL
 * where deletion can be requested, reachable WITHOUT reinstalling the app, and
 * this URL is submitted in the Data safety form. An in-app screen alone does
 * not satisfy it, and neither does "email support@townwize.com", which is all
 * we had before.
 *
 * Signed out, it explains the process and sends people to sign in, because the
 * deletion endpoints are authenticated — an unauthenticated "delete this
 * email" form would let anyone delete a rival's account. Anyone genuinely
 * locked out has the support address here as a fallback, which is the one case
 * where email is the right answer.
 */
export default function DeleteAccount() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-townwize-primary dark:text-white">
          Delete your Townwize account
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          You can ask us to delete your account and the personal information
          attached to it at any time.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            What is deleted
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>Your name, email address and phone number</li>
            <li>Your Bahria Town address and registration number</li>
            <li>Your CNIC number and every identity document you uploaded</li>
            <li>Your photographs, including verification selfies</li>
            <li>For Wizers: your vehicle documents and bank details</li>
            <li>Your notification history</li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            What we keep, and why
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Records of trips taken and payments made are kept for tax, accounting
            and dispute-resolution purposes, as our{" "}
            <Link to="/privacy" className="underline">Privacy Policy</Link>{" "}
            describes. These records are no longer linked to your name or any
            other detail that identifies you.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            How long it takes
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Your account stays usable for 14 days after you ask, so you can
            change your mind. After that it is deleted permanently and you will
            not be able to sign in again.
          </p>
        </div>
      </div>

      {isAuthenticated ? (
        <DeleteAccountPanel />
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Sign in to continue
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We ask you to sign in first so that only you can delete your
            account.
          </p>
          <Link
            to="/login"
            className="inline-block rounded-xl bg-townwize-primary px-5 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
          <p className="pt-2 text-xs text-gray-500 dark:text-gray-400">
            Can&rsquo;t sign in? Email{" "}
            <a href="mailto:support@townwize.com" className="underline">
              support@townwize.com
            </a>{" "}
            from the address on your account and we will handle it for you.
          </p>
        </div>
      )}
    </div>
  );
}
