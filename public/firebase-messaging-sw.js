importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Config is injected at runtime via a custom message from the main thread
self.addEventListener("message", (event) => {
    if (event.data?.type === "FIREBASE_CONFIG") {
        firebase.initializeApp(event.data.config);
        const messaging = firebase.messaging();

        messaging.onBackgroundMessage((payload) => {
            const { title = "Townwize", body = "" } = payload.notification || {};
            self.registration.showNotification(title, {
                body,
                icon: "/images/logo-light.png",
                badge: "/images/logo-light.png",
                data: payload.data || {},
                tag: payload.data?.rideId || "townwize",
                renotify: true,
            });
        });
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const rideId = event.notification.data?.rideId;
    const url = rideId ? `/passenger/live-tracking/${rideId}` : "/";
    event.waitUntil(clients.openWindow(url));
});
