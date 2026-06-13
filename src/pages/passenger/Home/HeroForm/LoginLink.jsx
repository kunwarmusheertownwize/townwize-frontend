// File: src/pages/passenger/Home/HeroForm/LoginLink.jsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";


const LoginLink = () => {
    const { t } = useTranslation();
    return (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            <Link to="/login" className="link-secondary">
                {t("loginToSeeActivity")}
            </Link>
        </div>
    );
};
export default LoginLink;
