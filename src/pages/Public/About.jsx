import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaUsers, FaMapMarkerAlt, FaLeaf } from "react-icons/fa";
import Navbar from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";

const VALUES = [
    {
        icon: FaShieldAlt,
        title: "Safety Above All",
        body: "Every driver and passenger is identity-verified. We don't allow strangers — everyone on Townwize is a known member of the BTK community.",
    },
    {
        icon: FaUsers,
        title: "Community First",
        body: "Townwize is built for neighbours, not for the masses. A closed, trusted network means every ride feels familiar, not unpredictable.",
    },
    {
        icon: FaMapMarkerAlt,
        title: "Hyper-Local Focus",
        body: "We don't try to serve all of Karachi. We serve Bahria Town Karachi — and we do it better than anyone else because of that focus.",
    },
    {
        icon: FaLeaf,
        title: "Sustainable Mobility",
        body: "RideTogether reduces the number of cars on BTK roads. Fewer cars, less congestion, lower emissions — a win for the whole community.",
    },
];

const About = () => {
    const navigate = useNavigate();
    return (
        <div className="bg-white dark:bg-townwize-bgDark">
            <Navbar />

            {/* Hero */}
            <section className="bg-townwize-primary py-20 sm:py-28">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-townwize-accent mb-4">
                        Our Story
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
                        Built for BTK.<br />By BTK Residents.
                    </h1>
                    <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
                        Townwize started with a simple observation: Bahria Town Karachi is a self-contained community that deserved its own trusted, verified ride platform.
                    </p>
                </div>
            </section>

            {/* Mission */}
            <section className="py-20 bg-white dark:bg-townwize-bgDark">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3">Mission</p>
                            <h2 className="text-3xl font-extrabold text-townwize-primary dark:text-white mb-5">
                                Making BTK mobility safe, affordable, and community-driven
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                                Generic ride apps are built for volume. Townwize is built for trust. Every driver on our platform is a verified BTK resident who has passed identity and residency checks — not a random contractor dispatched from a call centre.
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                We believe that when you know your driver is your neighbour, the whole experience changes. That's the Townwize difference.
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-townwize-primaryDark rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
                            <div className="space-y-5">
                                {[
                                    { label: "Service Area", value: "Bahria Town Karachi + Citywide" },
                                    { label: "Driver Model", value: "Verified BTK residents only" },
                                    { label: "Passenger Access", value: "Residents + verified referrals" },
                                    { label: "Ride Types", value: "Private & RideTogether (shared)" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <span className="text-sm text-gray-400 dark:text-gray-500">{label}</span>
                                        <span className="text-sm font-semibold text-townwize-primary dark:text-white">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="py-20 bg-gray-50 dark:bg-townwize-primaryDark">
                <div className="max-w-5xl mx-auto px-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-townwize-accent mb-3 text-center">What We Stand For</p>
                    <h2 className="text-3xl font-extrabold text-townwize-primary dark:text-white mb-12 text-center">
                        Our Values
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {VALUES.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="bg-white dark:bg-townwize-bgDark rounded-2xl p-7 border border-gray-100 dark:border-gray-700">
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

            {/* CTA */}
            <section className="py-20 bg-townwize-primary text-center">
                <div className="max-w-2xl mx-auto px-6">
                    <h2 className="text-3xl font-extrabold text-white mb-4">Ready to join the community?</h2>
                    <p className="text-white/60 mb-8">Register as a Towner or apply to become a verified Wizer.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => navigate("/register")}
                            className="px-8 py-3 rounded-xl bg-townwize-accent text-townwize-primary font-bold hover:brightness-110 transition-all"
                        >
                            Create Account
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            className="px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-all"
                        >
                            Learn More
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default About;
