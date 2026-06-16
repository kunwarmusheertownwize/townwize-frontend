import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../../services/api";
import { useDriverMode } from "../../../contexts/useDriverMode";

const StarRow = ({ average, count }) => {
  const filled = Math.round(average || 0);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <FaStar key={n} className={`text-base ${n <= filled ? "text-yellow-400" : "text-gray-200 dark:text-gray-600"}`} />
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        {average ? Number(average).toFixed(1) : "—"}
      </span>
      {count > 0 && (
        <span className="text-xs text-gray-400">({count} rating{count !== 1 ? "s" : ""})</span>
      )}
    </div>
  );
};

const DriverProfile = () => {
  const navigate = useNavigate();
  const { driverEligibility } = useDriverMode();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("-");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/driver/me");
        if (!mounted) return;
        setProfile(res?.data?.data?.profile || null);
        setEmail(res?.data?.data?.user?.email || "-");
      } catch {
        if (mounted) toast.error("Failed to load driver profile");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const docs = useMemo(() => {
    const p = profile || {};
    return [
      { label: "Residency Proof", ok: Boolean(p?.residency?.proofUrl) },
      { label: "BTK ID Front", ok: Boolean(p?.residency?.btkIdFrontUrl) },
      { label: "BTK ID Back", ok: Boolean(p?.residency?.btkIdBackUrl) },
      { label: "Vehicle Registration", ok: Boolean(p?.vehicle?.vehicleRegUrl) },
      { label: "License Front", ok: Boolean(p?.vehicle?.licenseFrontUrl) },
      { label: "License Back", ok: Boolean(p?.vehicle?.licenseBackUrl) },
      { label: "CNIC Front", ok: Boolean(p?.identity?.cnicFrontUrl) },
      { label: "CNIC Back", ok: Boolean(p?.identity?.cnicBackUrl) },
      { label: "Live Selfie", ok: Boolean(p?.faceVerification?.selfieUrl) },
    ];
  }, [profile]);

  if (loading) {
    return (
      <div className="mx-auto mt-8 max-w-4xl rounded-xl bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">Loading driver profile...</div>
      </div>
    );
  }

  const vehicleVerification = String(profile?.vehicle?.verification?.status || "PENDING").toUpperCase();
  const conditionStatus = String(profile?.vehicle?.conditionStatus || "pending");

  return (
    <div className="mx-auto mt-8 max-w-4xl space-y-4">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold">Driver Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Registration and verification status</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium">{email}</p>
          </div>
          <div>
            <p className="text-gray-500">Phone</p>
            <p className="font-medium">{profile?.phone || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500">Vehicle</p>
            <p className="font-medium">
              {profile?.vehicle?.type || "-"} | {profile?.vehicle?.carType || "-"} | {profile?.vehicle?.number || "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Verification</p>
            <p className="font-medium">{vehicleVerification}</p>
          </div>
          <div>
            <p className="text-gray-500">Condition Review</p>
            <p className="font-medium capitalize">{conditionStatus}</p>
          </div>
          <div>
            <p className="text-gray-500">Eligibility</p>
            <p className="font-medium">
              {driverEligibility.verificationStatus === "APPROVED" &&
              driverEligibility.documentsSubmitted &&
              driverEligibility.registrationComplete
                ? "Ready"
                : "Blocked"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Rating</p>
            <StarRow average={profile?.rating?.average} count={profile?.rating?.count || 0} />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-3 text-lg font-semibold">Document Checklist</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {docs.map((d) => (
            <div key={d.label} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <span>{d.label}</span>
              <span className={d.ok ? "text-green-700" : "text-red-600"}>{d.ok ? "Submitted" : "Missing"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => navigate("/register?role=driver")}
          className="rounded-xl bg-townwize-primary px-5 py-2.5 font-semibold text-white"
        >
          Update Registration
        </button>
      </div>
    </div>
  );
};

export default DriverProfile;

