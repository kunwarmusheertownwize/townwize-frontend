import { useEffect, useState } from "react";

const STORAGE_KEY = "passengerSettings";

export default function PassengerSettings() {
  const [settings, setSettings] = useState({
    marketingEmails: false,
    tripAlerts: true,
    darkMap: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setSettings((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      // ignore invalid storage payload
    }
  }, []);

  const setField = (key) => (e) => {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: e.target.checked }));
  };

  const onSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-townwize-primary">Settings</h1>
      <div className="bg-white dark:bg-townwize-primaryDark rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <label className="flex items-center justify-between py-2">
          <span className="text-sm">Trip alerts notifications</span>
          <input type="checkbox" checked={settings.tripAlerts} onChange={setField("tripAlerts")} />
        </label>

        <label className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-sm">Marketing emails</span>
          <input type="checkbox" checked={settings.marketingEmails} onChange={setField("marketingEmails")} />
        </label>

        <label className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-sm">Dark map style preference</span>
          <input type="checkbox" checked={settings.darkMap} onChange={setField("darkMap")} />
        </label>

        <div className="pt-2 flex items-center gap-3">
          <button onClick={onSave} className="px-4 py-2 rounded-md bg-townwize-primary text-white text-sm">
            Save Settings
          </button>
          {saved ? <span className="text-sm text-green-600">Settings saved.</span> : null}
        </div>
      </div>
    </div>
  );
}
