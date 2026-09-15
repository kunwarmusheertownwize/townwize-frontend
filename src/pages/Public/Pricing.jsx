import { useEffect, useState } from "react";
import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

/**
 * Published charges.
 *
 * What this page does and does NOT print is a deliberate line.
 *
 * It names every component that can appear on a fare, and it states the
 * charges a person must be told about BEFORE they can be levied — the
 * free-cancellation window, the cancellation fee, the no-show fee and the
 * waiting rate. Those come live from GET /public/config, which reads the same
 * config the fare engine charges from, so this page cannot drift from what is
 * actually charged.
 *
 * It does NOT print the rate card — base fare, per km, per minute, minimum
 * fare, class multipliers, platform fee. Those are the commercial terms, the
 * endpoint now withholds them from an anonymous caller, and a passenger sees
 * them as an itemised estimate in the app before booking and on the receipt
 * afterwards. Fare transparency is owed to the person taking the ride, not to
 * anyone who loads the marketing site.
 */

const PKR = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

const CAR_LABELS = {
    economy: "Economy",
    comfort: "Comfort",
    xl: "XL",
};

const Row = ({ label, value, note }) => (
    <div className="flex items-baseline justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
            {note && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{note}</p>}
        </div>
        <p className="text-sm font-semibold text-townwize-primary dark:text-townwize-accent whitespace-nowrap">
            {value}
        </p>
    </div>
);

const Card = ({ title, subtitle, children }) => (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-townwize-primary dark:text-white">{title}</h2>
        {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">{subtitle}</p>
        )}
        <div className="mt-2">{children}</div>
    </div>
);

const Pricing = () => {
    const [cfg, setCfg] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let mounted = true;
        fetch(`${import.meta.env.VITE_API_BASE_URL}/public/config`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
            .then((json) => {
                if (!mounted) return;
                if (json?.data?.charges) setCfg(json.data);
                else setFailed(true);
            })
            .catch(() => mounted && setFailed(true));
        return () => { mounted = false; };
    }, []);

    const charges = cfg?.charges;
    const cancel = cfg?.cancellation;
    const waiting = cfg?.waiting;
    const carClasses = charges?.carClasses || [];

    return (
        <div className="bg-white dark:bg-townwize-bgDark">
            <Navbar />

            <section className="bg-townwize-primary py-20 sm:py-24 text-center">
                <div className="max-w-3xl mx-auto px-6">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                        Pricing
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
                        Fares &amp; Charges
                    </h1>
                    <p className="text-white/60 text-base max-w-xl mx-auto">
                        Every charge that can appear on a Townwize fare, named in full. You see the
                        exact amount in the app before you confirm a ride, and a line-by-line
                        breakdown on your receipt.
                    </p>
                </div>
            </section>

            <section className="py-16 bg-white dark:bg-townwize-bgDark">
                <div className="max-w-3xl mx-auto px-6 space-y-8">

                    {failed && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                            This page could not load right now. Please check back shortly, or
                            contact support@townwize.com.
                        </div>
                    )}

                    {charges && (
                        <>
                            <Card
                                title="What makes up a fare"
                                subtitle="Every trip is itemised against these lines — nothing else is added."
                            >
                                <Row
                                    label="Base fare"
                                    value="Every trip"
                                    note="A fixed amount that starts the fare."
                                />
                                <Row
                                    label="Distance"
                                    value="Per kilometre"
                                    note="Charged on the route actually driven, recorded by GPS."
                                />
                                {charges.perMinuteEnabled && (
                                    <Row
                                        label="Time"
                                        value="Per minute"
                                        note="Charged while the trip is running."
                                    />
                                )}
                                {charges.minimumFareEnabled && (
                                    <Row
                                        label="Minimum fare"
                                        value="Short trips"
                                        note="A very short trip is never charged less than this."
                                    />
                                )}
                                {carClasses.length > 1 && (
                                    <Row
                                        label="Vehicle class"
                                        value={carClasses.map((k) => CAR_LABELS[k] || k).join(" · ")}
                                        note="A larger or more comfortable vehicle costs more than Economy. You choose the class before you book."
                                    />
                                )}
                                {charges.platformFeeEnabled && (
                                    <Row
                                        label="Platform fee"
                                        value="Per trip"
                                        note="Competitive, and shown as its own line on every receipt."
                                    />
                                )}
                                <Row
                                    label="Tolls"
                                    value="At cost"
                                    note="Passed through exactly as incurred on your route, with no mark-up, and itemised separately."
                                />
                                {charges.taxEnabled && (
                                    <Row label="Taxes" value="As applicable" />
                                )}
                            </Card>

                            {charges.rideTogetherEnabled && (
                                <Card
                                    title="Private Ride and RideTogether"
                                    subtitle="Two ways to travel, priced differently."
                                >
                                    <Row
                                        label="Private Ride"
                                        value="Standard rate"
                                        note="A vehicle to yourself, door to door."
                                    />
                                    <Row
                                        label="RideTogether"
                                        value="Costs less"
                                        note="Share the vehicle with another Towner going your way, and share the cost."
                                    />
                                </Card>
                            )}

                            {(waiting?.pickupEnabled || cancel?.feesEnabled) && (
                                <Card
                                    title="Waiting, cancellation and no-shows"
                                    subtitle="The only charges that can apply when a trip is not completed. These are stated in full."
                                >
                                    {waiting?.pickupEnabled && (
                                        <Row
                                            label="Waiting time at pickup"
                                            value={`${PKR(waiting.pickupPerMinute)} / min`}
                                            note={`Charged only after ${waiting.pickupGraceMinutes} free minutes.`}
                                        />
                                    )}
                                    {cancel?.feesEnabled && (
                                        <>
                                            <Row
                                                label="Free cancellation"
                                                value={`${cancel.freeWindowMinutes} min`}
                                                note="After a Wizer is matched to you. Always free within this window."
                                            />
                                            <Row
                                                label="Cancellation fee after that"
                                                value={PKR(cancel.fee)}
                                            />
                                            {cancel.noShowEnabled && (
                                                <Row
                                                    label="No-show fee"
                                                    value={PKR(cancel.noShowFee)}
                                                    note={`Your Wizer waits ${cancel.noShowWaitMinutes} minutes at the pickup point before this applies.`}
                                                />
                                            )}
                                        </>
                                    )}
                                    <div className="pt-4">
                                        <a
                                            href="/refunds"
                                            className="text-sm text-townwize-accent hover:underline"
                                        >
                                            Read the full Refund &amp; Cancellation Policy →
                                        </a>
                                    </div>
                                </Card>
                            )}

                            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-6">
                                <h2 className="text-base font-bold text-townwize-primary dark:text-white">
                                    Where to see the actual amount
                                </h2>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Open Townwize, enter your destination, and the estimated fare is
                                    shown before you confirm — broken down into the lines above. After
                                    the trip, your receipt shows the final fare against the route
                                    actually driven. Rates are set in Pakistani Rupees and can change.
                                </p>
                            </div>

                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                                * plus applicable taxes. Your final fare is calculated from the route
                                actually travelled, so it can differ from the upfront estimate if the
                                route or destination changes during the trip. Every receipt shows the
                                full breakdown and the route driven.
                            </p>
                        </>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Pricing;
