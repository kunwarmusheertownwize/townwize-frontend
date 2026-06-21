import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import AccountInfo from "../../components/auth/AccountInfo";
import AuthHeader from "../../components/auth/AuthHeader";
import FaceSection from "../../components/auth/FaceSection";
import IdentitySection from "../../components/auth/IdentitySection";
import ReferralSection from "../../components/auth/ReferralSection";
import RegisterHeader from "../../components/auth/RegisterHeader";
import RegistrationProgress from "../../components/auth/RegistrationProgress";
import ResidencySection from "../../components/auth/ResidencySection";
import RoleSelection from "../../components/auth/RoleSelection";
import SubmitButton from "../../components/auth/SubmitButton";
import VehicleSection from "../../components/auth/VehicleSection";
import { enforceBusinessRules, schema } from "../../validation/fields";

const defaultValues = {
  name: "",
  email: "",
  phone: "",
  password: "",
  btkAddress: "",
  residencyType: "",
  cnicNumber: "",
  vehicleType: "Car",
  carType: "economy",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleSeats: "4",
  vehicleNumber: "",
  vehicleColor: "",
  btkProofFile: null,
  btkIdFront: null,
  btkIdBack: null,
  vehicleReg: null,
  licenseFront: null,
  licenseBack: null,
  vehiclePhotoFront: null,
  vehiclePhotoRear: null,
  vehiclePhotoLeft: null,
  vehiclePhotoRight: null,
  vehiclePhotoInteriorFront: null,
  vehiclePhotoInteriorRear: null,
  vehiclePhotoOdometer: null,
  cnicFront: null,
  cnicBack: null,
  selfie: "",
};

const mapFilesForRole = (formData, values, role, isGuestTowner = false) => {
  if (role === "passenger") {
    if (isGuestTowner) {
      // GuestTowner: CNIC only — no BTK residency proof required
      if (values.cnicFront) formData.append("cnicFront", values.cnicFront);
      if (values.cnicBack)  formData.append("cnicBack",  values.cnicBack);
    } else {
      // Towner: full BTK proof + BTK ID
      if (values.btkProofFile) formData.append("proofOfResidency", values.btkProofFile);
      if (values.btkIdFront)   formData.append("btkIdFront", values.btkIdFront);
      if (values.btkIdBack)    formData.append("btkIdBack",  values.btkIdBack);
    }
    if (values.selfie && values.selfie.startsWith("data:")) formData.append("selfieData", values.selfie);
    return;
  }

  // Driver path unchanged
  if (values.btkProofFile) formData.append("residencyProof", values.btkProofFile);
  if (values.btkIdFront) formData.append("btkIdFront", values.btkIdFront);
  if (values.btkIdBack) formData.append("btkIdBack", values.btkIdBack);
  if (values.vehicleReg) formData.append("vehicleRegistration", values.vehicleReg);
  if (values.licenseFront) formData.append("licenseFront", values.licenseFront);
  if (values.licenseBack) formData.append("licenseBack", values.licenseBack);
  if (values.vehiclePhotoFront) formData.append("vehiclePhotoFront", values.vehiclePhotoFront);
  if (values.vehiclePhotoRear) formData.append("vehiclePhotoRear", values.vehiclePhotoRear);
  if (values.vehiclePhotoLeft) formData.append("vehiclePhotoLeft", values.vehiclePhotoLeft);
  if (values.vehiclePhotoRight) formData.append("vehiclePhotoRight", values.vehiclePhotoRight);
  if (values.vehiclePhotoInteriorFront) formData.append("vehiclePhotoInteriorFront", values.vehiclePhotoInteriorFront);
  if (values.vehiclePhotoInteriorRear) formData.append("vehiclePhotoInteriorRear", values.vehiclePhotoInteriorRear);
  if (values.vehiclePhotoOdometer) formData.append("vehiclePhotoOdometer", values.vehiclePhotoOdometer);
  if (values.cnicFront) formData.append("cnicFront", values.cnicFront);
  if (values.cnicBack) formData.append("cnicBack", values.cnicBack);
  if (values.selfie && values.selfie.startsWith("data:")) formData.append("selfieData", values.selfie);
};

