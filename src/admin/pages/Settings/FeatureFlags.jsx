import { useEffect, useState } from "react";
import { fetchFeatureFlags, updateFeatureFlag } from "../../../api/adminApi";

export default function FeatureFlags() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const json = await fetchFeatureFlags();
      setItems(json?.data?.items || []);
    } catch (e) {
      setError(e.message || "Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onToggle = async (key, enabled) => {
    setSavingKey(key);
    setError("");
    try {
      await updateFeatureFlag(key, { enabled });
      await load();
    } catch (e) {
      setError(e.message || "Failed to update feature flag");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Feature Flags</h1>
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <div className="rounded-xl border bg-white p-5">
        {loading ? (
          <div className="py-6 text-sm text-gray-500">Loading feature flags...</div>
        ) : (
          <div className="space-y-4">
            {items.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-sm">{flag.payload?.label || flag.key}</p>
                  <p className="text-xs text-gray-500">{flag.key}</p>
                </div>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!flag.enabled}
                    disabled={savingKey === flag.key}
                    onChange={(e) => onToggle(flag.key, e.target.checked)}
                  />
                  <span className="text-sm">{flag.enabled ? "Enabled" : "Disabled"}</span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

