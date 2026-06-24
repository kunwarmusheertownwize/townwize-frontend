import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCar, FaUserCheck, FaWallet, FaShieldAlt, FaPhone, FaEnvelope, FaChevronDown } from "react-icons/fa";
import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

const CATEGORIES = [
    {
        icon: FaCar,
        title: "Rides & Bookings",
        items: ["How do I book a ride?", "Can I schedule a ride in advance?", "How do I cancel a booking?", "What is RideTogether?"],
    },
    {
        icon: FaUserCheck,
        title: "Account & Registration",
        items: ["How do I register as a Towner?", "How do I become a Wizer (driver)?", "How do referral codes work?", "How do I reset my password?"],
    },
    {
        icon: FaWallet,
        title: "Payments & Wallet",
        items: ["How is the fare calculated?", "When do I pay for my ride?", "How does driver payment work?", "Can I get a refund?"],
    },
    {
        icon: FaShieldAlt,
        title: "Safety & Trust",
        items: ["What verification do drivers go through?", "How do I report a safety incident?", "What if I left something in the car?", "How do I report a driver?"],
    },
];

const FAQS = [
    {
        q: "How do I book a ride on Townwize?",
        a: "Log in to your account, set your pickup location and destination on the map, choose Private or RideTogether, then confirm your booking. A verified Wizer will be matched to your request.",
    },
    {
        q: "Can guests who are not BTK residents use Townwize?",
        a: "Yes — guests can join using a one-time referral code issued by a verified BTK resident. Once registered via referral, they can book rides like any other Towner.",
    },
    {
        q: "How do I become a Wizer (driver)?",
        a: "Register on the Townwize platform and select the Wizer option. You'll need to complete identity verification, submit your vehicle documents, and pass our residency check before you can start accepting rides.",
    },
    {
        q: "What happens if my driver cancels?",
        a: "If a Wizer cancels, you will be notified immediately and can re-book. Repeated cancellations by drivers are flagged and reviewed by our team.",
    },
    {
        q: "How is my fare calculated?",
        a: "Fares are based on distance and ride type. Private rides are priced per kilometre. RideTogether fares are split between passengers sharing the route.",
    },
];

const Support = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="bg-white dark:bg-townwize-bgDark">
            <Navbar />

            {/* Hero */}
            <section className="bg-townwize-primary py-20 sm:py-28 text-center">
                <div className="max-w-3xl mx-auto px-6">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                        Help Centre
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
                        How can we help?
                    </h1>
                    <p className="text-white/60 text-base max-w-xl mx-auto">
                        Find answers about rides, accounts, payments, and safety — or get in touch with our support team directly.
                    </p>
                </div>
            </section>

            {/* Categories */}
            <section className="py-16 bg-gray-50 dark:bg-townwize-primaryDark">
                <div className="max-w-5xl mx-auto px-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3 text-center">Browse Topics</p>
                    <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-10 text-center">Common topics</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {CATEGORIES.map(({ icon: Icon, title, items }) => (
                            <div key={title} className="bg-white dark:bg-townwize-bgDark rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-lg bg-townwize-primary/8 dark:bg-white/5 flex items-center justify-center">
                                        <Icon className="text-townwize-primary dark:text-white text-sm" />
                                    </div>
                                    <h3 className="font-bold text-townwize-primary dark:text-white text-sm">{title}</h3>
                                </div>
                                <ul className="space-y-2">
                                    {items.map((item) => (
                                        <li key={item} className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-2">
                                            <span className="text-townwize-accent mt-0.5">›</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-white dark:bg-townwize-bgDark">
                <div className="max-w-3xl mx-auto px-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3 text-center">Quick Answers</p>
                    <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-10 text-center">Frequently Asked</h2>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {FAQS.map((item, i) => (
                            <div key={i}>
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex justify-between items-center text-left py-5 gap-6 group focus:outline-none"
                                >
                                    <span className="text-sm font-semibold text-townwize-primary dark:text-white group-hover:text-townwize-accent transition-colors">
                                        {item.q}
                                    </span>
                                    <FaChevronDown
                                        className={`text-xs text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {openFaq === i && (
                                    <p className="pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                        {item.a}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact */}
            <section className="py-16 bg-gray-50 dark:bg-townwize-primaryDark">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3">Still need help?</p>
                    <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-3">Contact our team</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">
                        We're available to help with any issue not covered above. Response time is typically within 24 hours.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                        <a
                            href="mailto:support@townwize.com"
                            className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-townwize-primary text-white font-semibold hover:bg-townwize-accent hover:text-townwize-primary transition-all"
                        >
                            <FaEnvelope />
                            Email Support
                        </a>
                        <a
                            href="tel:+921234567890"
                            className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border border-townwize-primary dark:border-white/20 text-townwize-primary dark:text-white font-semibold hover:bg-townwize-primary hover:text-white transition-all"
                        >
                            <FaPhone />
                            Call Us
                        </a>
                    </div>
                    <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
                        support@townwize.com · Available Sat–Thu, 9am–9pm PKT
                    </p>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Support;
