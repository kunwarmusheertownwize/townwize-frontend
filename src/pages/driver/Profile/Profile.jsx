import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaStar, FaGift, FaCopy, FaShareAlt, FaTicketAlt, FaCamera, FaCar } from "react-icons/fa";
import { HiOutlineMail, HiOutlinePhone, HiOutlineShieldCheck, HiOutlineClipboardCheck, HiOutlineStar } from "react-icons/hi";
import { toast } from "react-toastify";
import api from "../../../services/api";
import AuthContext from "../../../contexts/AuthContext";

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

const CONDITION_SLOTS = [
  { field: "vehiclePhotoFront",         key: "front",          label: "Front" },
  { field: "vehiclePhotoRear",          key: "rear",           label: "Rear" },
  { field: "vehiclePhotoLeft",          key: "left",           label: "Left" },
  { field: "vehiclePhotoRight",         key: "right",          label: "Right" },
  { field: "vehiclePhotoInteriorFront", key: "interior_front", label: "Interior Front" },
  { field: "vehiclePhotoInteriorRear",  key: "interior_rear",  label: "Interior Rear" },
  { field: "vehiclePhotoOdometer",      key: "odometer",       label: "Odometer" },
];

const CONDITION_COLORS = {
  pass:          "bg-green-100 text-green-700",
  fail:          "bg-red-100 text-red-700",
  needs_recheck: "bg-amber-100 text-amber-700",
  pending:       "bg-gray-100 text-gray-500",
};

function VehicleConditionCard({ profile, onUploaded }) {
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const inputRefs = useRef({});

  const uploadedKeys = new Set(
    (profile?.vehicle?.conditionPhotos || []).filter((p) => p?.url).map((p) => p.key)
  );
  const conditionStatus = profile?.vehicle?.conditionStatus || "pending";
  const conditionScore  = profile?.vehicle?.conditionScore ?? null;
  const hasSelection    = Object.values(files).some(Boolean);

  const handleFile = (field, e) => {
    const f = e.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [field]: f }));
  };

  const handleSubmit = async () => {
    if (!hasSelection) return;
    setUploading(true);
    try {
      const formData = new FormData();
      CONDITION_SLOTS.forEach(({ field }) => {
        if (files[field]) formData.append(field, files[field]);
      });
      await api.post("/driver/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Photos submitted — admin will review within 24 hours");
      setFiles({});
      Object.values(inputRefs.current).forEach((el) => { if (el) el.value = ""; });
      onUploaded?.();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl bg-white dark:bg-townwize-primaryDark p-6 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FaCamera className="text-townwize-primary dark:text-white" />
          <h2 className="text-lg font-semibold dark:text-white">Vehicle Condition Photos</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CONDITION_COLORS[conditionStatus] || CONDITION_COLORS.pending}`}>
            {conditionStatus.replace("_", " ")}
          </span>
          {conditionScore != null && conditionScore > 0 && (
            <span className="text-xs text-gray-400">Score: {conditionScore}/100</span>
          )}
        </div>
      </div>

      {conditionStatus === "needs_recheck" && (
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          Admin has requested a re-check. Please update your condition photos below.
        </p>
      )}
      {conditionStatus === "fail" && (
        <p className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          Your vehicle failed the condition check. Upload updated photos to request a re-review.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CONDITION_SLOTS.map(({ field, key, label }) => {
          const alreadyUploaded = uploadedKeys.has(key);
          const selected = !!files[field];
          return (
            <label key={field} className={`cursor-pointer rounded-xl border-2 p-3 text-xs transition-all ${
              selected
                ? "border-townwize-accent bg-townwize-accent/5"
                : alreadyUploaded
                ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-700"
                : "border-dashed border-gray-300 dark:border-gray-600"
            }`}>
              <div className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</div>
              <div className={`text-[10px] mb-2 ${selected ? "text-townwize-accent" : alreadyUploaded ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {selected ? files[field].name : alreadyUploaded ? "✓ Uploaded" : "Not uploaded"}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={(el) => { inputRefs.current[field] = el; }}
                onChange={(e) => handleFile(field, e)}
              />
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${selected ? "bg-townwize-accent text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                {selected ? "Change" : "Choose"}
              </span>
            </label>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!hasSelection || uploading}
        className="w-full py-2.5 rounded-xl bg-townwize-primary dark:bg-townwize-accent text-white dark:text-townwize-primary text-sm font-bold disabled:opacity-40 transition"
      >
        {uploading ? "Uploading…" : "Submit Updated Photos"}
      </button>
      <p className="text-[11px] text-gray-400 text-center">
        Only selected photos will be updated. Admin will be notified to re-review.
      </p>
    </div>
  );
}

