import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

/**
 * Service Delivery Policy.
 *
 * Required by the Safepay merchant agreement, clause 15.4, which obliges us to
 * publish a service description, terms, a refund policy, a customer-service
 * contact including email, a privacy policy AND a shipping/delivery policy.
 * Every other item on that list has been live for months; this one was missing,
 * which made it a standing breach of a signed agreement rather than a nicety.
 *
 * "Shipping" is written for goods. Townwize delivers a journey, so the policy
 * says when the service is considered delivered, where we operate and what
 * happens when delivery fails — which is what the clause is actually for, and
 * what a card scheme asks when a passenger disputes a charge.
 *
 * Static on purpose. Unlike the refund page, nothing here is a figure the admin
 * can edit, so reading it from the API would add a failure mode for no gain.
 */
const sections = [
    {
        title: "1. What we deliver",
        body: [
            "Townwize is a ride-hailing platform. We connect a Towner (passenger) with a Wizer (driver) for a single journey, booked in the Townwize app.",
            "We are not a courier and we do not deliver goods. Nothing is shipped, and no physical item is ever posted to you.",
            "The service you pay for is the completed journey, together with the technology that arranges it: matching, live tracking, fare calculation and support.",
        ],
    },
    {
        title: "2. Where we operate",
        body: [
            "**Bahria Town Karachi.** Pickups must be inside Bahria Town Karachi. Drop-offs may be outside it where a Wizer accepts the trip.",
            "Both Towners and Wizers are verified residents of Bahria Town Karachi. Guests may join through a referral from a verified Towner.",
            "If you request a ride outside our service area, the app tells you before you book. You are never charged for a trip we cannot serve.",
        ],
    },
    {
        title: "3. When the service is delivered",
        body: [
            "**Immediately.** A ride is requested, matched and completed in real time — usually within minutes.",
            "Delivery is complete when the Wizer marks the trip finished at your drop-off point. At that moment the fare is settled from the distance and time actually travelled, measured by GPS.",
            "You can also book a ride for a later time. A scheduled ride is dispatched to Wizers shortly before its pickup time, and is delivered in the same way once it runs.",
        ],
    },
    {
        title: "4. When you pay",
        body: [
            "**At the end of the trip, never before.** Nothing is charged when you book.",
            "**Cash:** pay your Wizer directly when the journey ends.",
            "**Card:** the settled fare is charged once the trip is complete. You confirm the payment in the app, through our payment provider's secure checkout — Townwize never sees or stores your card number.",
            "Townwize does not hold a balance on your behalf and there is nothing to top up. You pay per journey.",
        ],
    },
    {
        title: "5. Receipts",
        body: [
            "A receipt is available in the app as soon as a trip completes, under Ride History, and is emailed to the address on your account.",
            "It itemises the base fare, distance, time, any waiting charge, platform fee, tolls and tax, so the total can be checked line by line.",
        ],
    },
    {
        title: "6. If delivery fails",
        body: [
            "**No Wizer is found:** the request ends and you are not charged.",
            "**Your Wizer cancels:** you are never charged, and you can request another ride immediately.",
            "**You cancel:** free within the window shown in the app. After it, a cancellation fee may apply because your Wizer has already driven toward you — see our Refund &amp; Cancellation Policy.",
            "**The trip goes wrong:** report it from the ride in your history, or email support@townwize.com. Fare disputes and refunds are handled under our Refund &amp; Cancellation Policy.",
        ],
    },
    {
        title: "7. Contact",
        body: [
            "Email **support@townwize.com** for anything about a trip, a fare or a payment.",
            "In-app support is available from the Support screen in both the Towner and Wizer apps.",
            "Townwize (Private) Limited is incorporated in Pakistan and operates in Bahria Town Karachi.",
        ],
    },
];

const ServiceDelivery = () => (
    <div className="bg-white dark:bg-townwize-bgDark">
        <Navbar />

        <section className="bg-townwize-primary py-20 sm:py-24 text-center">
            <div className="max-w-3xl mx-auto px-6">
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                    Legal
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
                    Service Delivery Policy
                </h1>
                <p className="text-white/60 text-base max-w-xl mx-auto">
                    What Townwize delivers, where we operate, when a ride counts as
                    delivered and what happens if it is not.
                </p>
                <p className="text-white/30 text-xs mt-6">Last updated: September 2026</p>
            </div>
        </section>

        <section className="py-16 bg-white dark:bg-townwize-bgDark">
            <div className="max-w-3xl mx-auto px-6 space-y-12">
                {sections.map(({ title, body }) => (
                    <div key={title}>
                        <h2 className="text-lg font-bold text-townwize-primary dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                            {title}
                        </h2>
                        <ul className="space-y-3">
                            {body.map((line, i) => {
                                const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
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
            </div>
        </section>

        <Footer />
    </div>
);

export default ServiceDelivery;
