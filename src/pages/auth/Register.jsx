import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaShieldAlt } from "react-icons/fa";
import { GiSteeringWheel } from "react-icons/gi";
import { FormProvider, useForm } from "react-hook-form";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import { getAppRole } from "../../utils/appRole";
import AccountInfo from "../../components/auth/AccountInfo";
import AuthHeader from "../../components/auth/AuthHeader";
import FaceSection from "../../components/auth/FaceSection";
import IdentitySection from "../../components/auth/IdentitySection";
import ResidencySection from "../../components/auth/ResidencySection";
import WizardProgress from "../../components/auth/wizard/WizardProgress";
import VehicleDetailsStep from "../../components/auth/wizard/VehicleDetailsStep";
import VehiclePhotosStep from "../../components/auth/wizard/VehiclePhotosStep";
import { enforceBusinessRules, schema } from "../../validation/fields";

// ─── step definitions ────────────────────────────────────────────────────────

const PASSENGER_TOWNER_STEPS = [
  { key: "phone",     label: "Phone",     fields: ["phone"] },
  { key: "account",   label: "Account",   fields: ["name", "email", "password"] },
  { key: "residency", label: "Residency", fields: ["btkAddress", "residencyType", "btkProofFile", "btkIdFront", "btkIdBack"] },
  { key: "review",    label: "Review",    fields: [] },
];

const PASSENGER_GUEST_STEPS = [
  { key: "phone",    label: "Phone",    fields: ["phone"] },
  { key: "account",  label: "Account",  fields: ["name", "email", "password"] },
  { key: "identity", label: "Identity", fields: ["cnicFront", "cnicBack"] },
  { key: "review",   label: "Review",   fields: [] },
];

const WIZER_STEPS = [
  { key: "phone",          label: "Phone",    fields: ["phone"] },
  { key: "account",        label: "Account",  fields: ["name", "email", "password"] },
  { key: "residency",      label: "Residency",fields: ["btkAddress", "residencyType", "btkProofFile", "btkIdFront", "btkIdBack"] },
  { key: "vehicle",        label: "Vehicle",  fields: ["vehicleType", "carType", "vehicleMake", "vehicleModel", "vehicleYear", "vehicleSeats", "vehicleNumber", "vehicleColor", "cnicNumber", "vehicleReg", "licenseFront", "licenseBack"] },
  { key: "vehiclePhotos",  label: "Photos",   fields: ["vehiclePhotoFront", "vehiclePhotoRear", "vehiclePhotoLeft", "vehiclePhotoRight", "vehiclePhotoInteriorFront", "vehiclePhotoInteriorRear", "vehiclePhotoOdometer"] },
  { key: "licenseIdentity",label: "Identity", fields: ["cnicFront", "cnicBack"] },
  { key: "review",         label: "Review",   fields: [] },
];

// ─── draft helpers ────────────────────────────────────────────────────────────

const FILE_FIELDS = ["btkProofFile", "btkIdFront", "btkIdBack", "cnicFront", "cnicBack", "vehicleReg", "licenseFront", "licenseBack", "vehiclePhotoFront", "vehiclePhotoRear", "vehiclePhotoLeft", "vehiclePhotoRight", "vehiclePhotoInteriorFront", "vehiclePhotoInteriorRear", "vehiclePhotoOdometer", "selfie"];
const DRAFT_KEY = "tw_reg_draft";

const saveDraft = (role, step, values) => {
  const clean = { ...values };
  FILE_FIELDS.forEach(f => delete clean[f]);
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ role, step, data: clean })); } catch {}
};

const loadDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
};

const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

// ─── default form values ──────────────────────────────────────────────────────

const defaultValues = {
  name: "", email: "", phone: "", password: "",
  btkAddress: "", residencyType: "", cnicNumber: "",
  vehicleType: "Car", carType: "economy",
  vehicleMake: "", vehicleModel: "", vehicleYear: "", vehicleSeats: "4",
  vehicleNumber: "", vehicleColor: "", hasMTag: false,
  btkProofFile: null, btkIdFront: null, btkIdBack: null,
  vehicleReg: null, licenseFront: null, licenseBack: null,
  vehiclePhotoFront: null, vehiclePhotoRear: null, vehiclePhotoLeft: null, vehiclePhotoRight: null,
  vehiclePhotoInteriorFront: null, vehiclePhotoInteriorRear: null, vehiclePhotoOdometer: null,
  cnicFront: null, cnicBack: null, selfie: "",
};

