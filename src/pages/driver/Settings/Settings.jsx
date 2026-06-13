import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTheme } from "../../../hooks/useTheme";

const APP_VERSION = "1.0.1";

const DEFAULT_SETTINGS = {
    notifications: {
        rideRequests: true,
        tripUpdates: true,
        systemMessages: true,
    },
    availability: {
        autoGoOnline: false,
        allowRideTogether: true,
    },
    navigation: {
        mapView: "default", // default | satellite
        autoCenterMap: true,
    },
};

const DriverSettings = () => {
    const { theme, toggleTheme } = useTheme();
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);

    // mock persistence (localStorage)
    useEffect(() => {
        const saved = localStorage.getItem("driverSettings");
        if (saved) setSettings(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem("driverSettings", JSON.stringify(settings));
    }, [settings]);

    // Dark <> LightMode Toggle state and useEffect
    const [darkMode, setDarkMode] = useState(theme === "light");
    useEffect(() => {
        setDarkMode(theme === "dark");
    }, [theme]);

    const toggle = (path) => {
        setSettings((prev) => {
            const next = structuredClone(prev);
            let ref = next;
            for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
            ref[path[path.length - 1]] = !ref[path[path.length - 1]];
            return next;
        });
        toast.success("Settings updated");
    };

    const setValue = (path, value) => {
        setSettings((prev) => {
            const next = structuredClone(prev);
            let ref = next;
            for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
            ref[path[path.length - 1]] = value;
            return next;
        });
        toast.success("Settings updated");
    };

    return (
        <div className="max-w-4xl mx-auto mt-8 px-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-gray-500">Manage your preferences</p>
            </div>

            {/* Notifications */}
            <Section title="Notifications">
                <Toggle
                    label="Ride Requests"
                    checked={settings.notifications.rideRequests}
                    onChange={() => toggle(["notifications", "rideRequests"])}
                />
                <Toggle
                    label="Trip Updates"
                    checked={settings.notifications.tripUpdates}
                    onChange={() => toggle(["notifications", "tripUpdates"])}
                />
                <Toggle
                    label="System Messages"
                    checked={settings.notifications.systemMessages}
                    onChange={() => toggle(["notifications", "systemMessages"])}
                />
            </Section>

            {/* Availability */}
            <Section title="Availability">
                <Toggle
                    label="Auto Go Online on App Open"
                    checked={settings.availability.autoGoOnline}
                    onChange={() => toggle(["availability", "autoGoOnline"])}
                />
                <Toggle
                    label="Allow RideTogether Requests"
                    checked={settings.availability.allowRideTogether}
                    onChange={() => toggle(["availability", "allowRideTogether"])}
                />
            </Section>

            {/* Navigation */}
            <Section title="Navigation & Maps">
                <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Preferred Map View</span>
                    <select
                        value={settings.navigation.mapView}
                        onChange={(e) =>
                            setValue(["navigation", "mapView"], e.target.value)
                        }
                        className="border rounded p-1 text-sm"
                    >
                        <option value="default">Default</option>
                        <option value="satellite">Satellite</option>
                    </select>
                </div>
                <Toggle
                    label="Auto-center map during trip"
                    checked={settings.navigation.autoCenterMap}
                    onChange={() => toggle(["navigation", "autoCenterMap"])}
                />
            </Section>

            {/* App Preferences */}
            <Section title="App Preferences">
                <Toggle
                    label="Dark Mode"
                    checked={darkMode}
                    onChange={() => {
                        toggleTheme();
                        setDarkMode((v) => !v);
                    }}
                />

                <div className="flex items-center justify-between py-2 text-sm text-gray-500">
                    <span>App Version</span>
                    <span>{APP_VERSION}</span>
                </div>
            </Section>
        </div>
    );
};

const Section = ({ title, children }) => (
    <div className="bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm p-4 mb-6">
        <h2 className="font-semibold mb-3">{title}</h2>
        <div className="space-y-2">{children}</div>
    </div>
);

const Toggle = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={onChange}
            className={`w-10 h-6 rounded-full transition
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-townwize-primary
            focus-visible:ring-offset-2
            ${checked ? "bg-townwize-primary" : "bg-gray-300"}
            `}
        >

            <span
                className={`block w-4 h-4 bg-white rounded-full transform transition ${checked ? "translate-x-5" : "translate-x-1"
                    }`}
            />
        </button>
    </div>
);



export default DriverSettings;
