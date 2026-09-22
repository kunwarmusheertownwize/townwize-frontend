// src/locales/ur.js
//
// اردو. A key missing here falls back to English rather than showing a raw key.
//
// SPLIT OUT OF i18n.js on 21 Sep 2026. It was one 189-line file holding both
// languages inline, which was workable for the 68 keys the app had and would
// not have survived the 62 screens still to translate: every addition touched
// the same file in two places, and a missing Urdu key was invisible.
//
// Keep the two files in the SAME ORDER with the SAME section comments, so a
// gap is obvious when they are read side by side.
//
// One flat namespace on purpose. i18next namespaces would mean rewriting every
// existing t("key") call site as t("ns:key") for no benefit at this size.

export default {
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
    };