const PhoneOtpBlock = ({ phone, verified, onSend, onVerify, loadingSend, loadingVerify }) => {
  const [code, setCode] = useState("");
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
      <div className="text-sm font-semibold">Phone OTP Verification (WhatsApp)</div>
      <div className="flex flex-col md:flex-row gap-3">
        <button
          type="button"
          onClick={onSend}
          disabled={!phone || loadingSend}
          className="px-4 py-2 rounded bg-townwize-primary text-white disabled:opacity-60"
        >
          {loadingSend ? "Sending..." : "Send OTP"}
        </button>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="Enter OTP"
          className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
        />
        <button
          type="button"
          onClick={() => onVerify(code)}
          disabled={!phone || !code || loadingVerify}
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60"
        >
          {loadingVerify ? "Verifying..." : "Verify OTP"}
        </button>
      </div>
      <div className={`text-sm ${verified ? "text-green-600" : "text-amber-600"}`}>
        {verified ? "Phone verified." : "Verify phone before registration."}
      </div>
    </div>
  );
};

export default function Register() {
  const [role, setRole] = useState("passenger");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralVerified, setReferralVerified] = useState(false);
  const [referralCodeType, setReferralCodeType] = useState(null); // "GENERAL" | "GUEST_INVITE" | null
  const [referralOwnerName, setReferralOwnerName] = useState("");
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [otpLoadingSend, setOtpLoadingSend] = useState(false);
  const [otpLoadingVerify, setOtpLoadingVerify] = useState(false);

  const passengerMethods = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues,
  });
  const driverMethods = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { code: inviteCodeParam } = useParams();
  const mode = useMemo(() => (inviteCodeParam ? "referral" : "normal"), [inviteCodeParam]);
  const isGuestTowner = referralCodeType === "GUEST_INVITE";
  const showReferral = mode === "referral" && role === "passenger";
  // Towners (including GENERAL referrals) need BTK residency docs; GuestTowners do not
  const showBTK = role === "driver" || (role === "passenger" && (mode !== "referral" || referralCodeType === "GENERAL"));
  // GuestTowners provide CNIC instead of BTK residency proof
  const showCnic = role === "passenger" && isGuestTowner;
  const methods = role === "passenger" ? passengerMethods : driverMethods;
  const phone = methods.watch("phone");

  const verifyReferralCode = async (code) => {
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2";
      const res = await fetch(`${BASE_URL}/referral/validate/${encodeURIComponent(code)}`);
      const data = await res.json();
      return data?.success ? data.data : null;
    } catch {
      return null;
    }
  };

  const [showResidency, setShowResidency] = useState(true);
  const [showVehicle, setShowVehicle] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [showFace, setShowFace] = useState(false);
  const [btkProofProgress, setBtkProofProgress] = useState(0);
  const [btkFrontProgress, setBtkFrontProgress] = useState(0);
  const [btkBackProgress, setBtkBackProgress] = useState(0);
  const [vehicleProgress, setVehicleProgress] = useState(0);
  const [licenseFrontProgress, setLicenseFrontProgress] = useState(0);
  const [licenseBackProgress, setLicenseBackProgress] = useState(0);
  const [cnicFrontProgress, setCnicFrontProgress] = useState(0);
  const [cnicBackProgress, setCnicBackProgress] = useState(0);
  const [selfieProgress, setSelfieProgress] = useState(0);

  useEffect(() => {
    if (showReferral) setReferralVerified(true);
  }, [showReferral]);

  useEffect(() => {
    if (mode === "referral" && role === "driver") setRole("passenger");
  }, [mode, role]);

  const resetForms = useCallback(() => {
    if (role === "passenger") driverMethods.reset(defaultValues);
    else passengerMethods.reset(defaultValues);
    setPhoneVerificationToken("");
  }, [role, driverMethods, passengerMethods]);

  useEffect(() => {
    resetForms();
  }, [resetForms]);

  useEffect(() => {
    if (showReferral && inviteCodeParam) {
      verifyReferralCode(inviteCodeParam).then((info) => {
        const isValid = !!info;
        setReferralVerified(isValid);
        if (isValid) {
          passengerMethods.setValue("referralCode", inviteCodeParam, { shouldValidate: true });
          setReferralCodeType(info.codeType || null);
          setReferralOwnerName(info.ownerName || "");
          if (info?.ownerName) {
            passengerMethods.setValue("referrerName", info.ownerName, { shouldValidate: false });
          }
        } else {
          setReferralCodeType(null);
          setReferralOwnerName("");
          passengerMethods.setError("referralCode", {
            type: "manual",
            message: "Invalid or expired referral code",
          });
        }
      });
    }
  }, [showReferral, inviteCodeParam, passengerMethods]);

  useEffect(() => {
    if (!registrationSuccess) return;
    navigate("/login", { state: location.state || null, replace: true });
  }, [registrationSuccess, navigate, location.state]);

  const handleSendOtp = async () => {
    if (!phone) {
      toast.error("Enter phone first");
      return;
    }
    setOtpLoadingSend(true);
    try {
      await api.post("/auth/phone-otp/send", { phone, channel: "whatsapp" });
      toast.success("OTP sent on WhatsApp");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpLoadingSend(false);
    }
  };

  const handleVerifyOtp = async (code) => {
    setOtpLoadingVerify(true);
    try {
      const res = await api.post("/auth/phone-otp/verify", { phone, code });
      const token = res?.data?.data?.verificationToken || "";
      setPhoneVerificationToken(token);
      toast.success("Phone verified");
    } catch (error) {
      toast.error(error?.response?.data?.message || "OTP verification failed");
    } finally {
      setOtpLoadingVerify(false);
    }
  };

  const onSubmit = async (values, activeRole) => {
    if (isSubmitting) return;
    const businessErrors = enforceBusinessRules(values, activeRole);
    if (Object.keys(businessErrors).length > 0) {
      methods.clearErrors();
      Object.entries(businessErrors).forEach(([field, message]) =>
        methods.setError(field, { type: "manual", message })
      );
      toast.error("Please fix the highlighted required fields.");
      return;
    }
    if (!phoneVerificationToken) {
      toast.error("Please verify phone OTP first.");
      return;
    }

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
      if (activeRole === "driver") {
        formData.append("vehicleType", values.vehicleType || "Car");
        formData.append("carType", values.carType || "economy");
        formData.append("vehicleMake", values.vehicleMake || "");
        formData.append("vehicleModel", values.vehicleModel || "");
        formData.append("vehicleYear", values.vehicleYear || "");
        formData.append("vehicleSeats", values.vehicleSeats || "4");
        formData.append("vehicleNumber", values.vehicleNumber || "");
        formData.append("vehicleColor", values.vehicleColor || "");
        formData.append("cnicNumber", values.cnicNumber || "");
      }

      mapFilesForRole(formData, values, activeRole, activeRole === "passenger" && isGuestTowner);

      await api.post(`/auth/register?role=${activeRole}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Registration submitted. Please verify email.");
      setRegistrationSuccess(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-townwize-bgLight dark:bg-townwize-primaryDark transition-colors duration-300 pb-safe">
      <AuthHeader />
      <div className="flex-grow flex justify-center w-full px-4 pb-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
          {role === "passenger" && (
            <FormProvider {...passengerMethods}>
              <div className="lg:col-span-2">
                <form
                  onSubmit={passengerMethods.handleSubmit((values) => onSubmit(values, role))}
                  className="w-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow space-y-8"
                >
                  <RegisterHeader />
                  <RoleSelection role={role} setRole={setRole} mode={mode} />
                  <AccountInfo register={passengerMethods.register} errors={passengerMethods.formState.errors} />
                  <PhoneOtpBlock
                    phone={phone}
                    verified={!!phoneVerificationToken}
                    onSend={handleSendOtp}
                    onVerify={handleVerifyOtp}
                    loadingSend={otpLoadingSend}
                    loadingVerify={otpLoadingVerify}
                  />
                  {showReferral && (
                    <ReferralSection register={passengerMethods.register} errors={passengerMethods.formState.errors} watch={passengerMethods.watch} />
                  )}

                  {/* Tier banner — shown once referral code type is known */}
                  {referralCodeType === "GUEST_INVITE" && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-2">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">You're registering as a GuestTowner</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                        Invited by <span className="font-semibold">{referralOwnerName || "a Townwize member"}</span>.
                        GuestTowners can book rides between <span className="font-semibold">Karachi ↔ Bahria Town Karachi</span> only.
                        Your sponsor Towner is accountable for your account.
                      </p>
                      <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                        <li>Required: Name, email, phone number, CNIC (front &amp; back)</li>
                        <li>Not required: BTK residency proof or BTK ID</li>
                      </ul>
                    </div>
                  )}
                  {referralCodeType === "GENERAL" && (
                    <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 p-4 space-y-1">
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">Welcome — referred by {referralOwnerName || "a Townwize member"}</p>
                      <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                        You're registering as a full <span className="font-semibold">Towner</span>. A welcome coupon will be credited to your account
                        once you complete registration and your referrer will earn their reward after your first completed ride.
                        Full BTK residency verification is required.
                      </p>
                    </div>
                  )}

                  {showBTK && (
                    <ResidencySection
                      showResidency={showResidency}
                      setShowResidency={setShowResidency}
                      setBtkProofProgress={setBtkProofProgress}
                      setBtkFrontProgress={setBtkFrontProgress}
                      setBtkBackProgress={setBtkBackProgress}
                    />
                  )}
                  {showCnic && (
                    <IdentitySection
                      showIdentity={showIdentity}
                      setShowIdentity={setShowIdentity}
                      setCnicFrontProgress={setCnicFrontProgress}
                      setCnicBackProgress={setCnicBackProgress}
                    />
                  )}
                  <SubmitButton
                    isSubmitting={isSubmitting}
                    isValid={passengerMethods.formState.isValid}
                    isDirty={passengerMethods.formState.isDirty}
                  />
                </form>
              </div>
            </FormProvider>
          )}

          {role === "driver" && (
            <FormProvider {...driverMethods}>
              <div className="lg:col-span-2">
                <form
                  onSubmit={driverMethods.handleSubmit((values) => onSubmit(values, role))}
                  className="w-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow space-y-8"
                >
                  <RegisterHeader />
                  <RoleSelection role={role} setRole={setRole} mode={mode} />
                  <AccountInfo register={driverMethods.register} errors={driverMethods.formState.errors} />
                  <PhoneOtpBlock
                    phone={phone}
                    verified={!!phoneVerificationToken}
                    onSend={handleSendOtp}
                    onVerify={handleVerifyOtp}
                    loadingSend={otpLoadingSend}
                    loadingVerify={otpLoadingVerify}
                  />
                  <ResidencySection
                    showResidency={showResidency}
                    setShowResidency={setShowResidency}
                    setBtkProofProgress={setBtkProofProgress}
                    setBtkFrontProgress={setBtkFrontProgress}
                    setBtkBackProgress={setBtkBackProgress}
                  />
                  <VehicleSection
                    showVehicle={showVehicle}
                    setShowVehicle={setShowVehicle}
                    setVehicleProgress={setVehicleProgress}
                    setLicenseFrontProgress={setLicenseFrontProgress}
                    setLicenseBackProgress={setLicenseBackProgress}
                  />
                  <IdentitySection
                    showIdentity={showIdentity}
                    setShowIdentity={setShowIdentity}
                    setCnicFrontProgress={setCnicFrontProgress}
                    setCnicBackProgress={setCnicBackProgress}
                  />
                  <FaceSection
                    showFace={showFace}
                    setShowFace={setShowFace}
                    control={driverMethods.control}
                    errors={driverMethods.formState.errors}
                  />
                  <SubmitButton
                    isSubmitting={isSubmitting}
                    isValid={driverMethods.formState.isValid}
                    isDirty={driverMethods.formState.isDirty}
                  />
                </form>
              </div>
            </FormProvider>
          )}

          <FormProvider {...methods}>
            <div className="hidden lg:block">
              <div className="sticky top-4 shadow-none bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                <RegistrationProgress
                  role={role}
                  showReferral={showReferral}
                  btkProofProgress={btkProofProgress}
                  btkFrontProgress={btkFrontProgress}
                  btkBackProgress={btkBackProgress}
                  vehicleProgress={vehicleProgress}
                  licenseFrontProgress={licenseFrontProgress}
                  licenseBackProgress={licenseBackProgress}
                  cnicFrontProgress={cnicFrontProgress}
                  cnicBackProgress={cnicBackProgress}
                  selfieProgress={selfieProgress}
                  referralVerified={referralVerified}
                />
              </div>
            </div>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
