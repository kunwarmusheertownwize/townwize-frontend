import { useEffect, useState } from "react";
import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

/**
 * Refund & Cancellation Policy.
 *
 * The amounts here are read live from GET /public/config — the same values the
 * fare engine and the cancellation service actually charge from. Hardcoding a
 * second copy would drift the moment an admin edits the policy, leaving the
 * published page quoting one number while the app charges another.
 *
 * FALLBACKS below match the service defaults so the page still renders
 * something truthful if the API is unreachable.
 */

const FALLBACK = {
    freeWindowMinutes: 3,
    fee: 75,
    noShowWaitMinutes: 6,
    noShowFee: 120,
};

const PKR = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

const buildSections = (c) => [
    {
        title: "1. Cancelling a ride",
        body: [
            "You can cancel a ride at any time before it starts, from the app.",
            `**Free cancellation:** cancelling within ${c.freeWindowMinutes} minutes of a Wizer being matched to you is always free.`,
            `**A live countdown warns you before the fee starts.** Once you are into the second half of that window, the cancel screen shows exactly how long you have left — so the fee never arrives as a surprise.`,
            `**After the ${c.freeWindowMinutes} minutes:** a cancellation fee of ${PKR(c.fee)} may apply, because your Wizer has already driven toward you and turned down other trips to do so.`,
            "**You always see the fee before you confirm a cancellation.** We will never charge one you were not shown first.",
            "No fee applies if you cancel because the Wizer is not moving toward you, the vehicle or registration does not match what the app showed, or the Wizer asks you to cancel. Report any of these and the fee is waived — see section 4.",
            "If a Wizer cancels on you, you are never charged.",
        ],
    },
    {
        title: "2. No-shows",
        body: [
            `Your Wizer waits ${c.noShowWaitMinutes} minutes at the pickup point.`,
            `If you have not arrived and cannot be reached after that, the trip may be marked as a no-show and a fee of ${PKR(c.noShowFee)} may apply.`,
            "If you were at the pickup point and the Wizer was not, contact support — a no-show recorded against you in that situation will be reversed.",
        ],
    },
    {
        title: "3. Disputing a fare or a charge",
        body: [
            "**You have 30 days from the trip to raise a dispute.** Contact support@townwize.com, call +92 339 400 9776, or use Help in the app. Include the trip ID from your receipt.",
            "Every trip records the route actually driven. A disputed distance, route or fare is checked against that recorded GPS trail — not argued from memory — and we will show you what it says.",
            "Grounds for an adjustment include: a route materially longer than the reasonable one, a trip that ended somewhere other than your destination, a toll charged that your route did not pass, waiting time charged while the vehicle was moving, a duplicate charge, or a fare that does not add up to the breakdown on your receipt.",
            "**We acknowledge every dispute within 24 hours and decide within 3 business days.** If we need longer, we will tell you why and when to expect an answer.",
            "You will always be given a reason for the decision. If you disagree, reply to the same thread and it will be escalated to a senior reviewer, who responds within a further 5 business days.",
        ],
    },
    {
        title: "4. Refunds we issue without you having to ask",
        body: [
            "Some situations are clear-cut, and making you argue for them would be wrong. In these cases we refund automatically once we detect or confirm the issue:",
            "You were charged for a trip that never took place.",
            "You were charged twice for the same trip.",
            "A toll was billed that your recorded route did not pass.",
            "A cancellation or no-show fee was charged when the Wizer was at fault — they never moved toward you, were not at the pickup point, or asked you to cancel.",
            "The trip was ended far from your destination through no fault of yours.",
        ],
    },
    {
        title: "5. How refunds are paid",
        body: [
            "**Refunds always go back to the method you paid with.** We cannot refund a card payment as cash, or send a refund to a different person's account. This protects you as much as it protects us.",
            "**Card and wallet trips:** once approved, Townwize submits the refund to our payment provider within 1 business day. Your bank then posts it in its own time — typically 3 to 10 business days depending on the issuer. The date we submit it is the date we can evidence; anything after that is between your bank and you, and we will give you the reference to chase it.",
            "**Cash trips:** the fare went directly to your Wizer, so Townwize pays an approved refund to you separately. Support will agree the method with you and it is sent within 3 business days of approval.",
            "**Partial refunds are normal** — for example, refunding an incorrect toll while the rest of a correct fare stands.",
            "We never charge a fee for issuing a refund, and a refund is never issued as credit you can only spend with us unless you specifically ask for that.",
        ],
    },
    {
        title: "6. What is not refundable",
        body: [
            "A trip completed as booked, at the fare shown in your breakdown.",
            "The difference between the upfront estimate and the final fare, where that difference is explained by the route actually travelled, waiting time, or a change of destination you requested. The estimate is an estimate; the receipt shows how the final figure was reached.",
            "Tolls genuinely incurred on your route. These are passed through at cost with no mark-up and itemised separately.",
            "Cancellation and no-show fees correctly applied under sections 1 and 2.",
            "Dissatisfaction alone, absent any of the grounds above — though we always want to hear it, and it affects a Wizer's standing on the platform.",
        ],
    },
    {
        title: "7. If you are still not satisfied",
        body: [
            "Ask for your dispute to be escalated. A senior reviewer will look at it independently of whoever handled it first.",
            "**You keep every right you already have.** Nothing in this policy limits your rights under Pakistani consumer protection law, and you may raise a complaint with the relevant consumer protection authority at any time.",
            "If you paid by card, you retain your right to dispute the charge with your bank or card issuer. We will not close, suspend or penalise your account for exercising that right, and we will provide the trip records to whichever party asks for them.",
        ],
    },
    {
        title: "8. Contact",
        body: [
            "Refunds, cancellations and fare disputes: support@townwize.com or +92 339 400 9776.",
            "Please include your trip ID — it is on your receipt and in your trip history.",
            "**Townwize (Private) Limited** · R-31/2, 10th East Street, Phase 1, DHA, Karachi, Pakistan.",
        ],
    },
];

const Refunds = () => {
    const [c, setC] = useState(FALLBACK);

    useEffect(() => {
        let mounted = true;
        fetch(`${import.meta.env.VITE_API_BASE_URL}/public/config`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                const cx = json?.data?.cancellation;
                if (mounted && cx) {
                    setC({
                        freeWindowMinutes: cx.freeWindowMinutes ?? FALLBACK.freeWindowMinutes,
                        fee: cx.fee ?? FALLBACK.fee,
                        noShowWaitMinutes: cx.noShowWaitMinutes ?? FALLBACK.noShowWaitMinutes,
                        noShowFee: cx.noShowFee ?? FALLBACK.noShowFee,
                    });
                }
            })
            .catch(() => { /* fall back to the service defaults above */ });
        return () => { mounted = false; };
    }, []);

    const sections = buildSections(c);

    return (
        <div className="bg-white dark:bg-townwize-bgDark">
            <Navbar />

            <section className="bg-townwize-primary py-20 sm:py-24 text-center">
                <div className="max-w-3xl mx-auto px-6">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                        Legal
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
                        Refund &amp; Cancellation Policy
                    </h1>
                    <p className="text-white/60 text-base max-w-xl mx-auto">
                        When a cancellation fee applies, how to dispute a fare, and how refunds are paid.
                    </p>
                    <p className="text-white/30 text-xs mt-6">Last updated: August 2026</p>
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

                    <div className="pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Need help with a trip?{" "}
                            <a href="mailto:support@townwize.com" className="text-townwize-accent hover:underline">
                                support@townwize.com
                            </a>
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Refunds;
