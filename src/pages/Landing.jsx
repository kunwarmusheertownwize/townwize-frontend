import { Navigate, useNavigate } from "react-router-dom";
import {
    FaCar,
    FaUsers,
    FaShieldAlt,
    FaApple,
    FaGooglePlay,
    FaUserCheck,
    FaLeaf,
    FaChevronDown,
} from "react-icons/fa";
import Navbar from "../components/shared/Navbar";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Footer from "../components/shared/Footer";
import { isNative } from "../utils/platform";
import { useAuth } from "../hooks/useAuth";

const TRUST_STATS = [
    { icon: FaShieldAlt,  title: "BTK Exclusive",      sub: "Verified residents only" },
    { icon: FaUserCheck,  title: "Trusted Drivers",    sub: "ID & residency checked" },
    { icon: FaCar,        title: "City-wide Coverage", sub: "To & from BTK" },
    { icon: FaUsers,      title: "RideTogether",       sub: "Shared rides, split fares" },
];

const FAQS = [
    {
        q: "Who can join Townwize?",
        a: "Verified Bahria Town Karachi residents can register directly. Visitors and guests can join using a secure referral code issued by any verified resident.",
    },
    {
        q: "Can non-residents use the app?",
        a: "Yes. Visitors and guests can use Townwize with a secure referral code provided by a verified BTK resident who is already registered with Townwize.",
    },
    {
        q: "How are drivers verified?",
        a: "All drivers are verified Bahria Town Karachi residents. Identity and residency verification is required before approval.",
    },
    {
        q: "What is RideTogether?",
        a: "RideTogether is Townwize's shared ride option. Passengers travelling in the same direction can share a ride, saving money while keeping rides safe within the BTK community.",
    },
    {
        q: "How is Townwize different from other ride apps?",
        a: "Townwize is designed exclusively for BTK, focusing on community safety, verified drivers, and localised service — not an open public platform.",
    },
    {
        q: "Is it available outside BTK?",
        a: "Townwize rides are driven by verified BTK residents and can operate anywhere within Karachi citywide, including to and from Bahria Town Karachi.",
    },
];

