import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

const SECTIONS = [
    {
        label: "General",
        title: "Community Standards",
        rules: [
            "Treat every Towner and Wizer with respect. Harassment, discrimination, or abusive behaviour of any kind will result in immediate suspension.",
            "Maintain honesty. Providing false information during registration — including identity, address, or vehicle details — is grounds for permanent ban.",
            "Do not share your account credentials or allow others to use your account.",
            "Report any safety concern immediately via the in-app report feature or by contacting support@townwize.com.",
            "Townwize reserves the right to remove any member who violates these standards, with or without prior warning.",
        ],
    },
    {
        label: "For Towners",
        title: "Passenger Guidelines",
        rules: [
            "Be ready at your pickup location at the confirmed time. Excessive no-shows may result in restrictions on your account.",
            "Do not request a ride to facilitate illegal activity. Townwize rides are for lawful, personal travel only.",
            "Respect the driver's vehicle. You are liable for any damage caused during your ride.",
            "Keep conversations respectful. Drivers are members of your community.",
            "For RideTogether rides, be accommodating — another passenger may be sharing your route.",
            "Rate your ride honestly. Feedback helps maintain quality for everyone.",
        ],
    },
    {
        label: "For Wizers",
        title: "Driver Guidelines",
        rules: [
            "Maintain a clean, roadworthy vehicle at all times. Townwize may conduct periodic checks.",
            "Accept only the rides you can safely complete. Repeatedly accepting and cancelling affects your rating.",
            "Do not pick up additional passengers outside the app or charge fares outside the platform.",
            "Follow all traffic laws. Reckless or dangerous driving is cause for immediate deactivation.",
            "Keep your vehicle documents, licence, and insurance up to date. Expired documents result in suspension.",
            "Maintain a minimum rating of 4.0 to remain active on the platform.",
            "Do not use your phone while driving. Use Bluetooth or pull over safely if needed.",
        ],
    },
    {
        label: "Referrals",
        title: "Referral Code Rules",
        rules: [
            "Referral codes may only be issued by verified BTK residents in good standing.",
            "Each code is single-use. Sharing codes publicly (e.g., on social media) is prohibited.",
            "The issuing resident is responsible for vouching for the guest they refer. Abuse of the referral system may result in both accounts being reviewed.",
            "Referral codes cannot be transferred or sold.",
        ],
    },
];

const Guidelines = () => (
    <div className="bg-white dark:bg-townwize-bgDark">
        <Navbar />

        {/* Hero */}
        <section className="bg-townwize-primary py-20 sm:py-28 text-center">
            <div className="max-w-3xl mx-auto px-6">
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                    Community Rules
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
                    Community Guidelines
                </h1>
                <p className="text-white/60 text-base max-w-xl mx-auto">
                    These guidelines apply to all Townwize members — Towners, Wizers, and guests. They exist to keep every ride safe, respectful, and community-worthy.
                </p>
                <p className="text-white/30 text-xs mt-6">Last updated: June 2026</p>
            </div>
        </section>

        {/* Guidelines */}
        <section className="py-16 bg-white dark:bg-townwize-bgDark">
            <div className="max-w-3xl mx-auto px-6 space-y-14">
                {SECTIONS.map(({ label, title, rules }) => (
                    <div key={label}>
                        <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-2">
                            {label}
                        </span>
                        <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-6">{title}</h2>
                        <ul className="space-y-4">
                            {rules.map((rule, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <span className="mt-1 w-5 h-5 rounded-full bg-townwize-primary/10 dark:bg-white/5 flex items-center justify-center shrink-0 text-[10px] font-bold text-townwize-primary dark:text-white">
                                        {i + 1}
                                    </span>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{rule}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>

        {/* Footer note */}
        <section className="py-12 bg-gray-50 dark:bg-townwize-primaryDark text-center">
            <div className="max-w-2xl mx-auto px-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Violations of these guidelines may result in warnings, temporary suspension, or permanent removal from the platform.
                    To report a violation or ask a question, contact{" "}
                    <a href="mailto:support@townwize.com" className="text-townwize-accent hover:underline">
                        support@townwize.com
                    </a>.
                </p>
            </div>
        </section>

        <Footer />
    </div>
);

export default Guidelines;
