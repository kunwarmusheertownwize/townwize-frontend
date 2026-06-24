import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

const SECTIONS = [
    {
        title: "1. Information We Collect",
        body: [
            "**Account information:** When you register, we collect your full name, email address, phone number, and password (hashed).",
            "**Identity & residency documents:** For verification purposes, we collect copies of your CNIC, proof of BTK residency, and — for Wizers — vehicle registration and driving licence.",
            "**Location data:** We collect real-time location data during an active ride to match you with a driver, display live tracking, and calculate fare. We do not track your location when the app is closed.",
            "**Payment information:** We do not store full card numbers. Payment processing is handled by our payment provider in accordance with PCI-DSS standards.",
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
        title: "7. Cookies & Local Storage",
        body: [
            "The Townwize web platform uses localStorage to store your session tokens and preferences (e.g., dark mode).",
            "We do not use third-party advertising cookies.",
            "Analytics are collected via first-party tools only.",
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
            "For privacy-related queries, contact us at privacy@townwize.com.",
            "Townwize is operated by Mercrest Group, Karachi, Pakistan.",
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
                <p className="text-white/30 text-xs mt-6">Last updated: June 2026</p>
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
