import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

const SECTIONS = [
    {
        title: "1. Information We Collect",
        body: [
            "**Account information:** When you register, we collect your full name, email address, phone number, and password (hashed).",
            "**Identity & residency documents:** For verification purposes, we collect copies of your CNIC, proof of BTK residency, and — for Wizers — vehicle registration and driving licence.",
            "**Location data (Towners):** We collect your location while you are booking or taking a ride, so we can match you with a nearby Wizer, show live tracking, and calculate the fare. We do not collect a Towner's location in the background.",
            "**Location data (Wizers) — including in the background:** While a Wizer has an active trip, the app collects location continuously, including when the app is minimised, the screen is locked, or the Wizer is on a phone call. This is necessary because the trip must keep tracking through the whole journey: the Towner sees the vehicle move in real time, and the fare is calculated from the distance actually travelled. Android shows an ongoing \"Trip Active\" notification for as long as this is running. Collection starts when a trip begins and stops when it ends — Townwize does not collect a Wizer's location when no trip is in progress, and never when the app is fully closed.",
            "**Payment information:** Townwize does not store or ever receive your full card number. Card and wallet payments are processed by our payment provider, who is PCI-DSS certified; the card details are entered on their systems, not ours. Rides paid in cash are settled directly between the Towner and the Wizer.",
            "**Device & usage data:** We collect app version, device type, OS version, and in-app activity logs for performance and debugging purposes.",
        ],
    },
    {
        title: "2. How We Use Your Information",
        body: [
            "To match Towners with available Wizers and calculate fares.",
            "To verify identity and BTK residency before approving accounts.",
            "To send ride confirmations, OTPs, and service notifications via SMS and email.",
            "To investigate safety incidents, disputes, and policy violations.",
            "To improve the platform through aggregate, anonymised usage analytics.",
            "We do not sell your personal data to third parties.",
        ],
    },
    {
        title: "3. Data Sharing",
        body: [
            "**With drivers (Wizers):** When a ride is matched, the driver receives your name and pickup location. Your full address or contact details are not shared beyond what is needed for the ride.",
            "**With passengers (Towners):** Drivers' name, photo, vehicle details, and rating are shared with the matched passenger.",
            "**With service providers:** We share data with third-party services (cloud storage, SMS gateways, payment processors) strictly for operational purposes. These partners are bound by confidentiality agreements.",
            "**With our payment provider:** For card and wallet payments, the amount and a reference to your trip are shared with our payment provider so the transaction can be processed. Your card details are entered on their systems and never pass through Townwize.",
            "**With law enforcement:** We may disclose information if required by Pakistani law or in response to a valid legal request.",
        ],
    },
    {
        title: "4. Data Retention",
        body: [
            "Account data is retained for as long as your account is active.",
            "Ride history and transaction records are retained for up to 7 years for legal and accounting compliance.",
            "Verification documents are retained for 2 years after account closure.",
            "You may request deletion of your account by contacting support@townwize.com. Note that some data may be retained for legal compliance even after deletion.",
        ],
    },
    {
        title: "5. Your Rights",
        body: [
            "You have the right to access the personal data we hold about you.",
            "You may request correction of inaccurate data.",
            "You may request deletion of your account and associated data, subject to legal retention obligations.",
            "You may withdraw consent for non-essential communications (e.g., marketing emails) at any time.",
            "To exercise any of these rights, contact us at privacy@townwize.com.",
        ],
    },
    {
        title: "6. Security",
        body: [
            "We use industry-standard encryption (TLS) for all data in transit.",
            "Passwords are hashed using bcrypt and are never stored in plain text.",
            "Access to personal data is restricted to authorised Townwize personnel on a need-to-know basis.",
            "Despite our best efforts, no system is 100% secure. In the event of a data breach affecting your personal information, we will notify you in accordance with applicable law.",
        ],
    },
    {
        title: "7. Cookies, Local Storage & Advertising",
        body: [
            "The Townwize web platform uses localStorage to store your session tokens and preferences (e.g., dark mode).",
            "**On our public marketing website only**, we use the Meta pixel and the Meta Conversions API to measure whether our advertising is working. These place cookies in your browser and send Meta limited information about your visit — for example that you viewed a page or joined the waitlist. Where you have given us your email address or phone number, a securely hashed (irreversible) version may be sent so that Meta can match the event to an existing account. We never send Meta your name, your address, your location, or anything about your rides.",
            "**None of this runs inside the Townwize app, or anywhere you are signed in.** Your trips, your locations, your documents and your payment activity are never shared with any advertising platform.",
            "You can limit this using your browser's tracking-protection or ad-blocking settings, and through the ad preferences in your own Meta account.",
            "We do not sell your personal data, and we do not use advertising cookies to build profiles beyond measuring our own campaigns.",
        ],
    },
    {
        title: "8. Changes to This Policy",
        body: [
            "We may update this Privacy Policy from time to time. When we make material changes, we will notify registered users via email or in-app notification.",
            "Continued use of Townwize after changes are posted constitutes acceptance of the updated policy.",
        ],
    },
    {
        title: "9. Contact",
        body: [
            "For privacy-related queries, contact us at privacy@townwize.com or call +92 339 400 9776.",
            "Townwize is operated by **Townwize (Private) Limited**, a company incorporated in Pakistan, which is the data controller for the personal data described in this policy.",
        ],
    },
];

const Privacy = () => (
    <div className="bg-white dark:bg-townwize-bgDark">
        <Navbar />

        {/* Hero */}
        <section className="bg-townwize-primary py-20 sm:py-24 text-center">
            <div className="max-w-3xl mx-auto px-6">
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                    Legal
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
                    Privacy Policy
                </h1>
                <p className="text-white/60 text-base max-w-xl mx-auto">
                    This policy explains what data we collect, how we use it, and your rights as a Townwize user.
                </p>
                <p className="text-white/30 text-xs mt-6">Last updated: September 2026</p>
            </div>
        </section>

        {/* Content */}
        <section className="py-16 bg-white dark:bg-townwize-bgDark">
            <div className="max-w-3xl mx-auto px-6 space-y-12">
                {SECTIONS.map(({ title, body }) => (
                    <div key={title}>
                        <h2 className="text-lg font-bold text-townwize-primary dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                            {title}
                        </h2>
                        <ul className="space-y-3">
                            {body.map((line, i) => {
                                const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                return (
                                    <li
                                        key={i}
                                        className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex items-start gap-3"
                                    >
                                        <span className="mt-2 w-1 h-1 rounded-full bg-townwize-accent shrink-0" />
                                        <span dangerouslySetInnerHTML={{ __html: formatted }} />
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}

                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Questions about this policy?{" "}
                        <a href="mailto:privacy@townwize.com" className="text-townwize-accent hover:underline">
                            privacy@townwize.com
                        </a>
                    </p>
                </div>
            </div>
        </section>

        <Footer />
    </div>
);

export default Privacy;
