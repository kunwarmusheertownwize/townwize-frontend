// src/locales/en.js
//
// English — the source of truth. Every key starts life here.
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
    };
