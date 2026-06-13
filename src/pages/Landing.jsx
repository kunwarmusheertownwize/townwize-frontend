// 📄 src/pages/Landing/Landing.jsx
import { Link } from "react-router-dom";
import {
    FaCar,
    FaUsers,
    FaShieldAlt,
    FaApple,
    FaGooglePlay,
    FaUserCheck,
    FaFacebook,
    FaTwitter,
    FaInstagram,
    FaLeaf,
} from "react-icons/fa";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "../components/shared/Navbar";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";


import { useState } from "react";
import { FaQuestionCircle } from "react-icons/fa";
import Footer from "../components/shared/Footer";

const Landing = () => {
    const navigate = useNavigate();
    const [openIndex, setOpenIndex] = useState(null);
    const toggle = (index) => setOpenIndex(openIndex === index ? null : index);
    // ✅ Detect browser back/forward and re-mount Google Maps cleanly
    window.addEventListener("popstate", () => {
        sessionStorage.setItem("forceReload", "1");
    });

    if (sessionStorage.getItem("forceReload") === "1") {
        sessionStorage.removeItem("forceReload");
        window.location.reload(); // ✅ fixed ESLint warning
    }
    const faqs = [
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
            a: "RideTogether is Townwize’s shared ride option. Passengers traveling in the same direction can share a ride, saving money while keeping rides safe within the BTK community.",
        },
        {
            q: "How is Townwize different from other ride apps?",
            a: "Townwize is designed exclusively for BTK, focusing on community safety, verified drivers, and localized service — not an open public platform.",
        },
        {
            q: "Is it available outside BTK?",
            a: "Townwize rides are driven by verified BTK residents and can operate anywhere within Karachi citywide, including to and from Bahria Town Karachi. Though the app is optimized for BTK residents, rides can be booked to and from locations outside BTK as well.",
        },
    ];

    return (

        <div className="bg-gray-100 dark:bg-townwize-bgDark text-textPrimary dark:text-white">
            <Navbar />
            {/* 🩵 HERO SECTION */}
            <section className="relative bg-white dark:bg-townwize-primaryDark text-townwize-textPrimary dark:text-white overflow-hidden pt-10 pb-24 transition-colors duration-300">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center px-6 sm:px-10 gap-12">

                    {/* --- Left content --- */}
                    <div className="flex-1 text-left lg:text-left">
                        <h1 className="text-4xl sm:text-xl lg:text-6xl font-extrabold leading-tight mb-4">
                            Trusted Rides by
                            <span className="text-townwize-accent"> Bahria Town Karachi Residents</span>
                        </h1>
                        <p className="text-lg sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-8">
                            Private and shared rides driven by verified BTK residents — for residents, visitors, and guests via secure referrals.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                            <button
                                onClick={() => navigate("/passenger/home")}
                                className="px-8 py-3 rounded-xl bg-townwize-primary text-white hover:bg-townwize-accent hover:text-townwize-textContent font-semibold shadow-md transition-all"
                            >
                                Book a Ride
                            </button>
                            <button
                                onClick={() => navigate("/driver/register")}
                                className="px-8 py-3 rounded-xl border-2 border-townwize-primary dark:border-townwize-accent text-townwize-primary dark:text-townwize-accent hover:bg-townwize-primary hover:text-white font-semibold transition-all"
                            >
                                Drive with Townwize
                            </button>
                        </div>
                        <p className="mt-4 text-sm font-stretch-200% text-shadow-townwize-primaryDark dark:text-gray-400">
                            Verified BTK residents • Secure referrals for guests • City-wide travel
                        </p>

                    </div>

                    {/* --- Right illustration --- */}
                    <div className="flex-1 flex justify-center">
                        <img
                            src="/images/hero-illustration.png"
                            alt="Townwize Hero Illustration"
                            className="w-full rounded-xl shadow-lg  object-contain animate-fadeInUp"
                        />
                    </div>
                </div>
            </section>


            {/* 🚗 HOW TOWNWIZE WORKS — IMPROVED BENTO GRID */}
            <section className="relative max-w-7xl mx-auto px-6 lg:px-12 py-20">
                <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4 text-townwize-primary dark:text-townwize-accent">
                    How Townwize Works
                </h2>
                <p className="text-center text-townwize-textSecondary dark:text-gray-300 mb-12 max-w-2xl mx-auto">
                    Whether you’re a resident or a guest, getting started is quick and secure.
                </p>

                <div className="grid md:grid-cols-6 md:grid-rows-2 gap-6 relative z-10">
                    {/* Tile 1: Join Townwize (Large) */}
                    <div className="md:col-span-2 md:row-span-2 bg-townwize-bgLight dark:bg-townwize-primaryDark rounded-2xl p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between border border-transparent dark:border-gray-700">
                        <div>
                            <h3 className="text-xl font-bold mb-3 text-townwize-primary dark:text-townwize-accent">
                                1. Join Townwize
                            </h3>
                            <p className="text-sm text-townwize-textSecondary dark:text-gray-300">
                                BTK residents register as Drivers or Passengers. Guests can join securely via a referral from verified residents.
                            </p>
                        </div>
                        <div className="mt-6">
                            <img
                                src="/images/how-it-works-light.png"
                                alt="Join Townwize"
                                className="max-w-[220px] dark:hidden mx-auto md:mx-0"
                            />
                            <img
                                src="/images/how-it-works-dark.png"
                                alt="Join Townwize"
                                className="max-w-[220px] hidden dark:block mx-auto md:mx-0"
                            />
                        </div>
                    </div>

                    {/* Tile 2: Book Ride */}
                    <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-3 text-townwize-primary dark:text-townwize-accent">
                            2. Book Your Ride
                        </h3>
                        <p className="text-sm text-townwize-textSecondary dark:text-gray-300 flex-grow">
                            Set pickup & drop-off anywhere in Karachi. Choose between Private or RideTogether.
                        </p>
                        <FaCar className="text-5xl ml-auto text-townwize-primary dark:text-townwize-accent mt-4" />
                    </div>

                    {/* Tile 3: Ride Securely */}
                    <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-3 text-townwize-primary dark:text-townwize-accent">
                            3. Ride Securely
                        </h3>
                        <p className="text-sm text-townwize-textSecondary dark:text-gray-300 flex-grow">
                            Verified BTK drivers ensure every ride is safe, reliable, and community-trusted.
                        </p>
                        <FaShieldAlt className="text-5xl ml-auto text-townwize-primary dark:text-townwize-accent mt-4" />
                    </div>

                    {/* Tile 4: Referral System */}
                    <div className="md:col-span-4 bg-townwize-accent/10 dark:bg-townwize-accent/20 text-townwize-primary dark:text-townwize-accent rounded-2xl p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center border border-transparent dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-3">Referral System</h3>
                        <p className="text-sm max-w-2xl">
                            Guests & visitors can only join with a one-time secure referral code issued by a verified Bahria Town resident.
                        </p>
                    </div>
                </div>
            </section>


            {/* 🚘 FEATURES SECTION */}
            <section className="py-20 bg-white dark:bg-townwize-primaryDark transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center text-townwize-primary dark:text-townwize-accent mb-4">
                        Why Choose Townwize
                    </h2>
                    <p className="text-center text-townwize-textSecondary dark:text-gray-300 max-w-2xl mx-auto mb-12">
                        Whether you ride solo or share, enjoy comfort, safety, and verified community rides inside BTK.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature 1 – Private Ride */}
                        <div className="group bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center">
                            <FaCar className="text-townwize-primary dark:text-townwize-accent text-5xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-300" />
                            <h3 className="text-xl font-semibold mb-3 text-townwize-primary dark:text-townwize-accent">
                                Private Rides
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                Enjoy comfortable, direct travel with vetted BTK drivers – perfect for daily commutes or errands.
                            </p>
                        </div>

                        {/* Feature 2 – RideTogether */}
                        <div className="group bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center">
                            <FaUsers className="text-townwize-primary dark:text-townwize-accent text-5xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-300" />
                            <h3 className="text-xl font-semibold mb-3 text-townwize-primary dark:text-townwize-accent">
                                RideTogether
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                Share rides with neighbors, split fares, and reduce traffic – eco-friendly travel made simple.
                            </p>
                        </div>

                        {/* Feature 3 – Safety First */}
                        <div className="group bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center">
                            <FaShieldAlt className="text-townwize-primary dark:text-townwize-accent text-5xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-300" />
                            <h3 className="text-xl font-semibold mb-3 text-townwize-primary dark:text-townwize-accent">
                                Safety First
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                Every driver is a verified BTK resident with secure ID checks – community safety at its core.
                            </p>
                        </div>
                    </div>
                </div>
            </section>


            {/* 🌟 ADVANTAGE SECTION */}
            <section className="py-24 bg-gray-50 dark:bg-townwize-primaryDark transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left — Illustration */}
                    <div className="flex justify-center">
                        <img
                            src="/images/advantage-light.png"
                            alt="Townwize Advantage Light"
                            className="w-full max-w-md lg:max-w-lg dark:hidden rounded-2xl shadow-lg animate-fadeInUp"
                        />
                        <img
                            src="/images/advantage-dark.png"
                            alt="Townwize Advantage Dark"
                            className="w-full max-w-md lg:max-w-lg hidden dark:block rounded-2xl shadow-lg animate-fadeInUp"
                        />
                    </div>

                    {/* Right — Content */}
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 text-townwize-primary dark:text-townwize-accent">
                            The Townwize Advantage
                        </h2>
                        <p className="text-lg text-townwize-textSecondary dark:text-gray-300 mb-6">
                            Unlike traditional ride-hailing, Townwize is built exclusively for Bahria Town Karachi — connecting verified residents, ensuring safety, and keeping rides affordable.
                        </p>

                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <FaShieldAlt className="text-townwize-primary dark:text-townwize-accent text-xl mt-1" />
                                <span className="text-townwize-textSecondary dark:text-gray-300">
                                    Verified BTK Drivers & Passengers for maximum security.
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaUsers className="text-townwize-primary dark:text-townwize-accent text-xl mt-1" />
                                <span className="text-townwize-textSecondary dark:text-gray-300">
                                    RideTogether option to share trips and reduce costs.
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaLeaf className="text-townwize-primary dark:text-townwize-accent text-xl mt-1" />
                                <span className="text-townwize-textSecondary dark:text-gray-300">
                                    Eco-friendly mobility inside Bahria Town — less traffic, less pollution.
                                </span>
                            </li>
                        </ul>

                        <button
                            onClick={() => navigate("/about")}
                            className="mt-8 px-8 py-3 rounded-xl bg-townwize-primary text-white hover:bg-townwize-accent hover:text-townwize-textContent font-semibold shadow-md transition-all"
                        >
                            Learn More
                        </button>
                    </div>
                </div>
            </section>

            {/* ❓ PREMIUM FAQ SECTION */}
            <section className="relative py-24 bg-gradient-to-b from-gray-50 to-white dark:from-townwize-primaryDark dark:to-[#0B242A] transition-colors duration-500 overflow-hidden">
                <div className="max-w-4xl mx-auto px-6 sm:px-10 relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-center gap-3 mb-10">
                        <FaQuestionCircle className="text-4xl text-townwize-accent" />
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-townwize-primary dark:text-townwize-accent">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    {/* FAQ List */}
                    <div className="space-y-4">
                        {faqs.map((item, index) => (
                            <Motion.div
                                key={index}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.35, delay: index * 0.05 }}
                                className="rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
                            >
                                {/* Question */}
                                <button
                                    onClick={() => toggle(index)}
                                    className="w-full flex justify-between items-center text-left px-6 py-5 focus:outline-none"
                                >
                                    <span className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
                                        {item.q}
                                    </span>
                                    <Motion.span
                                        animate={{ rotate: openIndex === index ? 45 : 0 }}
                                        className="text-townwize-accent text-2xl font-bold select-none"
                                        aria-hidden
                                    >
                                        +
                                    </Motion.span>

                                </button>

                                {/* Answer */}
                                <AnimatePresence initial={false}>
                                    {openIndex === index && (
                                        <Motion.div
                                            key="faq-content"
                                            initial={{ height: 0, opacity: 0, scale: 0.98 }}
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                                scale: 1,
                                                transition: {
                                                    height: { duration: 0.35, ease: [0.25, 0.8, 0.25, 1] },
                                                    opacity: { duration: 0.3 },
                                                    scale: { duration: 0.25 },
                                                },
                                            }}
                                            exit={{
                                                height: 0,
                                                opacity: 0,
                                                scale: 0.98,
                                                transition: { duration: 0.3 },
                                            }}
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

                {/* Accent Glow */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-townwize-accent/20 rounded-full blur-3xl opacity-50 dark:opacity-30"></div>
            </section>

            {/* End CTA Section */}
            <section className="bg-townwize-bgLight dark:bg-townwize-primaryDark py-24 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-townwize-primary dark:text-white">
                    Ride Smarter. Ride Safer. Ride Together.
                </h2>

                <p className="mb-4 text-lg text-townwize-textSecondary dark:text-gray-300">
                    Community-first rides built exclusively for Bahria Town Karachi.
                </p>

                <p className="mb-12 text-lg text-townwize-textPrimary font-semibold font-stretch-200% dark:text-gray-400">
                    Verified residents • Trusted drivers • Secure referrals
                </p>

                {/* Download Apps with QR Codes */}
                <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {[
                        {
                            title: "Townwize App",
                            qr: "https://townwize.com/passenger-app",
                            ios: "https://townwize.com/passenger-ios",
                            android: "https://townwize.com/passenger-android",
                            accent: "bg-townwize-primary text-white dark:bg-white dark:text-townwize-primary",
                        },
                        {
                            title: "Driver App",
                            qr: "https://townwize.com/driver-app",
                            ios: "https://townwize.com/driver-ios",
                            android: "https://townwize.com/driver-android",
                            accent: "bg-townwize-accent text-townwize-primary dark:bg-townwize-bgLight dark:text-townwize-primary",
                        },

                    ].map((app, idx) => (
                        <div
                            key={idx}
                            className="flex flex-col items-center rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-8 hover:shadow-lg transition bg-white dark:bg-townwize-primaryDark"
                        >
                            <QRCodeSVG value={app.qr} size={120} className="mb-2" />
                            <h3
                                className={`mt-6 text-base font-semibold px-5 py-1.5 rounded-full ${app.title === "Townwize App"
                                    ? "bg-townwize-primary hover:bg-townwize-accent text-townwize-textContent dark:bg-townwize-accent/30 dark:text-white"
                                    : "bg-townwize-primary hover:bg-townwize-accent text-townwize-textContent"
                                    }`}
                            >
                                {app.title}
                            </h3>
                            <p className="mt-2 text-sm text-gray-600 font-medium dark:text-gray-300">
                                {app.title === "Townwize App"
                                    ? "For riders, visitors & guests"
                                    : "For verified BTK drivers"}
                            </p>

                            <p className="mt-2 text-sm text-townwize-textSecondary dark:text-gray-300">
                                Scan with your phone or download from the store
                            </p>

                            <div className="flex gap-4 mt-4">
                                <a href={app.ios} aria-label={`Download ${app.title} on iOS`}>
                                    <FaApple className="text-2xl hover:text-townwize-accent transition" />
                                </a>
                                <a href={app.android} aria-label={`Download ${app.title} on Android`}>
                                    <FaGooglePlay className="text-2xl hover:text-townwize-accent transition" />
                                </a>
                            </div>
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                You can also book a ride using Townwize Web.
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Contact / Newsletter Signup Section */}
            {/* Contact / Newsletter Signup Section */}
            <section className="bg-gray-100 dark:bg-townwize-bgDark py-24">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                        Stay in the Loop
                    </h2>

                    <p className="text-townwize-textSecondary dark:text-gray-300 mb-2">
                        Get launch updates, feature announcements, and community-only offers.
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                        No spam. Only important updates.
                    </p>

                    <form className="flex flex-col sm:flex-row gap-4 justify-center">
                        <input
                            type="email"
                            placeholder="Your email address"
                            className="px-5 py-3 rounded-xl shadow-sm border border-gray-300 dark:border-gray-600 flex-1 text-black dark:text-white focus:ring-2 focus:ring-townwize-accent focus:outline-none"
                            required
                        />
                        <button
                            type="submit"
                            className="p-3.5 rounded-xl font-semibold bg-townwize-primary text-white hover:bg-townwize-primaryDark hover:text-townwize-accent transition button-primary cursor-pointer"
                        >
                            Notify Me
                        </button>
                    </form>
                </div>
            </section>


            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Landing;