const Landing = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq]       = useState(null);
    const [subscribed, setSubscribed] = useState(false);
    const { isAuthenticated, user, loading } = useAuth();

    const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

    // ─── Native (Capacitor) — skip marketing page ────────────────────────────
    if (isNative()) {
        if (loading) return null;
        if (isAuthenticated) {
            return user?.role === "driver"
                ? <Navigate to="/driver/home" replace />
                : <Navigate to="/passenger/home" replace />;
        }
        return (
            <div
                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#08110F" }}
                className="flex flex-col"
            >
                <div
                    className="flex-1 flex flex-col items-center justify-center px-10 gap-5"
                    style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
                >
                    <img src="/images/logo-light.png" alt="Townwize" className="w-52" />
                    <p className="text-white/60 text-sm text-center leading-relaxed">
                        Safe, verified rides within<br />Bahria Town Karachi
                    </p>
                </div>
                <div
                    className="px-6 pb-10 space-y-3"
                    style={{ paddingBottom: "env(safe-area-inset-bottom, 40px)" }}
                >
                    <p className="text-white/30 text-xs text-center mb-5 uppercase tracking-widest">
                        BTK Residents Only
                    </p>
                    <button
                        onClick={() => navigate("/login")}
                        className="w-full py-4 rounded-2xl font-bold text-base"
                        style={{ background: "#17BEBB", color: "#fff" }}
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => navigate("/register")}
                        className="w-full py-4 rounded-2xl font-semibold text-base text-white"
                        style={{ border: "2px solid rgba(255,255,255,0.25)" }}
                    >
                        Create Account
                    </button>
                </div>
            </div>
        );
    }

    // Google Maps popstate reload
    window.addEventListener("popstate", () => sessionStorage.setItem("forceReload", "1"));
    if (sessionStorage.getItem("forceReload") === "1") {
        sessionStorage.removeItem("forceReload");
        window.location.reload();
    }

    return (
        <div className="bg-gray-100 dark:bg-townwize-bgDark text-townwize-textPrimary dark:text-white">
            <Navbar />

            {/* ─── HERO ─────────────────────────────────────────────────────── */}
            <section className="relative bg-white dark:bg-townwize-primaryDark text-townwize-textPrimary dark:text-white overflow-hidden pt-10 pb-24 transition-colors duration-300">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center px-6 sm:px-10 gap-12">

                    {/* Left content */}
                    <div className="flex-1 text-left">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
                            Trusted Rides by
                            <span className="text-townwize-accent"> Bahria Town Karachi Residents</span>
                        </h1>
                        <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-8">
                            Private and shared rides driven by verified BTK residents — for residents, visitors, and guests via secure referrals.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                            <button
                                onClick={() => navigate("/passenger/home")}
                                className="px-8 py-3 rounded-xl bg-townwize-primary text-white hover:bg-townwize-accent hover:text-townwize-primary font-semibold shadow-md transition-all"
                            >
                                Book a Ride
                            </button>
                            <button
                                onClick={() => navigate("/register")}
                                className="px-8 py-3 rounded-xl border-2 border-townwize-primary dark:border-townwize-accent text-townwize-primary dark:text-townwize-accent hover:bg-townwize-primary hover:text-white font-semibold transition-all"
                            >
                                Become a Wizer
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                            Verified BTK residents • Secure referrals for guests • City-wide travel
                        </p>
                    </div>

                    {/* Right illustration */}
                    <div className="flex-1 flex justify-center">
                        <img
                            src="/images/hero-illustration.png"
                            alt="Townwize Hero Illustration"
                            className="w-full rounded-xl shadow-lg object-contain animate-fadeInUp"
                        />
                    </div>
                </div>
            </section>

            {/* ─── TRUST STATS STRIP ────────────────────────────────────────── */}
            <section className="bg-white dark:bg-townwize-primaryDark border-b border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {TRUST_STATS.map(({ icon: Icon, title, sub }) => (
                        <div key={title} className="flex flex-col items-center text-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-townwize-primary/10 dark:bg-white/10 flex items-center justify-center">
                                <Icon className="text-townwize-primary dark:text-white text-lg" />
                            </div>
                            <p className="font-bold text-townwize-primary dark:text-white text-sm">{title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── HOW TOWNWIZE WORKS ───────────────────────────────────────── */}
            <section className="py-24 bg-gray-50 dark:bg-townwize-bgDark">
                <div className="max-w-6xl mx-auto px-6 lg:px-12">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3 text-townwize-primary dark:text-white">
                        How Townwize Works
                    </h2>
                    <p className="text-center text-townwize-textSecondary dark:text-gray-400 mb-16 max-w-xl mx-auto text-sm">
                        Whether you're a resident or a guest, getting started is simple and secure.
                    </p>

                    {/* 3-step flow */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden shadow-sm">
                        {[
                            {
                                num: "01",
                                icon: FaUserCheck,
                                title: "Verify & Join",
                                body: "BTK residents register as a Towner or Wizer and complete identity verification. Guests join via a one-time resident referral.",
                            },
                            {
                                num: "02",
                                icon: FaCar,
                                title: "Book Your Ride",
                                body: "Set your pickup and drop-off anywhere in Karachi. Choose Private for a solo trip, or RideTogether to share and save.",
                            },
                            {
                                num: "03",
                                icon: FaShieldAlt,
                                title: "Ride with Confidence",
                                body: "Your driver is a verified BTK resident. Track live, rate your trip, and enjoy community-trusted travel every time.",
                            },
                        ].map(({ num, icon: Icon, title, body }, i) => (
                            <Motion.div
                                key={num}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.1 }}
                                className="bg-white dark:bg-townwize-primaryDark p-10 flex flex-col gap-5"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl font-black text-gray-100 dark:text-gray-700 leading-none select-none">
                                        {num}
                                    </span>
                                    <div className="w-10 h-10 rounded-xl bg-townwize-primary/8 dark:bg-white/5 flex items-center justify-center shrink-0">
                                        <Icon className="text-townwize-primary dark:text-white text-lg" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold mb-2 text-townwize-primary dark:text-white">{title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
                                </div>
                            </Motion.div>
                        ))}
                    </div>

                    {/* Referral callout */}
                    <div className="mt-6 bg-white dark:bg-townwize-primaryDark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="w-10 h-10 rounded-xl bg-townwize-primary/8 dark:bg-white/5 flex items-center justify-center shrink-0">
                            <FaUserCheck className="text-townwize-primary dark:text-white text-lg" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-townwize-primary dark:text-white text-sm mb-1">Secure Referral System</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Guests & visitors can only join with a one-time code issued by a verified BTK resident — keeping the community closed and trusted.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/register")}
                            className="shrink-0 px-5 py-2.5 rounded-xl border border-townwize-primary dark:border-white/20 text-townwize-primary dark:text-white text-sm font-semibold hover:bg-townwize-primary hover:text-white dark:hover:bg-white/10 transition-all"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </section>

            {/* ─── WHY CHOOSE TOWNWIZE ──────────────────────────────────────── */}
            <section className="py-24 bg-white dark:bg-townwize-primaryDark">
                <div className="max-w-6xl mx-auto px-6 sm:px-10">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-townwize-primary dark:text-white mb-3">
                        Why Choose Townwize
                    </h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-16 text-sm">
                        Built exclusively for BTK — not a generic ride app adapted for the area.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: FaCar,
                                label: "Private Rides",
                                title: "Your ride, your rules",
                                body: "Book a direct, private trip with a vetted BTK driver. No strangers, no detours — just comfortable, reliable travel.",
                                stat: "Solo & direct",
                            },
                            {
                                icon: FaUsers,
                                label: "RideTogether",
                                title: "Share & save with neighbours",
                                body: "Match with neighbours heading the same way, split the fare, and reduce traffic — community travel that makes sense.",
                                stat: "Up to 50% cheaper",
                                featured: true,
                            },
                            {
                                icon: FaShieldAlt,
                                label: "Safety First",
                                title: "Every driver is verified",
                                body: "All Wizers complete identity and residency checks before their first ride. You always know who's driving.",
                                stat: "100% vetted drivers",
                            },
                        ].map(({ icon: Icon, label, title, body, stat, featured }) => (
                            <Motion.div
                                key={label}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                                className={`relative rounded-2xl p-8 flex flex-col gap-4 transition-all duration-300 ${
                                    featured
                                        ? "bg-townwize-primary text-white shadow-xl ring-2 ring-townwize-primary/20"
                                        : "bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-0.5"
                                }`}
                            >
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${featured ? "bg-white/10" : "bg-townwize-primary/8 dark:bg-white/5"}`}>
                                    <Icon className={`text-lg ${featured ? "text-white" : "text-townwize-primary dark:text-white"}`} />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${featured ? "text-white/50" : "text-gray-400"}`}>
                                        {label}
                                    </p>
                                    <h3 className={`text-lg font-bold mb-2 ${featured ? "text-white" : "text-townwize-primary dark:text-white"}`}>
                                        {title}
                                    </h3>
                                    <p className={`text-sm leading-relaxed ${featured ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
                                        {body}
                                    </p>
                                </div>
                                <div className={`mt-auto pt-4 border-t text-xs font-semibold ${featured ? "border-white/10 text-white/60" : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"}`}>
                                    {stat}
                                </div>
                            </Motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── ADVANTAGE ────────────────────────────────────────────────── */}
            <section className="py-24 bg-gray-50 dark:bg-townwize-primaryDark transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="flex justify-center">
                        <img
                            src="/images/advantage-light.png"
                            alt="Townwize Advantage"
                            className="w-full max-w-md lg:max-w-lg dark:hidden rounded-2xl shadow-lg animate-fadeInUp"
                        />
                        <img
                            src="/images/advantage-dark.png"
                            alt="Townwize Advantage"
                            className="w-full max-w-md lg:max-w-lg hidden dark:block rounded-2xl shadow-lg animate-fadeInUp"
                        />
                    </div>
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 text-townwize-primary dark:text-townwize-accent">
                            The Townwize Advantage
                        </h2>
                        <p className="text-lg text-townwize-textSecondary dark:text-gray-300 mb-6">
                            Unlike traditional ride-hailing, Townwize is built exclusively for Bahria Town Karachi — connecting verified residents, ensuring safety, and keeping rides affordable.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <FaShieldAlt className="text-townwize-accent text-xl mt-1 shrink-0" />
                                <span className="text-townwize-textSecondary dark:text-gray-300">
                                    Verified BTK Drivers & Passengers for maximum security.
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaUsers className="text-townwize-accent text-xl mt-1 shrink-0" />
                                <span className="text-townwize-textSecondary dark:text-gray-300">
                                    RideTogether option to share trips and reduce costs.
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaLeaf className="text-townwize-accent text-xl mt-1 shrink-0" />
                                <span className="text-townwize-textSecondary dark:text-gray-300">
                                    Eco-friendly mobility inside Bahria Town — less traffic, less pollution.
                                </span>
                            </li>
                        </ul>
                        <button
                            onClick={() => navigate("/about")}
                            className="mt-8 px-8 py-3 rounded-xl bg-townwize-primary text-white hover:bg-townwize-accent hover:text-townwize-primary font-semibold shadow-md transition-all"
                        >
                            Learn More
                        </button>
                    </div>
                </div>
            </section>

            {/* ─── FAQ ──────────────────────────────────────────────────────── */}
            <section className="py-24 bg-white dark:bg-townwize-bgDark">
                <div className="max-w-6xl mx-auto px-6 lg:px-12">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-16 items-start">

                        {/* Left — sticky label column */}
                        <div className="lg:sticky lg:top-24">
                            <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3">FAQs</p>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-townwize-primary dark:text-white leading-tight mb-4">
                                Got questions?
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
                                Clear answers about how Townwize works, who can join, and what makes us different.
                            </p>
                            <a
                                href="mailto:support@townwize.com"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-townwize-primary dark:border-white/20 text-townwize-primary dark:text-white text-sm font-semibold hover:bg-townwize-primary hover:text-white dark:hover:bg-white/10 transition-all"
                            >
                                Contact Support
                            </a>
                        </div>

                        {/* Right — accordion */}
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {FAQS.map((item, index) => (
                                <div key={index}>
                                    <button
                                        onClick={() => toggleFaq(index)}
                                        className="w-full flex justify-between items-center text-left py-5 gap-6 focus:outline-none group"
                                    >
                                        <span className="text-sm font-semibold text-townwize-primary dark:text-white group-hover:text-townwize-accent dark:group-hover:text-townwize-accent transition-colors">
                                            {item.q}
                                        </span>
                                        <Motion.span
                                            animate={{ rotate: openFaq === index ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-townwize-accent transition-colors"
                                            aria-hidden
                                        >
                                            <FaChevronDown className="text-xs" />
                                        </Motion.span>
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {openFaq === index && (
                                            <Motion.div
                                                key="answer"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1, transition: { height: { duration: 0.28, ease: [0.25, 0.8, 0.25, 1] }, opacity: { duration: 0.22 } } }}
                                                exit={{ height: 0, opacity: 0, transition: { duration: 0.22 } }}
                                                className="overflow-hidden"
                                            >
                                                <p className="pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                                    {item.a}
                                                </p>
                                            </Motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── CTA + APP STORE TEASER ───────────────────────────────────── */}
            <section className="bg-townwize-bgLight dark:bg-townwize-primaryDark py-24 text-center">
                <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-townwize-primary dark:text-white">
                        Ride Smarter. Ride Safer. Ride Together.
                    </h2>
                    <p className="mb-2 text-lg text-townwize-textSecondary dark:text-gray-300">
                        Community-first rides built exclusively for Bahria Town Karachi.
                    </p>
                    <p className="mb-12 text-sm text-townwize-textSecondary dark:text-gray-400">
                        Verified residents · Trusted drivers · Secure referrals
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
                        <button
                            onClick={() => navigate("/passenger/home")}
                            className="px-10 py-3.5 rounded-xl bg-townwize-accent text-townwize-primary font-bold shadow-lg hover:brightness-110 transition-all"
                        >
                            Book a Ride Now
                        </button>
                        <button
                            onClick={() => navigate("/register")}
                            className="px-10 py-3.5 rounded-xl border-2 border-townwize-primary dark:border-townwize-accent text-townwize-primary dark:text-townwize-accent font-semibold hover:bg-townwize-primary hover:text-white dark:hover:bg-townwize-accent dark:hover:text-townwize-primary transition-all"
                        >
                            Create Account
                        </button>
                    </div>

                    <div className="inline-flex flex-col items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-10 sm:px-16 py-10 border border-gray-100 dark:border-gray-700">
                        <p className="font-bold text-lg text-townwize-primary dark:text-white">Mobile App — Coming Soon</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            Currently available on the web. Native iOS & Android apps are launching soon.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 mt-2">
                            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-semibold cursor-default select-none">
                                <FaApple className="text-xl" />
                                App Store
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-townwize-accent/20 text-townwize-accent">Soon</span>
                            </div>
                            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-semibold cursor-default select-none">
                                <FaGooglePlay className="text-xl" />
                                Google Play
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-townwize-accent/20 text-townwize-accent">Soon</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Get notified when we launch ↓</p>
                    </div>
                </Motion.div>
            </section>

            <Footer />
        </div>
    );
};

export default Landing;