const DOC_SECTIONS = [
  {
    key: "identity",
    label: "Identity & Selfie",
    getStatus: (p) => p?.identity?.verification?.status || "PENDING",
    getRemark: (p) => p?.identity?.verification?.remarks || "",
    fields: [
      { field: "cnicFront", label: "CNIC Front",  hasUrl: (p) => !!p?.identity?.cnicFrontUrl },
      { field: "cnicBack",  label: "CNIC Back",   hasUrl: (p) => !!p?.identity?.cnicBackUrl  },
      { field: "selfie",    label: "Live Selfie", hasUrl: (p) => !!p?.faceVerification?.selfieUrl },
    ],
  },
  {
    key: "vehicle",
    label: "Vehicle & Licence",
    getStatus: (p) => p?.vehicle?.verification?.status || "PENDING",
    getRemark: (p) => p?.vehicle?.verification?.remarks || "",
    fields: [
      { field: "vehicleRegistration", label: "Vehicle Registration", hasUrl: (p) => !!p?.vehicle?.vehicleRegUrl },
      { field: "licenseFront",        label: "Licence Front",        hasUrl: (p) => !!p?.vehicle?.licenseFrontUrl },
      { field: "licenseBack",         label: "Licence Back",         hasUrl: (p) => !!p?.vehicle?.licenseBackUrl  },
    ],
  },
  {
    key: "residency",
    label: "BTK Residency",
    getStatus: (p) => p?.residency?.verification?.status || "PENDING",
    getRemark: (p) => p?.residency?.verification?.remarks || "",
    fields: [
      { field: "residencyProof", label: "Residency Proof", hasUrl: (p) => !!p?.residency?.proofUrl      },
      { field: "btkIdFront",     label: "BTK ID Front",    hasUrl: (p) => !!p?.residency?.btkIdFrontUrl },
      { field: "btkIdBack",      label: "BTK ID Back",     hasUrl: (p) => !!p?.residency?.btkIdBackUrl  },
    ],
  },
];

