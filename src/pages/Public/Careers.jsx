import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";
import { FaEnvelope } from "react-icons/fa";

const VALUES = [
    { title: "Community-driven", body: "We build for a specific community we know and care about. Every decision starts with 'is this good for BTK residents?'" },
    { title: "Safety-obsessed", body: "We don't cut corners on verification, no matter how much it slows growth. Trust is our product." },
    { title: "Small team, high ownership", body: "We're a lean team. Everyone here owns something meaningful — no one is just executing tickets." },
    { title: "Honest & direct", body: "We say what we think. No corporate speak, no politics. Problems get named and solved." },
];

const ROLES = [
    {
        title: "Full-Stack Engineer",
        type: "Full-time · Karachi",
        body: "Help build and scale the Townwize platform — backend APIs, real-time ride matching, mobile apps, and more. Experience with Node.js and React required.",
    },
    {
        title: "Community & Operations Manager",
        type: "Full-time · BTK / Karachi",
        body: "Own driver onboarding, community engagement, and day-to-day operations. You'll be the face of Townwize inside BTK.",
    },
    {
        title: "Customer Support Specialist",
        type: "Part-time · Remote",
        body: "Handle rider and driver queries, resolve disputes, and keep community standards high. Strong written Urdu and English required.",
    },
];

const Careers = () => (
    <div className="bg-white dark:bg-townwize-bgDark">
        <Navbar />

        {/* Hero */}
        <section className="bg-townwize-primary py-20 sm:py-28 text-center">
            <div className="max-w-3xl mx-auto px-6">
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                    Join Us
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
                    Build Townwize with us
                </h1>
                <p className="text-white/60 text-base max-w-xl mx-auto">
                    We're a small team building something real for Bahria Town Karachi. If you care about community, safety, and doing things right — we'd love to hear from you.
                </p>
            </div>
        </section>

        {/* Culture */}
        <section className="py-20 bg-white dark:bg-townwize-bgDark">
            <div className="max-w-5xl mx-auto px-6">
                <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3 text-center">How We Work</p>
                <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-10 text-center">Our Culture</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {VALUES.map(({ title, body }) => (
                        <div key={title} className="bg-gray-50 dark:bg-townwize-primaryDark rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-townwize-primary dark:text-white mb-2">{title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Open roles */}
        <section className="py-20 bg-gray-50 dark:bg-townwize-primaryDark">
            <div className="max-w-4xl mx-auto px-6">
                <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3 text-center">Open Positions</p>
                <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-10 text-center">Current Openings</h2>
                <div className="space-y-4">
                    {ROLES.map(({ title, type, body }) => (
                        <div key={title} className="bg-white dark:bg-townwize-bgDark rounded-2xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h3 className="font-bold text-townwize-primary dark:text-white">{title}</h3>
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-townwize-accent/10 text-townwize-accent font-semibold">{type}</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
                            </div>
                            <a
                                href={`mailto:careers@townwize.com?subject=Application: ${title}`}
                                className="shrink-0 px-5 py-2.5 rounded-xl bg-townwize-primary text-white text-sm font-semibold hover:bg-townwize-accent hover:text-townwize-primary transition-all"
                            >
                                Apply
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* General CTA */}
        <section className="py-16 bg-white dark:bg-townwize-bgDark text-center">
            <div className="max-w-xl mx-auto px-6">
                <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-3">Don't see a fit?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    If you think you belong on the Townwize team, send us a note anyway. We're always open to exceptional people.
                </p>
                <a
                    href="mailto:careers@townwize.com"
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-townwize-primary text-white font-semibold hover:bg-townwize-accent hover:text-townwize-primary transition-all"
                >
                    <FaEnvelope />
                    careers@townwize.com
                </a>
            </div>
        </section>

        <Footer />
    </div>
);

export default Careers;
