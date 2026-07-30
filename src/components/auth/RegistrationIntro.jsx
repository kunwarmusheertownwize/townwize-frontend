import { FaShieldAlt } from "react-icons/fa";
import { GiSteeringWheel } from "react-icons/gi";

/**
 * Shown once, after the role is chosen and before the wizard begins.
 *
 * This content used to sit inside step 1, competing with the phone field and the
 * OTP controls on the same screen. It is setup context, not a form step, so it
 * gets its own moment: what you need, how long it takes, what happens after.
 *
 * People abandon a document-heavy signup because something they do not have to
 * hand appears halfway through — not because the form is difficult. Saying so up
 * front costs one tap and saves a restart.
 */

const REQUIREMENTS = {
  driver: [
    "Your CNIC — both sides",
    "Your driving licence — both sides",
    "Proof of BTK residency and your BTK ID",
    "Vehicle registration document",
    "Your vehicle, for 7 condition photos",
  ],
  passenger: [
    "Proof of BTK residency",
    "Your BTK ID — both sides",
  ],
};

const NEXT_STEPS = [
  { n: 1, label: "Complete your details", detail: "Saved as you go — close it and come back any time." },
  { n: 2, label: "We verify your documents", detail: "Usually within 24–48 hours." },
  { n: 3, label: "You're approved", detail: "We'll email you the moment you're cleared." },
];

export default function RegistrationIntro({ role, onStart, onChangeRole }) {
  const isDriver = role === "driver";
  const Icon = isDriver ? GiSteeringWheel : FaShieldAlt;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-townwize-primary/10 dark:bg-townwize-accent/15">
          <Icon className="text-3xl text-townwize-primary dark:text-townwize-accent" />
        </div>
        <h1 className="text-2xl font-extrabold text-townwize-primary dark:text-white">
          {isDriver ? "Drive with Townwize" : "Ride with Townwize"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {isDriver
            ? "Earn on your own schedule, driving neighbours you can trust — inside Bahria Town Karachi."
            : "Book verified rides with Wizers from your own community."}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          ⏱ About {isDriver ? "10" : "3"} minutes
        </span>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Have these ready</h2>
        <ul className="mt-3 space-y-2.5">
          {(REQUIREMENTS[isDriver ? "driver" : "passenger"]).map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-300 text-[9px] text-gray-400 dark:border-gray-600">
                ✓
              </span>
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">What happens next</h2>
        <ol className="mt-3 space-y-3">
          {NEXT_STEPS.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-townwize-primary/10 text-[11px] font-bold text-townwize-primary dark:bg-townwize-accent/15 dark:text-townwize-accent">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-xl bg-townwize-primary py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-townwize-primaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-townwize-accent"
        >
          {isDriver ? "Let's get you on the road →" : "Let's get you set up →"}
        </button>
        <button
          type="button"
          onClick={onChangeRole}
          className="w-full text-xs font-medium text-gray-400 underline-offset-2 transition-colors hover:text-townwize-primary hover:underline"
        >
          ← Choose a different role
        </button>
      </div>
    </main>
  );
}
