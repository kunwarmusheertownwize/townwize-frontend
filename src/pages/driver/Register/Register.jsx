import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/shared/Navbar";

export default function DriverRegister() {
    const navigate = useNavigate();

    const handleApply = () => {
        navigate("/register?role=driver");
    };

    return (
        <div className="min-h-screen bg-townwize-bgLight dark:bg-townwize-primaryDark transition-colors">
            <Navbar />
            <div className="max-w-7xl mx-auto px-6 py-20 space-y-20">

                {/* ================= HERO ================= */}
                <section className="grid md:grid-cols-2 gap-10 items-center">
                    <div className="space-y-7">
                        <h1 className="text-5xl font-bold leading-tight text-townwize-primary dark:text-white">
                            Drive & Earn<br />in Bahria Town
                        </h1>

                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl">
                            Join a resident-only ride platform built for safety,
                            flexibility, and predictable earnings.
                        </p>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={handleApply}
                                className="px-9 py-4 rounded-xl bg-townwize-primary text-white font-semibold text-lg hover:opacity-90 transition"
                            >
                                Apply as a Driver
                            </button>
                            <span className="text-sm text-gray-500">
                                Takes ~10 minutes
                            </span>
                        </div>
                    </div>

                    {/* Hero visual card */}
                    <div className="hidden md:flex justify-center">
                        <div className="w-96 h-96 rounded-3xl bg-white dark:bg-gray-900 shadow-xl flex items-center justify-center">
                            <div className="text-center space-y-2">
                                <p className="text-5xl font-bold text-townwize-primary dark:text-townwize-accent">
                                    BTK
                                </p>
                                <p className="text-sm uppercase tracking-wide text-gray-500">
                                    Driver Program
                                </p>
                            </div>
                        </div>
                    </div>

                </section>

                {/* ================= TRUST STRIP ================= */}
                <section className="bg-gray-50 dark:bg-gray-900 rounded-2xl py-10 px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">

                        {[
                            { value: "100%", label: "BTK Routes" },
                            { value: "Verified", label: "Passengers" },
                            { value: "Weekly", label: "Payouts" },
                            { value: "24/7", label: "Support" },
                        ].map((item) => (
                            <div key={item.label}>
                                <p className="text-3xl font-bold text-townwize-primary dark:text-white">
                                    {item.value}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </section>


                {/* ================= ELIGIBILITY ================= */}
                <section>
                    <h2 className="text-3xl font-semibold mb-10 text-center text-gray-800 dark:text-gray-200">
                        Eligibility Requirements
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            "BTK Resident",
                            "Valid Driving License",
                            "Registered Vehicle",
                            "CNIC Verified",
                            "Smartphone with GPS",
                            "Background Verification",
                        ].map((item) => (
                            <div
                                key={item}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm text-center hover:shadow-md transition"
                            >
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-townwize-primary/10 flex items-center justify-center text-townwize-primary font-bold">
                                    ✓
                                </div>
                                <p className="font-medium text-gray-700 dark:text-gray-300">
                                    {item}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ================= EARNINGS ================= */}
                <section className="bg-townwize-primary text-white rounded-3xl p-12 grid md:grid-cols-2 gap-10 items-center shadow-xl">
                    <div>
                        <h2 className="text-3xl font-semibold !text-white">
                            Earn on Your Terms
                        </h2>

                        <p className="mt-3 text-white/90 max-w-md">

                            No fixed shifts. No pressure. Drive when it works for you.
                        </p>
                    </div>

                    <ul className="space-y-3 text-lg">
                        <li>✔ Weekly payouts</li>
                        <li>✔ Accept or reject trips</li>
                        <li>✔ Local BTK routes only</li>
                        <li>✔ No inter-city driving</li>
                    </ul>
                </section>

                {/* ================= DOCUMENTS ================= */}
                <section className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-semibold mb-8 text-center text-gray-800 dark:text-gray-200">
                        What You’ll Need
                    </h2>

                    <ol className="space-y-4 text-gray-600 dark:text-gray-300 text-lg">
                        <li>1. CNIC (front & back)</li>
                        <li>2. Driving license</li>
                        <li>3. Vehicle registration</li>
                        <li>4. Bahria Town residency proof</li>
                        <li>5. Live selfie verification</li>
                    </ol>
                </section>

                {/* ================= FINAL CTA ================= */}
                <section className="text-center bg-gray-100 dark:bg-gray-900 rounded-3xl p-14">
                    <h3 className="text-3xl font-semibold mb-5 text-gray-800 dark:text-white">
                        Ready to Start Driving?
                    </h3>
                    <button
                        onClick={handleApply}
                        className="px-16 py-3 bg-townwize-primary text-white rounded-2xl text-xl font-semibold shadow-lg hover:opacity-90 transition"
                    >
                        Start Driver Registration
                    </button>
                </section>

            </div>
        </div>
    );
}