// ─── phone OTP block ──────────────────────────────────────────────────────────

const PhoneOtpBlock = ({ phone, verified, onSend, onVerify, loadingSend, loadingVerify }) => {
  const [code, setCode] = useState("");
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
      <div className="text-sm font-semibold">Phone OTP Verification (WhatsApp)</div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={onSend} disabled={!phone || loadingSend}
          className="px-4 py-2 rounded bg-townwize-primary text-white text-sm disabled:opacity-60">
          {loadingSend ? "Sending…" : "Send OTP"}
        </button>
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="Enter OTP" className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm outline-none" />
        <button type="button" onClick={() => onVerify(code)} disabled={!phone || !code || loadingVerify}
          className="px-4 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-60">
          {loadingVerify ? "Verifying…" : "Verify OTP"}
        </button>
      </div>
      <p className={`text-sm ${verified ? "text-green-600" : "text-amber-600"}`}>
        {verified ? "✓ Phone verified." : "Verify your phone number to continue."}
      </p>
    </div>
  );
};

// ─── review step ─────────────────────────────────────────────────────────────

const ReviewStep = ({ role, values, isGuestTowner, referralOwnerName }) => {
  const Row = ({ label, value }) => value ? (
    <div className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 dark:text-gray-100">{value}</span>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">Almost done!</p>
        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
          Your application will go to admin review. You'll receive an email once approved.
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-1">
        <p className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Account</p>
        <Row label="Name"  value={values.name} />
        <Row label="Email" value={values.email} />
        <Row label="Phone" value={values.phone} />
        <Row label="Role"  value={role === "driver" ? "Wizer (Driver)" : isGuestTowner ? "GuestTowner" : "Towner"} />
        {referralOwnerName && <Row label="Referred by" value={referralOwnerName} />}
      </div>
      {role === "passenger" && !isGuestTowner && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-1">
          <p className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Residency</p>
          <Row label="BTK Address"    value={values.btkAddress} />
          <Row label="Residency Type" value={values.residencyType} />
          <Row label="BTK Proof"      value={values.btkProofFile?.name} />
          <Row label="BTK ID Front"   value={values.btkIdFront?.name} />
          <Row label="BTK ID Back"    value={values.btkIdBack?.name} />
        </div>
      )}
      {role === "passenger" && isGuestTowner && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-1">
          <p className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Identity</p>
          <Row label="CNIC Front" value={values.cnicFront?.name} />
          <Row label="CNIC Back"  value={values.cnicBack?.name} />
        </div>
      )}
      {role === "driver" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-1">
          <p className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Vehicle</p>
          <Row label="Make / Model" value={`${values.vehicleMake} ${values.vehicleModel}`} />
          <Row label="Year"         value={values.vehicleYear} />
          <Row label="Plate"        value={values.vehicleNumber} />
          <Row label="Class"        value={values.carType} />
          <Row label="Condition photos" value={[values.vehiclePhotoFront, values.vehiclePhotoRear, values.vehiclePhotoLeft, values.vehiclePhotoRight, values.vehiclePhotoInteriorFront, values.vehiclePhotoInteriorRear, values.vehiclePhotoOdometer].filter(Boolean).length + " / 7 uploaded"} />
        </div>
      )}
    </div>
  );
};