const STATUS_STYLE = {
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  PENDING:  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

function DocumentSections({ profile, onUploaded }) {
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const inputRefs = useRef({});

  const handleFile = (field, e) => {
    const f = e.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [field]: f }));
  };

  const hasAny = Object.values(files).some(Boolean);

  const handleSubmit = async () => {
    if (!hasAny) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Object.entries(files).forEach(([field, file]) => { if (file) formData.append(field, file); });
      await api.post("/driver/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Documents re-submitted — admin will review within 24 hours");
      setFiles({});
      Object.values(inputRefs.current).forEach((el) => { if (el) el.value = ""; });
      onUploaded?.();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl bg-white dark:bg-townwize-primaryDark p-6 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 space-y-5">
      <h2 className="text-lg font-semibold dark:text-white">Documents</h2>
      {DOC_SECTIONS.map((section) => {
        const status = String(section.getStatus(profile)).toUpperCase();
        const remark = section.getRemark(profile);
        const isRejected = status === "REJECTED";
        return (
          <div key={section.key} className={`rounded-xl border p-4 space-y-3 ${isRejected ? "border-red-200 dark:border-red-800" : "border-gray-200 dark:border-gray-700"}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-sm dark:text-white">{section.label}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[status] || STATUS_STYLE.PENDING}`}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </span>
            </div>
            {isRejected && remark && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                Rejected: {remark}
              </p>
            )}
            <div className="grid grid-cols-1 gap-2">
              {section.fields.map(({ field, label, hasUrl }) => {
                const submitted = hasUrl(profile);
                const selected = !!files[field];
                return (
                  <label key={field} className={`flex items-center justify-between gap-2 cursor-pointer rounded-lg border px-3 py-2 text-xs transition-all ${
                    selected ? "border-townwize-accent bg-townwize-accent/5" : "border-gray-200 dark:border-gray-700"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={submitted ? "text-green-600" : "text-gray-400"}>
                        {submitted ? "✓" : "○"}
                      </span>
                      <span className="dark:text-gray-200">{label}</span>
                      {selected && <span className="text-townwize-accent font-medium truncate max-w-[120px]">{files[field].name}</span>}
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      selected
                        ? "bg-townwize-accent text-white"
                        : isRejected
                        ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                    }`}>
                      {selected ? "Change" : isRejected ? "Re-upload" : "Update"}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      ref={(el) => { inputRefs.current[field] = el; }}
                      onChange={(e) => handleFile(field, e)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
      {hasAny && (
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full py-2.5 rounded-xl bg-townwize-primary dark:bg-townwize-accent text-white dark:text-townwize-primary text-sm font-bold disabled:opacity-40 transition"
        >
          {uploading ? "Uploading…" : "Re-submit Selected Documents"}
        </button>
      )}
    </div>
  );
}

const DriverProfile = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    toast.info("Logging you out...", { autoClose: 800 });
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 900);
  };
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

  const [loadTick, setLoadTick] = useState(0);

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
  }, [loadTick]);

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
    <div className="mx-auto mt-8 max-w-4xl space-y-4 pb-6">
      {/* Header */}
      <div className="rounded-xl bg-white dark:bg-townwize-primaryDark p-6 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-townwize-primary text-white text-xl font-black">
            W
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Driver Profile</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Registration and verification status</p>
          </div>
        </div>
      </div>

      {/* Referral & Rewards card — top of content */}
      <div className="rounded-xl bg-white dark:bg-townwize-primaryDark p-6 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 space-y-5">
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

      {/* Info card */}
      {(() => {
        const rowIcon = "w-[17px] h-[17px] text-gray-400 dark:text-gray-500 shrink-0";
        const rows = [
          { icon: <HiOutlineMail className={rowIcon} />, label: "Email", value: email },
          { icon: <HiOutlinePhone className={rowIcon} />, label: "Phone", value: profile?.phone || "—" },
          {
            icon: <FaCar className={rowIcon} />, label: "Vehicle",
            value: [profile?.vehicle?.type, profile?.vehicle?.carType, profile?.vehicle?.number].filter(Boolean).join("  ·  ") || "—",
          },
          {
            icon: <HiOutlineShieldCheck className={rowIcon} />, label: "Verification",
            badge: vehicleVerification,
            badgeColor: vehicleVerification === "APPROVED"
              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : vehicleVerification === "REJECTED"
              ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
          },
          {
            icon: <HiOutlineClipboardCheck className={rowIcon} />, label: "Condition Review",
            badge: conditionStatus.charAt(0).toUpperCase() + conditionStatus.slice(1).replace("_", " "),
            badgeColor: conditionStatus === "pass"
              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : conditionStatus === "fail"
              ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
          },
        ];
        return (
          <div className="rounded-xl bg-white dark:bg-townwize-primaryDark shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
            {rows.map(({ icon, label, value, badge, badgeColor }) => (
              <div key={label} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                <span className="flex items-center justify-center w-5 shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
                  {badge ? (
                    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mt-1 ${badgeColor}`}>{badge}</span>
                  ) : (
                    <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5 truncate">{value}</p>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="flex items-center justify-center w-5 shrink-0">
                <HiOutlineStar className="w-[17px] h-[17px] text-gray-400 dark:text-gray-500" />
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Rating</p>
                <StarRow average={profile?.rating?.average} count={profile?.rating?.count || 0} />
              </div>
            </div>
          </div>
        );
      })()}

      <DocumentSections profile={profile} onUploaded={() => setLoadTick((t) => t + 1)} />

      <VehicleConditionCard profile={profile} onUploaded={() => setLoadTick((t) => t + 1)} />

      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate("/register?role=driver")}
          className="w-full rounded-xl bg-townwize-primary dark:bg-townwize-accent px-5 py-3 font-semibold text-white dark:text-townwize-primary"
        >
          Update Registration
        </button>
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-5 py-3 font-semibold text-red-600 dark:text-red-400"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default DriverProfile;

