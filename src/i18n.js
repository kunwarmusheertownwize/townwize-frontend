import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
    en: {
        translation: {
            // Navbar
            darkMode: "Dark Mode",
            lightMode: "Light Mode",
            language: "Language",

            // General
            ride: "Ride",
            drive: "Drive",
            about: "About",
            help: "Help",
            login: "Login",
            register: "Register",
            dashboard: "Dashboard",
            rideHistory: "Ride History",
            wallet: "Wallet",
            account: "Account",
            settings: "Settings",
            logout: "Logout",
            aboutTownwize: "About Townwize",
            offerings: "Our Offerings",
            howItWorks: "How It Works",
            communityStories: "Community Stories",
            careers: "Careers",
            //Passenger Home Page
            //Hero Form
            heroHeadline: "From Bahria Town to anywhere — ride your way",
            heroSubtext: "On the Move",
            addStop: "add a stop",
            addStopHint: "+ You can {{stop}} on the next screen - If you need to!",
            //Features Section
            privateRideAlt: "Private Ride",
            privateRidesTitle: "Private Rides",
            privateRidesDesc: "Comfortable private rides for individuals or families.",
            rideTogetherAlt: "RideTogether",
            rideTogetherTitle: "RideTogether",
            rideTogetherDesc: "Share your ride with others in your community and save money.",
            safetyAlt: "Safety",
            safetyTitle: "Safety Features",
            safetyDesc: "Built-in safety measures to protect every ride, for both passengers and drivers.",
            //App Promo Section
            appPromoTitle: "Get the Townwize App",
            appPromoSubtitle: "Faster bookings, better experience.",
            passengerAppTitle: "Townwize App",
            driverAppTitle: "Driver App",
            scanToStart: "Scan to get started with Townwize",
            ios: "iOS",
            android: "Android",
            //Recent Trips
            recentTripsTitle: "Recent Trips",
            noRecentTrips: "No recent trips yet.",
            //Referral Notice
            referralNoticeText: "Non-BTK guest with an invite?",
            useReferralLink: "Use your unique referral link",
            //Pickup Field
            pickupPlaceholder: "Pickup location",
            useCurrentLocation: "Use current location",
            //Dropoff Field
            dropoffPlaceholder: "Dropoff location",
            //Confirm Button
            enterDropoffWarning: "Please enter a dropoff location",
            rideConfirmed: "Ride Confirmed",
            findRides: "Find Rides",
            //Time Picker
            now: "Now",
            //Date Picker
            weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
            //Login Link
            loginToSeeActivity: "Log in to see your recent activity",
            //Footer
            footerRides: "Rides",
            footerPrivateRides: "Private Rides",
            footerRideTogether: "RideTogether",
            footerDriverApp: "Driver App",
            footerCommunity: "Community",
            footerAboutUs: "About Us",
            footerStories: "Community Stories",
            footerJoinTeam: "Join Our Team",
            footerHelpSupport: "Help & Support",
            footerGuidelines: "Guidelines",
            footerCustomerSupport: "Customer Support",
            footerStayConnected: "Stay Connected",
            footerRights: "All rights reserved.",


        },
    },
    ur: {
        translation: {
            // Navbar
            darkMode: "ڈارک موڈ",
            lightMode: "لائٹ موڈ",
            language: "زبان",
            
            // General
            ride: "سواری",
            drive: "ڈرائیو",
            about: "کے بارے میں",
            help: "مدد",
            login: "لاگ ان",
            register: "رجسٹر کریں",
            dashboard: "ڈیش بورڈ",
            rideHistory: "سواری کی تاریخ",
            wallet: "والیٹ",
            account: "اکاؤنٹ",
            settings: "ترتیبات",
            logout: "لاگ آؤٹ",
            aboutTownwize: "ٹاؤن وائز کے بارے میں",
            offerings: "ہماری خدمات",
            howItWorks: "یہ کیسے کام کرتا ہے",
            communityStories: "کمیونٹی کی کہانیاں",
            careers: "ملازمتیں",
            //Passenger Home Page
            //Hero Form
            heroHeadline: "بحریہ ٹاؤن سے کہیں بھی — اپنی سواری کریں",
            heroSubtext: "ہمہ وقت رواں",
            addStop: "ایک اسٹاپ شامل کریں",
            addStopHint: "+ آپ اگلی اسکرین پر {{stop}} کرسکتے ہیں - اگر ضرورت ہو!",
            //Features Section
            privateRideAlt: "پرائیویٹ سواری",
            privateRidesTitle: "پرائیویٹ سواریاں",
            privateRidesDesc: "افراد یا خاندانوں کے لیے آرام دہ پرائیویٹ سواریاں۔",
            rideTogetherAlt: "رائیڈ ٹوگیدر",
            rideTogetherTitle: "رائیڈ ٹوگیدر",
            rideTogetherDesc: "اپنی کمیونٹی کے دیگر افراد کے ساتھ سواری شیئر کریں اور پیسے بچائیں۔",
            safetyAlt: "حفاظت",
            safetyTitle: "حفاظتی خصوصیات",
            safetyDesc: "ہر سواری کی حفاظت کے لیے بلٹ اِن حفاظتی اقدامات — مسافروں اور ڈرائیورز دونوں کے لیے۔",
            //App Promo Section
            appPromoTitle: "ٹاؤن وائز ایپ حاصل کریں",
            appPromoSubtitle: "تیز بکنگز، بہتر تجربہ۔",
            passengerAppTitle: "ٹاؤن وائز ایپ",
            driverAppTitle: "ڈرائیور ایپ",
            scanToStart: "ٹاؤن وائز کے ساتھ شروع کرنے کے لیے اسکین کریں",
            ios: "آئی او ایس",
            android: "اینڈرائیڈ",
            //Recent Trips
            recentTripsTitle: "حال ہی میں کی گئی سواری",
            noRecentTrips: "ابھی تک کوئی حالیہ سواری نہیں۔",
            //Referral Notice
            referralNoticeText: "کیا آپ BTK کے کسی رہائشی کے مہمان یا وزیٹر ہیں، اور کیا آپ کے پاس Townwize میں شامل ہونے کے لیے دعوت (ریفرل) لنک ہے؟",
            useReferralLink: "اپنے منفرد ریفرل لنک کا استعمال کریں",
            //Pickup Field
            pickupPlaceholder: "پک اپ کا مقام",
            useCurrentLocation: "موجودہ مقام استعمال کریں",
            //Dropoff Field
            dropoffPlaceholder: "ڈراپ آف کا مقام",
            //Confirm Button
            enterDropoffWarning: "براہ کرم ڈراپ آف مقام درج کریں",
            rideConfirmed: "سواری کی تصدیق ہو گئی",
            findRides: "سواری تلاش کریں",
            //Time Picker
            now: "ابھی",
            //Date Picker
            weekdays: ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"],
            //Login Link
            loginToSeeActivity: "اپنی حالیہ سرگرمی دیکھنے کے لیے لاگ ان کریں",
            //Footer
            footerRides: "سواریاں",
            footerPrivateRides: "پرائیویٹ سواریاں",
            footerRideTogether: "رائیڈ ٹوگیدر",
            footerDriverApp: "ڈرائیور ایپ",
            footerCommunity: "کمیونٹی",
            footerAboutUs: "ہمارے بارے میں",
            footerStories: "کمیونٹی کہانیاں",
            footerJoinTeam: "ہماری ٹیم میں شامل ہوں",
            footerHelpSupport: "مدد اور معاونت",
            footerGuidelines: "رہنما اصول",
            footerCustomerSupport: "کسٹمر سپورٹ",
            footerStayConnected: "رابطے میں رہیں",
            footerRights: " کے تمام حقوق محفوظ ہیں ۔  ",

        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: localStorage.getItem("language") || "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
});

export default i18n;
