// File: src/components/common/Footer.jsx
import React from "react";
import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-full shadow-2xl dark:shadow-lg dark:shadow-townwize-accent text-gray-900 dark:text-white">
            {/* Footer */}
            <footer className="footer mt-12 w-full">
                <div>
                    {/* Logo should always return to Landing page */}
                    <Link to="/" className="inline-block mx-16">
                        <img
                            src="/images/logo-dark.png"
                            alt="Townwize Logo"
                            className="h-15 footer-logo"
                        />
                    </Link>

                    <div className="container mx-auto px-6 max-w-6xl">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
                            {/* Rides */}
                            <div>
                                <h4 className="font-semibold mb-3">{t("footerRides")}</h4>
                                <ul className="space-y-2">
                                    <li>
                                        <Link to="/passenger/home" className="link-secondary">
                                            {t("footerPrivateRides")}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/passenger/home" className="link-secondary">
                                            {t("footerRideTogether")}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/driver/home" className="link-secondary">
                                            {t("footerDriverApp")}
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Community */}
                            <div>
                                <h4 className="font-semibold mb-3">{t("footerCommunity")}</h4>
                                <ul className="space-y-2">
                                    <li>
                                        <Link to="/about" className="link-secondary">
                                            {t("footerAboutUs")}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/community" className="link-secondary">
                                            {t("footerStories")}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/careers" className="link-secondary">
                                            {t("footerJoinTeam")}
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Help */}
                            <div>
                                <h4 className="font-semibold mb-3">{t("footerHelpSupport")}</h4>
                                <ul className="space-y-2">
                                    <li>
                                        <Link to="/guidelines" className="link-secondary">
                                            {t("footerGuidelines")}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/support" className="link-secondary">
                                            {t("footerCustomerSupport")}
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Social */}
                            <div>
                                <h4 className="font-semibold mb-3">{t("footerStayConnected")}</h4>
                                <ul className="flex space-x-4">
                                    <li>
                                        <a
                                            href="https://facebook.com/townwize"
                                            aria-label="Facebook"
                                            className="link-secondary"
                                        >
                                            <FaFacebookF />
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://twitter.com/townwize"
                                            aria-label="Twitter"
                                            className="link-secondary"
                                        >
                                            <FaTwitter />
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://instagram.com/townwize"
                                            aria-label="Instagram"
                                            className="link-secondary"
                                        >
                                            <FaInstagram />
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <hr className="border-gray-300 mt-10 w-full" />
                        <div className="text-center text-gray-400 text-xs mt-2 w-full">
                            © {new Date().getFullYear()} Townwize {t("footerRights")}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Footer;
