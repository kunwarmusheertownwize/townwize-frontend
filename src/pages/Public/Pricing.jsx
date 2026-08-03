import { useEffect, useState } from "react";
import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

/**
 * Published rate card.
 *
 * Every number comes from GET /public/config, which reads the same pricing
 * profile the fare engine charges from. Nothing on this page is hardcoded —
 * if an admin edits pricing, this page changes with it. A rate card that can
 * disagree with the app is worse than no rate card at all.
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
                if (json?.data?.fares) setCfg(json.data);
                else setFailed(true);
            })
            .catch(() => mounted && setFailed(true));
        return () => { mounted = false; };
    }, []);

    const fares = cfg?.fares;
    const cancel = cfg?.cancellation;
    const waiting = cfg?.waiting;

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
                        Every rate we charge, published in full. You always see an estimated fare
                        before you confirm a ride.
                    </p>
                </div>
            </section>

            <section className="py-16 bg-white dark:bg-townwize-bgDark">
                <div className="max-w-3xl mx-auto px-6 space-y-8">

                    {failed && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                            Live rates could not be loaded right now. Please check back shortly, or
                            contact support@townwize.com for our current rate card.
                        </div>
                    )}

                    {fares && (
                        <>
                            <Card
                                title="Private Ride"
                                subtitle="A vehicle to yourself, door to door."
                            >
                                <Row label="Base fare" value={PKR(fares.private.baseFare)} />
                                <Row label="Per kilometre" value={PKR(fares.private.perKm)} />
                                {fares.private.perMinute != null && (
                                    <Row label="Per minute" value={PKR(fares.private.perMinute)} />
                                )}
                                {fares.minimumFare != null && (
                                    <Row
                                        label="Minimum fare"
                                        value={PKR(fares.minimumFare)}
                                        note="Short trips are never charged less than this."
                                    />
                                )}
                            </Card>

                            {fares.rideTogether?.enabled && (
                                <Card
                                    title="RideTogether"
                                    subtitle="Share the vehicle and the cost with another Towner going your way."
                                >
                                    <Row label="Base fare" value={PKR(fares.rideTogether.baseFare)} />
                                    <Row label="Per kilometre" value={PKR(fares.rideTogether.perKm)} />
                                    {fares.rideTogether.perMinute != null && (
                                        <Row label="Per minute" value={PKR(fares.rideTogether.perMinute)} />
                                    )}
                                </Card>
                            )}

                            {fares.carTypeMultipliers && (
                                <Card
                                    title="Vehicle class"
                                    subtitle="Applied to the base, distance and time components."
                                >
                                    {Object.entries(fares.carTypeMultipliers).map(([k, v]) => (
                                        <Row
                                            key={k}
                                            label={CAR_LABELS[k] || k}
                                            value={Number(v) === 1 ? "Standard rate" : `${Number(v)}×`}
                                        />
                                    ))}
                                </Card>
                            )}

                            <Card title="Fees and charges">
                                {fares.platformFee > 0 && (
                                    <Row
                                        label="Platform fee"
                                        value={PKR(fares.platformFee)}
                                        note="Shown as its own line on every receipt."
                                    />
                                )}
                                {fares.taxPercent > 0 && (
                                    <Row label="Sindh Sales Tax (SST)" value={`${fares.taxPercent}%`} />
                                )}
                                <Row
                                    label="Tolls"
                                    value="At cost"
                                    note="Passed through exactly as incurred on your route, with no mark-up, and itemised on your receipt."
                                />
                                {waiting?.pickupEnabled && (
                                    <Row
                                        label="Waiting time"
                                        value={`${PKR(waiting.pickupPerMinute)} / min`}
                                        note={`Charged only after ${waiting.pickupGraceMinutes} free minutes at pickup.`}
                                    />
                                )}
                            </Card>

                            {cancel?.feesEnabled && (
                                <Card title="Cancellation">
                                    <Row
                                        label="Free cancellation"
                                        value={`${cancel.freeWindowMinutes} min`}
                                        note="After a Wizer is matched to you. Always free within this window."
                                    />
                                    <Row label="Cancellation fee after that" value={PKR(cancel.fee)} />
                                    {cancel.noShowEnabled && (
                                        <Row
                                            label="No-show fee"
                                            value={PKR(cancel.noShowFee)}
                                            note={`Your Wizer waits ${cancel.noShowWaitMinutes} minutes at the pickup point.`}
                                        />
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

                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                                Your final fare is calculated from the route actually travelled, so it
                                can differ from the upfront estimate if the route or destination
                                changes during the trip. Every receipt shows the full breakdown and the
                                route driven. Rates are in Pakistani Rupees and may change; this page
                                always shows the rates currently in force.
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
