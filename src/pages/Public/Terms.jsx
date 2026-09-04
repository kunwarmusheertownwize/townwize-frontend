import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

const SECTIONS = [
    {
        title: "1. Acceptance of Terms",
        body: [
            "By creating a Townwize account or using our platform in any capacity, you agree to be bound by these Terms of Use and our Privacy Policy.",
            "If you do not agree to these terms, you must not use Townwize.",
            "Townwize reserves the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance.",
        ],
    },
    {
        title: "2. Eligibility",
        body: [
            "You must be at least 18 years old to create a Townwize account.",
            "Towner (passenger) accounts are open to verified Bahria Town Karachi residents and guests registered via an approved resident referral.",
            "Wizer (driver) accounts require identity verification, BTK residency proof, a valid Pakistani driving licence, and a roadworthy vehicle meeting our standards.",
            "Townwize reserves the right to refuse or revoke registration at its sole discretion.",
        ],
    },
    {
        title: "3. The Townwize Platform",
        body: [
            "Townwize provides a technology platform that connects passengers (Towners) with independent driver-partners (Wizers) for transportation services.",
            "Townwize is not a transportation company. Wizers are independent contractors, not employees or agents of Townwize.",
            "Townwize does not guarantee the availability of drivers at any given time or location.",
            "The platform is provided 'as is'. We make no warranties regarding uptime, accuracy, or fitness for a particular purpose.",
        ],
    },
    {
        title: "4. What you are buying, and when you receive it",
        body: [
            "**What is being sold.** A single point-to-point road journey for you and any passengers travelling with you, in the vehicle class you select at booking, between the pickup and drop-off you specify. Nothing is shipped and nothing is posted to you — the service is the trip itself.",
            "**Where we operate.** Bahria Town Karachi and the routes serving it. Pickups and drop-offs outside our published service area cannot be booked.",
            "**When it is delivered.** Immediately. A Wizer is matched to you within minutes of booking and the service is complete when you arrive at your drop-off. Scheduled rides are delivered at the time you select.",
            "**What you receive afterwards.** An itemised receipt in the app and by email, showing the route actually driven, the distance and time it was charged on, every fare line, and how you paid.",
            "**If the service is not delivered** — no Wizer accepts, your Wizer cancels, or nobody arrives — you are not charged, and any amount already taken is refunded in full. See our Refund & Cancellation Policy.",
        ],
    },
    {
        title: "5. User Obligations",
        body: [
            "You agree to provide accurate and truthful information during registration and to keep your account details up to date.",
            "You are responsible for maintaining the confidentiality of your account credentials. Any activity on your account is your responsibility.",
            "You must comply with all applicable laws of Pakistan and the guidelines of Bahria Town Karachi while using the platform.",
            "You must not use Townwize for any unlawful, fraudulent, or harmful purpose.",
            "You must not attempt to reverse-engineer, scrape, or interfere with the platform's technical infrastructure.",
        ],
    },
    {
        title: "6. Prohibited Conduct",
        body: [
            "Impersonating another person or providing false identity or residency documents.",
            "Using the platform to harass, threaten, or discriminate against other users.",
            "Arranging rides outside the platform to avoid fees or circumvent the matching system.",
            "Sharing your account, referral code, or login credentials with unauthorised parties.",
            "As a Wizer, asking a Towner for any amount other than the fare shown in the app, or taking payment for a trip that was not booked through Townwize. Collecting the app's cash fare at the end of a trip is normal and permitted.",
            "Rating or reviewing in bad faith to manipulate driver or passenger scores.",
        ],
    },
    {
        title: "7. Fares, Payments & Cancellations",
        body: [
            "Fares are calculated by the platform from distance, time and ride type. You see an estimate before you book; the final fare is calculated from the route actually travelled and may differ if the route or destination changes during the trip.",
            "**Paying in cash:** you pay the Wizer directly at the end of the trip. This is the standard method on Townwize today.",
            "**Paying by card or wallet:** where available, payment is processed by our payment provider. Townwize never receives or stores your full card number.",
            "Tolls incurred on your route are passed through at cost and shown as a separate line on your receipt.",
            "Cancellation fees may apply if you cancel after a Wizer has been matched and is en route. See our Refund & Cancellation Policy for the free-cancellation window and the exact amount.",
            "Townwize charges a service fee, shown separately in your fare breakdown.",
            "If you believe a fare is wrong, you have 30 days from the trip to raise it with support@townwize.com. Our Refund & Cancellation Policy sets out how disputes are handled, how quickly we respond, and how refunds are paid.",
        ],
    },
    {
        title: "8. Ratings & Reviews",
        body: [
            "Towners rate Wizers after each ride and vice versa. Ratings are used to maintain platform quality.",
            "Wizers with a rating below 4.0 may be temporarily or permanently deactivated.",
            "Manipulating ratings — including incentivising reviews or submitting false feedback — is prohibited.",
        ],
    },
    {
        title: "9. Limitation of Liability",
        body: [
            "To the fullest extent permitted by law, Townwize shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.",
            "Townwize is not liable for the conduct of drivers or passengers during a ride.",
            "Our total liability to you for any claim shall not exceed the value of the ride in dispute.",
        ],
    },
    {
        title: "10. Termination",
        body: [
            "Townwize may suspend or permanently terminate your account at any time for violations of these terms, Community Guidelines, or for any reason at our sole discretion.",
            "You may close your account at any time by contacting support@townwize.com.",
            "Termination does not affect any rights or obligations accrued prior to the date of termination.",
        ],
    },
    {
        title: "11. Governing Law",
        body: [
            "These terms are governed by the laws of the Islamic Republic of Pakistan.",
            "Any disputes arising from these terms or use of the platform shall be subject to the jurisdiction of the courts of Karachi, Pakistan.",
        ],
    },
    {
        title: "12. Contact",
        body: [
            "For questions about these Terms of Use, contact us at legal@townwize.com.",
            "For ride, fare or refund queries, contact support@townwize.com or call +92 339 400 9776.",
            "Townwize is operated by **Townwize (Private) Limited**, a company incorporated in Pakistan.",
        ],
    },
];

const Terms = () => (
    <div className="bg-white dark:bg-townwize-bgDark">
        <Navbar />

        {/* Hero */}
        <section className="bg-townwize-primary py-20 sm:py-24 text-center">
            <div className="max-w-3xl mx-auto px-6">
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                    Legal
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
                    Terms of Use
                </h1>
                <p className="text-white/60 text-base max-w-xl mx-auto">
                    Please read these terms carefully before using Townwize. They govern your access to and use of the platform.
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
                            {body.map((line, i) => (
                                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex items-start gap-3">
                                    <span className="mt-2 w-1 h-1 rounded-full bg-townwize-accent shrink-0" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Questions about these terms?{" "}
                        <a href="mailto:legal@townwize.com" className="text-townwize-accent hover:underline">
                            legal@townwize.com
                        </a>
                    </p>
                </div>
            </div>
        </section>

        <Footer />
    </div>
);

export default Terms;
