import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaStar, FaGift, FaCopy, FaShareAlt, FaTicketAlt } from "react-icons/fa";
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
  const [referralData, setReferralData] = useState(null);
  const [coupons, setCoupons] = useState([]);

  const fetchReferral = useCallback(async () => {
    try {
      const [codeRes, couponsRes] = await Promise.all([
        api.get("/referral/my-code"),
        api.get("/coupons/my"),
      ]);
      if (codeRes.data?.success) setReferralData(codeRes.data.data);
      if (couponsRes.data?.success) setCoupons(couponsRes.data.data.coupons || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const handleCopyCode = () => {
    if (!referralData?.inviteLink) return;
    navigator.clipboard.writeText(referralData.inviteLink);
    toast.success("Referral link copied!");
  };

  const handleShareCode = async () => {
    if (!referralData?.inviteLink) return;
    if (navigator.share) {
      await navigator.share({ title: "Join as a Wizer", url: referralData.inviteLink, text: "Join Townwize as a Wizer!" });
    } else {
      handleCopyCode();
    }
  };

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

      {/* Referral & Rewards card */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 space-y-5">
        <div className="flex items-center gap-2">
          <FaGift className="text-townwize-primary" />
          <h2 className="text-lg font-semibold">Referral & Rewards</h2>
        </div>

        {/* Referral code */}
        <div className="rounded-2xl bg-townwize-primary p-5 text-white space-y-2">
          <p className="text-xs text-white/60">Your Wizer referral code</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold font-mono tracking-widest">{referralData?.code || "—"}</span>
            <button onClick={handleCopyCode} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><FaCopy /></button>
            <button onClick={handleShareCode} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><FaShareAlt /></button>
          </div>
          {referralData?.inviteLink && (
            <p className="text-xs text-white/40 break-all">{referralData.inviteLink}</p>
          )}
          <div className="flex gap-4 text-xs text-white/60 pt-1 border-t border-white/10">
            <span>{referralData?.rewardsEarned ?? "—"} rewards earned</span>
            <span>{referralData?.pendingRewards ?? "—"} pending</span>
          </div>
        </div>

        {/* Active coupons */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Coupons</p>
          {coupons.length === 0 ? (
            <p className="text-sm text-gray-400">No active coupons. Refer a Wizer to earn commission discounts.</p>
          ) : (
            <div className="space-y-2">
              {coupons.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50">
                  <FaTicketAlt className="text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-700 text-sm">
                      {c.discountPct}% commission discount (max {c.maxDiscountPkr} PKR)
                    </p>
                    <p className="text-xs text-gray-400">
                      {c.origin === "referee_welcome" ? "Welcome reward" : "Referral reward"} · Expires {new Date(c.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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

