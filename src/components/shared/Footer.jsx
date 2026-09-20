import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { Link } from "react-router-dom";

const NAV = [
    {
        heading: "Rides",
        links: [
            { label: "Private Rides",  to: "/passenger/home" },
            { label: "RideTogether",   to: "/passenger/home" },
            { label: "Driver App",     to: "/driver/home" },
        ],
    },
    {
        heading: "Company",
        links: [
            { label: "About Us",   to: "/about" },
            { label: "Careers",    to: "/careers" },
            { label: "Community",  to: "/community" },
        ],
    },
    {
        heading: "Support",
        links: [
            { label: "Help Centre",  to: "/support" },
            { label: "Guidelines",   to: "/guidelines" },
            { label: "Fares & Charges", to: "/pricing" },
        ],
    },
    // Legal pages used to appear only as text-white/30 in the bottom bar and in
    // no navigation at all. Payment providers and app stores both expect these
    // to be findable, and so does anyone deciding whether to trust the service.
    {
        heading: "Legal",
        links: [
            { label: "Terms of Use",             to: "/terms" },
            { label: "Privacy Policy",           to: "/privacy" },
            { label: "Refunds & Cancellations",  to: "/refunds" },
            // Safepay's agreement (15.4) requires this to be PUBLISHED, which
            // means reachable, not merely routed.
            { label: "Service Delivery",         to: "/service-delivery" },
        ],
    },
];

const SOCIAL = [
    { icon: FaFacebookF,  href: "https://facebook.com/townwize",  label: "Facebook" },
    { icon: FaTwitter,    href: "https://twitter.com/townwize",   label: "Twitter" },
    { icon: FaInstagram,  href: "https://instagram.com/townwize", label: "Instagram" },
    { icon: FaLinkedinIn, href: "https://linkedin.com/company/townwize", label: "LinkedIn" },
];

const Footer = () => (
    <footer className="bg-[#08110f] text-white">

        {/* ── Main grid ── */}
        <div className="max-w-6xl mx-auto px-6 lg:px-12 pt-16 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-10 lg:gap-12">

                {/* Brand column */}
                <div className="flex flex-col gap-5">
                    <Link to="/">
                        <img
                            src="/images/logo-dark.png"
                            alt="Townwize"
                            className="h-8 brightness-0 invert"
                        />
                    </Link>
                    <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                        Community-first rides for verified Bahria Town Karachi residents.
                        Private trips, shared rides, and trusted drivers — all in one place.
                    </p>
                    {/* Social */}
                    <div className="flex items-center gap-3 mt-1">
                        {SOCIAL.map(({ icon: Icon, href, label }) => (
                            <a
                                key={label}
                                href={href}
                                aria-label={label}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-townwize-accent/20 hover:text-townwize-accent flex items-center justify-center text-white/40 transition-all duration-200"
                            >
                                <Icon className="text-xs" />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Nav columns */}
                {NAV.map(({ heading, links }) => (
                    <div key={heading}>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">{heading}</p>
                        <ul className="space-y-3">
                            {links.map(({ label, to }) => (
                                <li key={label}>
                                    <Link
                                        to={to}
                                        className="text-sm text-white/55 hover:text-white transition-colors duration-150"
                                    >
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/8">
            <div className="max-w-6xl mx-auto px-6 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-white/30">
                    © {new Date().getFullYear()} Townwize. All rights reserved.
                </p>
                <div className="flex items-center gap-5">
                    <Link to="/privacy"  className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy Policy</Link>
                    <Link to="/terms"    className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms of Use</Link>
                    <span className="text-xs text-townwize-accent/60 font-medium">BTK Exclusive</span>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
