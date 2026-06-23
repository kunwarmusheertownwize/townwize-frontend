import { Navigate, useNavigate } from "react-router-dom";
import {
    FaCar,
    FaUsers,
    FaShieldAlt,
    FaApple,
    FaGooglePlay,
    FaUserCheck,
    FaQuestionCircle,
    FaLeaf,
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

const FEATURES = [
    {
        img:   "/images/private-ride.png",
        title: "Private Rides",
        body:  "Comfortable, direct travel with vetted BTK drivers — perfect for daily commutes or errands.",
    },
    {
        img:   "/images/pool-ride.png",
        title: "RideTogether",
        body:  "Share rides with neighbours, split fares, and cut traffic — eco-friendly travel made simple.",
    },
    {
        img:   "/images/safety.png",
        title: "Safety First",
        body:  "Every driver is a verified BTK resident with secure ID checks — community safety at its core.",
    },
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
                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#03311C" }}
                className="flex flex-col"
            >
                <div
                    className="flex-1 flex flex-col items-center justify-center px-10 gap-5"
                    style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
                >
                    <img src="/logo-white.png" alt="Townwize" className="w-52" />
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
            <section className="relative max-w-7xl mx-auto px-6 lg:px-12 py-20">
                <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4 text-townwize-primary dark:text-townwize-accent">
                    How Townwize Works
                </h2>
                <p className="text-center text-townwize-textSecondary dark:text-gray-300 mb-12 max-w-2xl mx-auto">
                    Whether you're a resident or a guest, getting started is quick and secure.
                </p>

                <div className="grid md:grid-cols-6 md:grid-rows-2 gap-6 relative z-10">
                    <div className="md:col-span-2 md:row-span-2 bg-townwize-bgLight dark:bg-townwize-primaryDark rounded-2xl p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between border border-transparent dark:border-gray-700">
                        <div>
                            <h3 className="text-xl font-bold mb-3 text-townwize-primary dark:text-townwize-accent">
                                1. Join Townwize
                            </h3>
                            <p className="text-sm text-townwize-textSecondary dark:text-gray-300">
                                BTK residents register as Wizers or Towners. Guests can join securely via a referral from a verified resident.
                            </p>
                        </div>
                        <div className="mt-6">
                            <img src="/images/how-it-works-light.png" alt="Join Townwize" className="max-w-[220px] dark:hidden mx-auto md:mx-0" />
                            <img src="/images/how-it-works-dark.png"  alt="Join Townwize" className="max-w-[220px] hidden dark:block mx-auto md:mx-0" />
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-3 text-townwize-primary dark:text-townwize-accent">
                            2. Book Your Ride
                        </h3>
                        <p className="text-sm text-townwize-textSecondary dark:text-gray-300 flex-grow">
                            Set pickup & drop-off anywhere in Karachi. Choose between Private or RideTogether.
                        </p>
                        <FaCar className="text-5xl ml-auto text-townwize-accent mt-4 opacity-60" />
                    </div>

                    <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-3 text-townwize-primary dark:text-townwize-accent">
                            3. Ride Securely
                        </h3>
                        <p className="text-sm text-townwize-textSecondary dark:text-gray-300 flex-grow">
                            Verified BTK drivers ensure every ride is safe, reliable, and community-trusted.
                        </p>
                        <FaShieldAlt className="text-5xl ml-auto text-townwize-accent mt-4 opacity-60" />
                    </div>

                    <div className="md:col-span-4 bg-townwize-accent/10 dark:bg-townwize-accent/20 rounded-2xl p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-6 border border-townwize-accent/20 dark:border-gray-700">
                        <div className="w-12 h-12 shrink-0 rounded-full bg-townwize-accent/20 flex items-center justify-center">
                            <FaUserCheck className="text-townwize-accent text-xl" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1 text-townwize-primary dark:text-townwize-accent">Secure Referral System</h3>
                            <p className="text-sm text-townwize-textSecondary dark:text-gray-300">
                                Guests & visitors can only join with a one-time referral code issued by a verified Bahria Town resident — keeping the community closed and trusted.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FEATURES ─────────────────────────────────────────────────── */}
            <section className="py-20 bg-white dark:bg-townwize-primaryDark transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center text-townwize-primary dark:text-townwize-accent mb-4">
                        Why Choose Townwize
                    </h2>
                    <p className="text-center text-townwize-textSecondary dark:text-gray-300 max-w-2xl mx-auto mb-12">
                        Whether you ride solo or share, enjoy comfort, safety, and verified community rides inside BTK.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {FEATURES.map(({ img, title, body }) => (
                            <div
                                key={title}
                                className="group bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center"
                            >
                                <div className="w-28 h-28 flex items-center justify-center mb-6 rounded-2xl bg-townwize-accent/10 dark:bg-townwize-accent/15 group-hover:scale-105 transition-transform duration-300">
                                    <img
                                        src={img}
                                        alt={title}
                                        className="h-20 w-20 object-contain"
                                        style={{ filter: "brightness(0) saturate(100%) invert(58%) sepia(82%) saturate(400%) hue-rotate(143deg) brightness(95%)" }}
                                    />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-townwize-primary dark:text-townwize-accent">
                                    {title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                    {body}
                                </p>
                            </div>
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
            <section className="relative py-24 bg-gradient-to-b from-gray-50 to-white dark:from-townwize-primaryDark dark:to-[#0B242A] transition-colors duration-500 overflow-hidden">
                <div className="max-w-4xl mx-auto px-6 sm:px-10 relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-10">
                        <FaQuestionCircle className="text-4xl text-townwize-accent" />
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-townwize-primary dark:text-townwize-accent">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((item, index) => (
                            <Motion.div
                                key={index}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.35, delay: index * 0.05 }}
                                className="rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full flex justify-between items-center text-left px-6 py-5 focus:outline-none"
                                >
                                    <span className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
                                        {item.q}
                                    </span>
                                    <Motion.span
                                        animate={{ rotate: openFaq === index ? 45 : 0 }}
                                        className="text-townwize-accent text-2xl font-bold select-none"
                                        aria-hidden
                                    >
                                        +
                                    </Motion.span>
                                </button>
                                <AnimatePresence initial={false}>
                                    {openFaq === index && (
                                        <Motion.div
                                            key="faq-content"
                                            initial={{ height: 0, opacity: 0, scale: 0.98 }}
                                            animate={{
                                                height: "auto", opacity: 1, scale: 1,
                                                transition: {
                                                    height:  { duration: 0.35, ease: [0.25, 0.8, 0.25, 1] },
                                                    opacity: { duration: 0.3 },
                                                    scale:   { duration: 0.25 },
                                                },
                                            }}
                                            exit={{ height: 0, opacity: 0, scale: 0.98, transition: { duration: 0.3 } }}
                                            className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
                                        >
                                            <div className="px-6 pb-5 text-gray-600 dark:text-gray-300 leading-relaxed">
                                                {item.a}
                                            </div>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </Motion.div>
                        ))}
                    </div>
                </div>
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-townwize-accent/20 rounded-full blur-3xl opacity-50 dark:opacity-30" />
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

            {/* ─── NEWSLETTER ───────────────────────────────────────────────── */}
            <section className="bg-gray-100 dark:bg-townwize-bgDark py-24">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-townwize-primary dark:text-white">
                        Stay in the Loop
                    </h2>
                    <p className="text-townwize-textSecondary dark:text-gray-300 mb-2">
                        Get launch updates, feature announcements, and community-only offers.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                        No spam. Only important updates.
                    </p>

                    {subscribed ? (
                        <Motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-block px-8 py-4 rounded-xl bg-townwize-accent/10 border border-townwize-accent/30 text-townwize-accent font-semibold"
                        >
                            You're on the list. We'll be in touch!
                        </Motion.div>
                    ) : (
                        <form
                            onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                        >
                            <input
                                type="email"
                                placeholder="Your email address"
                                className="px-5 py-3 rounded-xl shadow-sm border border-gray-300 dark:border-gray-600 flex-1 text-black dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-townwize-accent focus:outline-none"
                                required
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 rounded-xl font-semibold bg-townwize-primary text-white hover:bg-townwize-accent hover:text-townwize-primary transition"
                            >
                                Notify Me
                            </button>
                        </form>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Landing;