// ─── main wizard ──────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: inviteCodeParam } = useParams();
  const mode = inviteCodeParam ? "referral" : "normal";

  const forcedRole = getAppRole() || null;
  const [selectedRole, setSelectedRole] = useState(forcedRole || (mode === "referral" ? "passenger" : null));
  const [currentStep, setCurrentStep] = useState(0);
  const [referralCodeType, setReferralCodeType] = useState(null);
  const [referralOwnerName, setReferralOwnerName] = useState("");
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [otpLoadingSend, setOtpLoadingSend] = useState(false);
  const [otpLoadingVerify, setOtpLoadingVerify] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResidency, setShowResidency] = useState(true);
  const [showIdentity, setShowIdentity] = useState(true);
  const [showFace, setShowFace] = useState(true);
  const draftRestored = useRef(false);

  const isGuestTowner = referralCodeType === "GUEST_INVITE";

  const methods = useForm({ resolver: yupResolver(schema), mode: "onChange", defaultValues });
  const phone = methods.watch("phone");

  // ── restore draft ──
  useEffect(() => {
    if (mode === "referral" || draftRestored.current) return;
    const draft = loadDraft();
    if (!draft) return;
    draftRestored.current = true;
    setSelectedRole(draft.role);
    setCurrentStep(draft.step || 0);
    methods.reset({ ...defaultValues, ...draft.data });
    toast.info("Progress restored. Files will need re-uploading.", { autoClose: 5000 });
  }, [mode, methods]);

  // ── validate referral code ──
  useEffect(() => {
    if (!inviteCodeParam) return;
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2";
    fetch(`${BASE_URL}/referral/validate/${encodeURIComponent(inviteCodeParam)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.success) {
          methods.setValue("referralCode", inviteCodeParam, { shouldValidate: true });
          setReferralCodeType(data.data?.codeType || null);
          setReferralOwnerName(data.data?.ownerName || "");
        }
      })
      .catch(() => {});
  }, [inviteCodeParam, methods]);

  // ── step config ──
  const steps = useMemo(() => {
    if (!selectedRole) return [];
    if (mode === "referral") return isGuestTowner ? PASSENGER_GUEST_STEPS : PASSENGER_TOWNER_STEPS;
    return selectedRole === "driver" ? WIZER_STEPS : PASSENGER_TOWNER_STEPS;
  }, [selectedRole, mode, isGuestTowner]);

  const currentStepDef = steps[currentStep] || { key: "review", fields: [] };
  const isLastStep = currentStep === steps.length - 1;

  // ── phone OTP ──
  const handleSendOtp = async () => {
    if (!phone) { toast.error("Enter your phone number first"); return; }
    setOtpLoadingSend(true);
    try {
      await api.post("/auth/phone-otp/send", { phone, channel: "whatsapp" });
      toast.success("OTP sent via WhatsApp");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    } finally { setOtpLoadingSend(false); }
  };

  const handleVerifyOtp = async (code) => {
    setOtpLoadingVerify(true);
    try {
      const res = await api.post("/auth/phone-otp/verify", { phone, code });
      setPhoneVerificationToken(res?.data?.data?.verificationToken || "");
      toast.success("Phone verified");
    } catch (err) {
      toast.error(err?.response?.data?.message || "OTP verification failed");
    } finally { setOtpLoadingVerify(false); }
  };

  // ── navigation ──
  const handleNext = useCallback(async () => {
    const { key, fields } = currentStepDef;

    if (key === "phone" && !phoneVerificationToken) {
      toast.error("Please verify your phone number first");
      return;
    }

    if (fields.length > 0) {
      const valid = await methods.trigger(fields);
      if (!valid) {
        toast.error("Please complete all required fields before continuing");
        return;
      }
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    if (mode !== "referral") saveDraft(selectedRole, nextStep, methods.getValues());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, currentStepDef, methods, mode, phoneVerificationToken, selectedRole]);

  const handleBack = useCallback(() => {
    const prev = currentStep - 1;
    setCurrentStep(prev);
    if (mode !== "referral") saveDraft(selectedRole, prev, methods.getValues());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, mode, methods, selectedRole]);

  // ── submit ──
  const onSubmit = async (values) => {
    if (isSubmitting) return;
    const activeRole = selectedRole;
    const businessErrors = enforceBusinessRules(values, activeRole);
    if (Object.keys(businessErrors).length > 0) {
      Object.entries(businessErrors).forEach(([f, msg]) => methods.setError(f, { type: "manual", message: msg }));
      toast.error("Some required fields are missing. Please go back and check.");
      return;
    }
    if (!phoneVerificationToken) { toast.error("Phone verification is required"); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("role", activeRole);
      formData.append("name", values.name);
      formData.append("email", values.email);
      formData.append("phone", values.phone);
      formData.append("password", values.password);
      formData.append("btkAddress", values.btkAddress || "");
      formData.append("residencyType", values.residencyType || "");
      formData.append("phoneVerificationToken", phoneVerificationToken);
      if (values.referralCode) formData.append("referralCode", values.referralCode);

      if (activeRole === "passenger") {
        if (isGuestTowner) {
          if (values.cnicFront) formData.append("cnicFront", values.cnicFront);
          if (values.cnicBack)  formData.append("cnicBack",  values.cnicBack);
        } else {
          if (values.btkProofFile) formData.append("proofOfResidency", values.btkProofFile);
          if (values.btkIdFront)   formData.append("btkIdFront", values.btkIdFront);
          if (values.btkIdBack)    formData.append("btkIdBack",  values.btkIdBack);
        }
        if (values.selfie?.startsWith?.("data:")) formData.append("selfieData", values.selfie);
      }

      if (activeRole === "driver") {
        formData.append("vehicleType",  values.vehicleType  || "Car");
        formData.append("carType",      values.carType      || "economy");
        formData.append("vehicleMake",  values.vehicleMake  || "");
        formData.append("vehicleModel", values.vehicleModel || "");
        formData.append("vehicleYear",  values.vehicleYear  || "");
        formData.append("vehicleSeats", values.vehicleSeats || "4");
        formData.append("vehicleNumber",values.vehicleNumber|| "");
        formData.append("vehicleColor", values.vehicleColor || "");
        formData.append("hasMTag",      values.hasMTag ? "true" : "false");
        formData.append("cnicNumber",   values.cnicNumber   || "");
        if (values.btkProofFile) formData.append("residencyProof", values.btkProofFile);
        if (values.btkIdFront)  formData.append("btkIdFront", values.btkIdFront);
        if (values.btkIdBack)   formData.append("btkIdBack",  values.btkIdBack);
        if (values.vehicleReg)  formData.append("vehicleRegistration", values.vehicleReg);
        if (values.licenseFront)formData.append("licenseFront", values.licenseFront);
        if (values.licenseBack) formData.append("licenseBack",  values.licenseBack);
        if (values.vehiclePhotoFront)         formData.append("vehiclePhotoFront",         values.vehiclePhotoFront);
        if (values.vehiclePhotoRear)          formData.append("vehiclePhotoRear",           values.vehiclePhotoRear);
        if (values.vehiclePhotoLeft)          formData.append("vehiclePhotoLeft",           values.vehiclePhotoLeft);
        if (values.vehiclePhotoRight)         formData.append("vehiclePhotoRight",          values.vehiclePhotoRight);
        if (values.vehiclePhotoInteriorFront) formData.append("vehiclePhotoInteriorFront",  values.vehiclePhotoInteriorFront);
        if (values.vehiclePhotoInteriorRear)  formData.append("vehiclePhotoInteriorRear",   values.vehiclePhotoInteriorRear);
        if (values.vehiclePhotoOdometer)      formData.append("vehiclePhotoOdometer",       values.vehiclePhotoOdometer);
        if (values.cnicFront) formData.append("cnicFront", values.cnicFront);
        if (values.cnicBack)  formData.append("cnicBack",  values.cnicBack);
        if (values.selfie?.startsWith?.("data:")) formData.append("selfieData", values.selfie);
      }

      await api.post(`/auth/register?role=${activeRole}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearDraft();
      toast.success("Registration submitted! Please check your email to verify your account.");
      navigate("/login", { state: location.state || null, replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── role selection screen ────────────────────────────────────────────────

  if (!selectedRole && mode === "normal") {
    return (
      <div className="min-h-screen w-full bg-townwize-bgLight dark:bg-townwize-primaryDark transition-colors duration-300 pb-safe">
        <AuthHeader />
        <main className="flex flex-col items-center justify-center px-4 py-12 gap-8">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-townwize-accent">Join Townwize</h2>
            <p className="mt-2 text-sm text-gray-500">Choose how you'd like to participate</p>
          </div>
          <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={() => setSelectedRole("passenger")}
              className="rounded-2xl border-2 border-townwize-primary bg-white dark:bg-gray-800 p-8 text-left shadow hover:shadow-lg transition-shadow group"
            >
              <div className="mb-4 inline-flex items-center justify-center h-14 w-14 rounded-xl bg-townwize-primary/10 dark:bg-townwize-primary/20">
                <FaShieldAlt className="text-3xl text-townwize-primary" />
              </div>
              <h3 className="text-lg font-bold text-townwize-primary">Towner</h3>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">Book rides as a verified Bahria Town Karachi resident.</p>
            </button>
            <button
              onClick={() => setSelectedRole("driver")}
              className="rounded-2xl border-2 border-townwize-accent bg-white dark:bg-gray-800 p-8 text-left shadow hover:shadow-lg transition-shadow group"
            >
              <div className="mb-4 inline-flex items-center justify-center h-14 w-14 rounded-xl bg-townwize-accent/10 dark:bg-townwize-accent/20">
                <GiSteeringWheel className="text-3xl text-townwize-accent" />
              </div>
              <h3 className="text-lg font-bold text-townwize-accent">Wizer</h3>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">Drive and earn within the Townwize community.</p>
            </button>
          </div>
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-townwize-primary font-semibold hover:underline">Sign in</button>
          </p>
        </main>
      </div>
    );
  }

  // ─── step content ─────────────────────────────────────────────────────────

  const stepKey = currentStepDef.key;
  const stepTitle = {
    phone:          { title: "Verify Your Phone", sub: "We'll send a one-time code via WhatsApp." },
    account:        { title: "Create Your Account", sub: "Your name and email for login and notifications." },
    residency:      { title: "BTK Residency", sub: "Provide your BTK address and supporting documents." },
    identity:       { title: "Identity Verification", sub: "CNIC is required to verify your identity." },
    vehicle:        { title: "Your Vehicle", sub: "Enter your vehicle details and upload registration documents." },
    vehiclePhotos:  { title: "Vehicle Photos", sub: "Upload condition photos from all required angles." },
    licenseIdentity:{ title: "Your Identity", sub: "Upload your CNIC and complete face verification." },
    review:         { title: "Review & Submit", sub: "Double-check your details before submitting." },
  }[stepKey] || { title: stepKey, sub: "" };

  const values = methods.getValues();

  return (
    <div className="min-h-screen w-full bg-townwize-bgLight dark:bg-townwize-primaryDark transition-colors duration-300 pb-safe">
      <AuthHeader />

      {/* Referral tier banner */}
      {mode === "referral" && referralCodeType === "GUEST_INVITE" && (
        <div className="max-w-xl mx-auto px-4 pt-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Joining as GuestTowner</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Invited by <span className="font-semibold">{referralOwnerName || "a Townwize member"}</span>.
              CNIC only — no BTK residency proof required.
            </p>
          </div>
        </div>
      )}
      {mode === "referral" && referralCodeType === "GENERAL" && (
        <div className="max-w-xl mx-auto px-4 pt-4">
          <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 p-3">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              Referred by {referralOwnerName || "a Townwize member"}
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              You're registering as a full Towner. Full BTK residency verification is required.
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {steps.length > 0 && (
        <WizardProgress steps={steps} currentStep={currentStep} />
      )}

      {/* Step card */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="max-w-xl mx-auto px-4 pb-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-6">

            {/* Step header */}
            <div>
              <h2 className="text-lg font-bold text-townwize-primary dark:text-white">{stepTitle.title}</h2>
              {stepTitle.sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stepTitle.sub}</p>}
            </div>

            {/* ── Step: Phone OTP ── */}
            {stepKey === "phone" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^\d+]/g, "");
                      let digits = raw.replace(/\D/g, "");
                      if (digits.startsWith("3")) digits = `0${digits}`;
                      digits = digits.slice(0, 11);
                      const a = digits.slice(0, 4);
                      const b = digits.slice(4);
                      methods.setValue("phone", b ? `${a}-${b}` : a, { shouldValidate: true, shouldDirty: true });
                    }}
                    placeholder="0300-1234567"
                    inputMode="tel"
                    maxLength={16}
                    className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none text-sm"
                  />
                  {methods.formState.errors.phone && (
                    <p className="text-xs text-red-600 mt-1">{methods.formState.errors.phone.message}</p>
                  )}
                </div>
                <PhoneOtpBlock
                  phone={phone}
                  verified={!!phoneVerificationToken}
                  onSend={handleSendOtp}
                  onVerify={handleVerifyOtp}
                  loadingSend={otpLoadingSend}
                  loadingVerify={otpLoadingVerify}
                />
              </div>
            )}

            {/* ── Step: Account Details ── */}
            {stepKey === "account" && (
              <AccountInfo
                register={methods.register}
                errors={methods.formState.errors}
                showPhone={false}
              />
            )}

            {/* ── Step: BTK Residency ── */}
            {stepKey === "residency" && (
              <ResidencySection
                showResidency={showResidency}
                setShowResidency={setShowResidency}
                setBtkProofProgress={() => {}}
                setBtkFrontProgress={() => {}}
                setBtkBackProgress={() => {}}
              />
            )}

            {/* ── Step: Identity (GuestTowner CNIC) ── */}
            {stepKey === "identity" && (
              <IdentitySection
                showIdentity={showIdentity}
                setShowIdentity={setShowIdentity}
                setCnicFrontProgress={() => {}}
                setCnicBackProgress={() => {}}
              />
            )}

            {/* ── Step: Vehicle Details + Docs (Wizer) ── */}
            {stepKey === "vehicle" && (
              <VehicleDetailsStep
                setVehicleProgress={() => {}}
                setLicenseFrontProgress={() => {}}
                setLicenseBackProgress={() => {}}
              />
            )}

            {/* ── Step: Vehicle Condition Photos (Wizer) ── */}
            {stepKey === "vehiclePhotos" && <VehiclePhotosStep />}

            {/* ── Step: Wizer Identity (CNIC + Selfie) ── */}
            {stepKey === "licenseIdentity" && (
              <div className="space-y-6">
                <IdentitySection
                  showIdentity={showIdentity}
                  setShowIdentity={setShowIdentity}
                  setCnicFrontProgress={() => {}}
                  setCnicBackProgress={() => {}}
                />
                <FaceSection
                  showFace={showFace}
                  setShowFace={setShowFace}
                  control={methods.control}
                  errors={methods.formState.errors}
                />
              </div>
            )}

            {/* ── Step: Review ── */}
            {stepKey === "review" && (
              <ReviewStep
                role={selectedRole}
                values={values}
                isGuestTowner={isGuestTowner}
                referralOwnerName={referralOwnerName}
              />
            )}

            {/* ── Navigation buttons ── */}
            <div className="flex gap-3 pt-2">
              {(currentStep > 0 || (currentStep === 0 && mode === "normal" && !forcedRole)) && (
                <button
                  type="button"
                  onClick={currentStep === 0 ? () => { setSelectedRole(null); clearDraft(); } : handleBack}
                  className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
                >
                  ← {currentStep === 0 ? "Change role" : "Back"}
                </button>
              )}
              {!isLastStep ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-xl bg-townwize-primary text-white font-semibold hover:bg-townwize-primaryDark transition text-sm"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 rounded-xl font-semibold text-white transition text-sm ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-townwize-primary hover:bg-townwize-primaryDark"}`}
                >
                  {isSubmitting ? "Submitting…" : "Submit Application"}
                </button>
              )}
            </div>

            {/* Sign-in link */}
            {currentStep === 0 && (
              <p className="text-center text-sm text-gray-400">
                Already have an account?{" "}
                <button type="button" onClick={() => navigate("/login")} className="text-townwize-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
