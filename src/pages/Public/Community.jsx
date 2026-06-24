import { useNavigate } from "react-router-dom";
import { FaUserCheck, FaShieldAlt, FaHandshake, FaUsers } from "react-icons/fa";
import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

const PILLARS = [
    {
        icon: FaUserCheck,
        title: "Verified Members Only",
        body: "Every person on Townwize — driver or passenger — has been identity-verified. You always know who you're riding with.",
    },
    {
        icon: FaShieldAlt,
        title: "Safety by Design",
        body: "From referral-only guest access to real-time trip tracking, safety is woven into every feature we build.",
    },
    {
        icon: FaHandshake,
        title: "Mutual Respect",
        body: "Our community guidelines hold everyone to the same standard. Towners and Wizers treat each other as neighbours — because they are.",
    },
    {
        icon: FaUsers,
        title: "Shared Benefit",
        body: "RideTogether reduces traffic and lowers fares. When the community shares, everyone wins — financially and environmentally.",
    },
];

const STORIES = [
    {
        name: "Fatima A.",
        role: "Towner · Phase 7",
        quote: "I used to hesitate getting into any car I didn't know. With Townwize I actually feel comfortable — I know the driver is a BTK resident like me.",
    },
    {
        name: "Usman K.",
        role: "Wizer · Phase 4",
        quote: "I drive to work anyway, so picking up neighbours on my route actually earns me something. It's become a real part of my routine.",
    },
    {
        name: "Sara M.",
        role: "Towner (Guest via referral) · Visiting Phase 2",
        quote: "My cousin referred me. I was visiting BTK for a month and Townwize made getting around so easy — I didn't have to depend on anyone.",
    },
];

const Community = () => {
    const navigate = useNavigate();
    return (
        <div className="bg-white dark:bg-townwize-bgDark">
            <Navbar />

            {/* Hero */}
            <section className="bg-townwize-primary py-20 sm:py-28 text-center">
                <div className="max-w-3xl mx-auto px-6">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                        The Townwize Community
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
                        More than a ride app.<br />A BTK network.
                    </h1>
                    <p className="text-white/60 text-base max-w-xl mx-auto">
                        Townwize works because the people on it know each other. We're a community of Bahria Town Karachi residents — drivers, passengers, and guests — moving together.
                    </p>
                </div>
            </section>

            {/* Pillars */}
            <section className="py-20 bg-white dark:bg-townwize-bgDark">
                <div className="max-w-5xl mx-auto px-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3 text-center">What Holds Us Together</p>
                    <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-10 text-center">
                        Our Community Pillars
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {PILLARS.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="bg-gray-50 dark:bg-townwize-primaryDark rounded-2xl p-7 border border-gray-100 dark:border-gray-700">
                                <div className="w-10 h-10 rounded-xl bg-townwize-primary/8 dark:bg-white/5 flex items-center justify-center mb-4">
                                    <Icon className="text-townwize-primary dark:text-white" />
                                </div>
                                <h3 className="font-bold text-townwize-primary dark:text-white mb-2">{title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stories */}
            <section className="py-20 bg-gray-50 dark:bg-townwize-primaryDark">
                <div className="max-w-5xl mx-auto px-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3 text-center">Voices from BTK</p>
                    <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-white mb-10 text-center">
                        Community Stories
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {STORIES.map(({ name, role, quote }) => (
                            <div key={name} className="bg-white dark:bg-townwize-bgDark rounded-2xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic flex-1">
                                    "{quote}"
                                </p>
                                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="w-8 h-8 rounded-full bg-townwize-primary/10 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-townwize-primary dark:text-white">
                                        {name[0]}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-townwize-primary dark:text-white">{name}</p>
                                        <p className="text-[11px] text-gray-400">{role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-townwize-primary text-center">
                <div className="max-w-2xl mx-auto px-6">
                    <h2 className="text-3xl font-extrabold text-white mb-4">Become part of the community</h2>
                    <p className="text-white/60 mb-8 text-sm">
                        Register as a Towner to book rides, or apply as a Wizer to drive and earn — all within BTK.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => navigate("/register")}
                            className="px-8 py-3 rounded-xl bg-townwize-accent text-townwize-primary font-bold hover:brightness-110 transition-all"
                        >
                            Join Townwize
                        </button>
                        <button
                            onClick={() => navigate("/guidelines")}
                            className="px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-all"
                        >
                            Read Guidelines
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Community;
