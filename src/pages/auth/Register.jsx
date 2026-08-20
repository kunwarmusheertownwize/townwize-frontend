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
import RegistrationIntro from "../../components/auth/RegistrationIntro";
import IdentitySection from "../../components/auth/IdentitySection";
import ResidencySection from "../../components/auth/ResidencySection";
import WizardProgress from "../../components/auth/wizard/WizardProgress";
import VehicleDetailsStep from "../../components/auth/wizard/VehicleDetailsStep";
import VehiclePhotosStep from "../../components/auth/wizard/VehiclePhotosStep";
import WizerIdentityStep from "../../components/auth/wizard/WizerIdentityStep";
import FaceVerificationStep from "../../components/auth/wizard/FaceVerificationStep";
import { saveDraft, loadDraft, clearDraft, isTokenExpired } from "../../utils/registrationDraft";
import { enforceBusinessRules, schema } from "../../validation/fields";

// ─── step definitions ────────────────────────────────────────────────────────

// Account BEFORE phone, in every flow.
//
// The account step carries the disqualifying checks — email already taken, and
// whether this address has actually been invited — and both are free. The phone
// step sends a Twilio OTP, which is the only part of registration that costs
// Townwize money on every attempt.
//
// Phone-first meant anyone refused at the email step had already burned a paid
// verification, and with a shared registration link that is repeatable by
// anyone. The free check that can say no now runs before the paid one.
const PASSENGER_TOWNER_STEPS = [
  { key: "account",   label: "Account",   fields: ["name", "email", "password"] },
  { key: "phone",     label: "Phone",     fields: ["phone"] },
  { key: "residency", label: "Residency", fields: ["btkAddress", "btkRegNo", "residencyType", "btkProofFile", "btkIdFront", "btkIdBack"] },
  { key: "review",    label: "Review",    fields: [] },
];

const PASSENGER_GUEST_STEPS = [
  { key: "account",  label: "Account",  fields: ["name", "email", "password"] },
  { key: "phone",    label: "Phone",    fields: ["phone"] },
  { key: "identity", label: "Identity", fields: ["cnicFront", "cnicBack"] },
  { key: "review",   label: "Review",   fields: [] },
];

// Ordered by ascending effort, so the cheapest disqualifying checks come first
// and the heaviest ask (seven vehicle photos) lands where abandoning costs least.
// Uploads per step: 0, 0, 5, 3, 1, 7.
//
// "Cheapest" counts Townwize's cost too, not only the applicant's — see the note
// above PASSENGER_TOWNER_STEPS for why account precedes phone.
//
// Identity was previously step 6 of 7 — a driver uploaded everything including
// seven vehicle photos before we asked who they were. The CNIC number sat in the
// Vehicle step while its images sat two steps away, and the driving licence, a
// personal document, was filed under Vehicle.
const WIZER_STEPS = [
  { key: "account",       label: "Account",   fields: ["name", "email", "password"] },
  { key: "phone",         label: "Phone",     fields: ["phone"] },
  { key: "identity",      label: "Identity",  fields: ["cnicNumber", "cnicFront", "cnicBack", "licenseFront", "licenseBack"] },
  { key: "faceCheck",     label: "Face",      fields: ["selfie"] },
  { key: "residency",     label: "Residency", fields: ["btkAddress", "btkRegNo", "residencyType", "btkProofFile", "btkIdFront", "btkIdBack"] },
  { key: "vehicle",       label: "Vehicle",   fields: ["vehicleType", "carType", "vehicleMake", "vehicleModel", "vehicleYear", "vehicleSeats", "vehicleNumber", "vehicleColor", "vehicleReg", "mTagPhoto"] },
  { key: "vehiclePhotos", label: "Photos",    fields: ["vehiclePhotoFront", "vehiclePhotoRear", "vehiclePhotoLeft", "vehiclePhotoRight", "vehiclePhotoInteriorFront", "vehiclePhotoInteriorRear", "vehiclePhotoOdometer"] },
  { key: "review",        label: "Review",    fields: [] },
];

// ─── draft helpers ────────────────────────────────────────────────────────────

const FILE_FIELDS = ["btkProofFile", "btkIdFront", "btkIdBack", "cnicFront", "cnicBack", "vehicleReg", "licenseFront", "licenseBack", "vehiclePhotoFront", "vehiclePhotoRear", "vehiclePhotoLeft", "vehiclePhotoRight", "vehiclePhotoInteriorFront", "vehiclePhotoInteriorRear", "vehiclePhotoOdometer", "selfie", "mTagPhoto"];
// Draft persistence lives in utils/registrationDraft.js — it keeps uploaded
// files in IndexedDB (localStorage cannot hold 16 images), stores the step KEY
// rather than an index so reordering steps cannot strand anyone, and persists
// the phone verification token so reopening does not dead-end at submit.

// Human names for every field, so a failed step can say WHAT is missing instead
// of "Please complete all required fields" on a screen with six of them.
const FIELD_LABELS = {
  phone: "Phone number", name: "Full name", email: "Email", password: "Password",
  btkAddress: "BTK address", btkRegNo: "BTK registration number", residencyType: "Owner or tenant",
  btkProofFile: "Proof of residency", btkIdFront: "BTK ID (front)", btkIdBack: "BTK ID (back)",
  cnicNumber: "CNIC number", cnicFront: "CNIC (front)", cnicBack: "CNIC (back)",
  licenseFront: "Licence (front)", licenseBack: "Licence (back)", selfie: "Face verification",
  vehicleType: "Vehicle type", carType: "Vehicle class", vehicleMake: "Make",
  vehicleModel: "Model", vehicleYear: "Year", vehicleSeats: "Seats",
  vehicleNumber: "Number plate", vehicleColor: "Colour", vehicleReg: "Vehicle registration",
  mTagPhoto: "M-Tag photo",
  vehiclePhotoFront: "Front exterior photo", vehiclePhotoRear: "Rear exterior photo",
  vehiclePhotoLeft: "Left side photo", vehiclePhotoRight: "Right side photo",
  vehiclePhotoInteriorFront: "Interior front photo",
  vehiclePhotoInteriorRear: "Interior rear photo",
  vehiclePhotoOdometer: "Dashboard / odometer photo",
};

const describeMissing = (fields, errors) => {
  const missing = fields.filter((f) => errors[f]).map((f) => FIELD_LABELS[f] || f);
  if (missing.length === 0) return "Please complete this step before continuing.";
  if (missing.length === 1) return `${missing[0]} is required.`;
  if (missing.length <= 3) return `Still needed: ${missing.join(", ")}.`;
  return `Still needed: ${missing.slice(0, 3).join(", ")} and ${missing.length - 3} more.`;
};

// ─── default form values ──────────────────────────────────────────────────────

const defaultValues = {
  name: "", email: "", phone: "", password: "",
  btkAddress: "", btkRegNo: "", residencyType: "", cnicNumber: "",
  vehicleType: "Car", carType: "economy",
  vehicleMake: "", vehicleModel: "", vehicleYear: "", vehicleSeats: "4",
  vehicleNumber: "", vehicleColor: "", hasMTag: false, mTagPhoto: null,
  btkProofFile: null, btkIdFront: null, btkIdBack: null,
  vehicleReg: null, licenseFront: null, licenseBack: null,
  vehiclePhotoFront: null, vehiclePhotoRear: null, vehiclePhotoLeft: null, vehiclePhotoRight: null,
  vehiclePhotoInteriorFront: null, vehiclePhotoInteriorRear: null, vehiclePhotoOdometer: null,
  cnicFront: null, cnicBack: null, selfie: "", selfieAngles: null,
};

// ─── phone OTP block ──────────────────────────────────────────────────────────

/**
 * Phone OTP.
 *
 * Was a titled box holding three stacked full-width controls — Send, a code
 * field, Verify — all visible at once whether or not a code had been sent, plus
 * a status line. Four things competing before the user had done anything.
 *
 * Now it is one action at a time: send, then enter and verify, then a single
 * confirmation. Once verified the controls disappear entirely.
 */
const PhoneOtpBlock = ({ phone, verified, onSend, onVerify, loadingSend, loadingVerify }) => {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  const send = async () => { await onSend(); setSent(true); setCode(""); };

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
        <span className="text-green-600 dark:text-green-400">✓</span>
        <p className="text-sm font-medium text-green-800 dark:text-green-300">Phone verified</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
      {!sent ? (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            We'll send a 6-digit code to this number on WhatsApp.
          </p>
          <button
            type="button" onClick={send} disabled={!phone || loadingSend}
            className="w-full rounded-lg bg-townwize-primary py-2.5 text-sm font-semibold text-white transition hover:bg-townwize-primaryDark disabled:opacity-50"
          >
            {loadingSend ? "Sending…" : "Send code on WhatsApp"}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter the code sent to <span className="font-medium text-gray-700 dark:text-gray-200">{phone}</span>
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-lg tracking-[0.4em] outline-none focus:border-townwize-primary dark:border-gray-600 dark:bg-gray-700"
          />
          <button
            type="button" onClick={() => onVerify(code)} disabled={!code || loadingVerify}
            className="w-full rounded-lg bg-townwize-primary py-2.5 text-sm font-semibold text-white transition hover:bg-townwize-primaryDark disabled:opacity-50"
          >
            {loadingVerify ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button" onClick={send} disabled={loadingSend}
            className="w-full text-xs font-medium text-gray-400 underline-offset-2 hover:text-townwize-primary hover:underline disabled:opacity-50"
          >
            {loadingSend ? "Sending…" : "Didn't get it? Send again"}
          </button>
        </>
      )}
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
          <Row label="BTK Reg. No."   value={values.btkRegNo} />
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

  // Seeded when someone tapped "Continue with Google" and had no account yet.
  // Login verifies the credential server-side first and passes the resulting
  // short-lived token here, so the wizard is not racing Google's ~1h expiry
  // through sixteen uploads.
  const google = location.state?.google || null;

  // Waitlist invitation. The email carries the address it was sent to and the
  // role it was sent for, so someone arriving from it does not have to
  // re-choose a role or retype an address the gate matches exactly.
  const invite = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    const email = (qs.get("email") || "").trim().toLowerCase();
    const role = qs.get("role");
    return {
      email: /^\S+@\S+\.\S+$/.test(email) ? email : "",
      role: role === "driver" || role === "passenger" ? role : null,
      isInvited: qs.get("invited") === "1",
    };
  }, [location.search]);

  const forcedRole = getAppRole() || null;
  const [selectedRole, setSelectedRole] = useState(
    forcedRole || invite.role || (mode === "referral" ? "passenger" : null)
  );
  // Intro is shown once per fresh start. Restoring a draft skips it.
  const [introDone, setIntroDone] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [referralCodeType, setReferralCodeType] = useState(null);
  const [referralOwnerName, setReferralOwnerName] = useState("");
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [otpLoadingSend, setOtpLoadingSend] = useState(false);
  const [otpLoadingVerify, setOtpLoadingVerify] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  // Register.jsx had no reference to the terms or the privacy policy at all —
  // no checkbox, no link. Payment providers and both app stores expect an
  // explicit, unticked opt-in at the point of account creation.
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [showResidency, setShowResidency] = useState(true);
  const [showIdentity, setShowIdentity] = useState(true);
  const draftRestored = useRef(false);

  const isGuestTowner = referralCodeType === "GUEST_INVITE";

  // `context` feeds the schema's $isGuestTowner condition, so the BTK residency
  // fields are only required on the journeys that actually collect them.
  const methods = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues,
    context: { isGuestTowner, isGoogleSignup: Boolean(location.state?.google) },
  });
  const phone = methods.watch("phone");

  // Pre-fill from the verified Google identity.
  //
  // Must sit BELOW `methods` and `draftRestored` — both are const, so
  // referencing them from an effect declared earlier in the component body is a
  // temporal dead zone error thrown during render, not a runtime warning. That
  // crashed the whole page.
  //
  // A restored draft wins: the applicant was already further along than the
  // seed, and overwriting their edited email with the Google one would be
  // silently destructive.
  useEffect(() => {
    if (!google || draftRestored.current) return;
    if (google.email) methods.setValue("email", google.email);
    if (google.name) methods.setValue("name", google.name);
    setIntroDone(true);
  }, [google, methods]);

  // ── restore draft ──
  useEffect(() => {
    if (mode === "referral" || draftRestored.current) return;
    let cancelled = false;
    (async () => {
      const draft = await loadDraft();
      if (!draft || cancelled) return;
      draftRestored.current = true;
      // Someone resuming mid-registration has already seen the briefing.
      setIntroDone(true);

      setSelectedRole(draft.role);

      // Files come back from IndexedDB as real File objects, so UploadPreview
      // and the submit FormData see exactly what they saw before.
      methods.reset({ ...defaultValues, ...draft.data, ...(draft.files || {}) });

      const stepList =
        draft.role === "driver" ? WIZER_STEPS
          : mode === "referral" ? PASSENGER_GUEST_STEPS
            : PASSENGER_TOWNER_STEPS;

      // Resolve the saved step KEY. Unknown key (an older draft, or a step that
      // no longer exists) falls back to the start rather than a wrong screen.
      let idx = stepList.findIndex((s) => s.key === draft.stepKey);
      if (idx < 0) idx = 0;

      // The phone token is short-lived. If it is gone or expired, send them back
      // to the phone step now with a reason, instead of letting them finish the
      // whole form and hit "Phone verification is required" at submit with no
      // route back — which is what used to happen.
      const token = draft.phoneVerificationToken || "";
      if (token && !isTokenExpired(token)) {
        setPhoneVerificationToken(token);
      } else if (idx > 0) {
        idx = 0;
        toast.info("Your phone verification expired — please verify again to continue.", { autoClose: 6000 });
      }

      setCurrentStep(idx);

      // Count real uploads only — the store also holds the liveness frames,
      // which are not a "file" the user recognises having uploaded.
      const restoredFiles = Object.values(draft.files || {})
        .filter((v) => v instanceof File || v instanceof Blob).length;
      if (idx > 0) {
        toast.info(
          restoredFiles > 0
            ? `Progress restored, including ${restoredFiles} uploaded file${restoredFiles === 1 ? "" : "s"}.`
            : "Progress restored.",
          { autoClose: 4000 }
        );
      }
    })();
    return () => { cancelled = true; };
  }, [mode, methods]);

  // ── prefill the invited address ──
  // Only when the field is still empty, so a restored draft always wins: someone
  // resuming half a registration should not have it overwritten by a link they
  // happened to click again.
  useEffect(() => {
    if (!invite.email) return;
    if (methods.getValues("email")) return;
    methods.setValue("email", invite.email, { shouldValidate: false });
  }, [invite.email, methods]);

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
    // Sending a fresh code invalidates whatever was verified before, so drop the
    // old token. Otherwise the panel kept showing "Phone verified" after a
    // resend, and the user had no idea the new code still needed entering.
    setPhoneVerificationToken("");
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
        const errs = methods.formState.errors;
        toast.error(describeMissing(fields, errs));
        // Put the cursor on the first thing that is wrong. Works for text and
        // select inputs; file inputs are hidden so setFocus is a no-op there,
        // hence the scroll fallback below.
        const firstBad = fields.find((f) => errs[f]);
        if (firstBad) {
          try { methods.setFocus(firstBad); } catch { /* not a focusable input */ }
          requestAnimationFrame(() => {
            document
              .querySelector(`[name="${firstBad}"]`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        }
        return;
      }
    }

    // Catch a taken email HERE, not at submit. The server only reaches its own
    // duplicate check after multer has uploaded every document to S3, so the
    // applicant otherwise fills six more steps and waits out a multi-megabyte
    // upload before being told an address they typed at step two is in use.
    if (key === "account") {
      const email = methods.getValues("email");
      if (email) {
        setCheckingEmail(true);
        try {
          // `role` also asks the server whether this address has been invited.
          // Omitted for GuestTowners: they arrive on a Towner's invite code and
          // are never on the waitlist, so asking would refuse a journey that is
          // supposed to bypass it entirely.
          const params = { email };
          if (selectedRole && !(mode === "referral" && isGuestTowner)) {
            params.role = selectedRole;
          }

          const { data } = await api.get("/auth/availability", { params });
          const check = data?.data || {};

          if (check.available === false && check.reason === "EMAIL_ALREADY_EXISTS") {
            methods.setError("email", { type: "manual", message: "This email is already registered" });
            toast.error(
              <span>
                That email is already registered.{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: location.state || null })}
                  className="font-semibold underline underline-offset-2"
                >
                  Sign in instead
                </button>
              </span>,
              { autoClose: 9000 }
            );
            return;
          }

          if (check.available === false) {
            // Waitlist refusals. The server's wording is used verbatim so the
            // applicant reads the same sentence here as they would at submit —
            // and reads it now, rather than after uploading every document.
            const message = check.message || "This email cannot be registered yet.";
            methods.setError("email", { type: "manual", message });
            toast.error(message, { autoClose: 12000 });
            return;
          }
        } catch {
          // Network trouble or a 429 must not block registration — the server
          // still enforces uniqueness at submit.
        } finally {
          setCheckingEmail(false);
        }
      }
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    if (mode !== "referral") {
      saveDraft(selectedRole, steps[nextStep]?.key || "review", methods.getValues(),
        FILE_FIELDS, phoneVerificationToken);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, currentStepDef, methods, mode, phoneVerificationToken, selectedRole, steps, navigate, location.state]);

  // Jump straight back to an already-completed step. Backwards only: a later
  // step may depend on fields not yet filled, and skipping forward would bypass
  // step validation entirely.
  const handleStepSelect = useCallback((index) => {
    if (index >= currentStep || index < 0) return;
    setCurrentStep(index);
    if (mode !== "referral") {
      saveDraft(selectedRole, steps[index]?.key || "phone", methods.getValues(),
        FILE_FIELDS, phoneVerificationToken);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, mode, methods, selectedRole, steps, phoneVerificationToken]);

  const handleBack = useCallback(() => {
    const prev = currentStep - 1;
    setCurrentStep(prev);
    if (mode !== "referral") {
      saveDraft(selectedRole, steps[prev]?.key || "phone", methods.getValues(),
        FILE_FIELDS, phoneVerificationToken);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, mode, methods, selectedRole, steps, phoneVerificationToken]);

  // ── submit ──
  const onSubmit = async (values) => {
    if (isSubmitting) return;
    const activeRole = selectedRole;
    const businessErrors = enforceBusinessRules(values, activeRole, isGuestTowner);
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
      // A Google registrant never chose one; the server generates an unusable
      // password so the model's required passwordHash still holds.
      if (values.password) formData.append("password", values.password);
      if (google?.googleRegistrationToken) {
        formData.append("googleRegistrationToken", google.googleRegistrationToken);
      }
      formData.append("btkAddress", values.btkAddress || "");
      formData.append("residencyType", values.residencyType || "");
      formData.append("btkRegNo", values.btkRegNo || "");
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
        if (values.selfie?.startsWith?.("data:")) {
          // Field name must be `selfie` — the backend reads req.body.selfie.
          // It was `selfieData`, which matched nothing, so no face photo has
          // ever been saved on any registration.
          formData.append("selfie", values.selfie);
          if (values.selfieAngles) formData.append("selfieAngles", JSON.stringify(values.selfieAngles));
        }
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
        if (values.mTagPhoto) formData.append("mTagPhoto", values.mTagPhoto);
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
        if (values.selfie?.startsWith?.("data:")) {
          // Field name must be `selfie` — the backend reads req.body.selfie.
          // It was `selfieData`, which matched nothing, so no face photo has
          // ever been saved on any registration.
          formData.append("selfie", values.selfie);
          if (values.selfieAngles) formData.append("selfieAngles", JSON.stringify(values.selfieAngles));
        }
      }

      await api.post(`/auth/register?role=${activeRole}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearDraft();
      toast.success(
        google
          ? "Registration submitted! Your documents are now with our team for review."
          : "Registration submitted! Please check your email to verify your account."
      );
      navigate("/login", { state: location.state || null, replace: true });
    } catch (err) {
      const code = err?.response?.data?.error?.code || err?.response?.data?.code;
      const msg = err?.response?.data?.message || "Registration failed";

      // These two are the common dead ends. Both used to show a bare error with
      // no route forward, leaving the user stuck on a completed form.
      if (code === "EMAIL_ALREADY_EXISTS") {
        toast.error(
          <span>
            {msg}{" "}
            <button
              type="button"
              onClick={() => navigate("/login", { state: location.state || null })}
              className="font-semibold underline underline-offset-2"
            >
              Sign in instead
            </button>
          </span>,
          { autoClose: 9000 }
        );
      } else if (code === "WAITLIST_REQUIRED") {
        toast.info(msg, { autoClose: 10000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── intro screen ─────────────────────────────────────────────────────────
  // Between choosing a role and the first form step. Skipped when resuming a
  // draft — someone coming back mid-registration does not need the briefing
  // again — and skipped for invite links, which land straight in the flow.

  // Shown on the intro and throughout the wizard, so the reassurance survives
  // the whole form rather than only greeting them on arrival.
  const inviteBanner = invite.isInvited ? (
    <div className="mx-auto mt-4 w-full max-w-xl px-4">
      <div className="rounded-2xl border border-townwize-primary/30 bg-townwize-primary/5 px-4 py-3 dark:border-townwize-accent/30 dark:bg-townwize-accent/10">
        <p className="text-sm font-semibold text-townwize-primary dark:text-townwize-accent">
          Your invitation is confirmed
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
          {invite.email ? (
            <>
              You are registering as <strong>{invite.email}</strong>. Your invitation is tied to this
              address, so please keep it as it is.
            </>
          ) : (
            <>Registration is open for you. Use the email address your invitation was sent to.</>
          )}
        </p>
      </div>
    </div>
  ) : null;

  if (selectedRole && !introDone && mode === "normal" && currentStep === 0) {
    return (
      <div className="min-h-screen w-full bg-townwize-bgLight pb-safe transition-colors duration-300 dark:bg-townwize-primaryDark">
        <AuthHeader />
        {inviteBanner}
        <RegistrationIntro
          role={selectedRole}
          onStart={() => setIntroDone(true)}
          onChangeRole={() => { setSelectedRole(null); clearDraft(); }}
        />
      </div>
    );
  }

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
    identity:       selectedRole === "driver"
      ? { title: "Verify Your Identity", sub: "CNIC, driving licence and a quick face check." }
      : { title: "Identity Verification", sub: "CNIC is required to verify your identity." },
    faceCheck:      { title: "Face Verification", sub: "One quick check that you match your CNIC photo." },
    vehicle:        { title: "Your Vehicle", sub: "Vehicle details and registration document." },
    vehiclePhotos:  { title: "Vehicle Photos", sub: "Upload condition photos from all required angles." },
    review:         { title: "Review & Submit", sub: "Double-check your details before submitting." },
  }[stepKey] || { title: stepKey, sub: "" };

  const values = methods.getValues();

  return (
    <div className="min-h-screen w-full bg-townwize-bgLight dark:bg-townwize-primaryDark transition-colors duration-300 pb-safe">
      <AuthHeader />

      {inviteBanner}

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
        <WizardProgress
          steps={steps}
          currentStep={currentStep}
          onStepSelect={handleStepSelect}
        />
      )}

      {/* Step card */}
      <FormProvider {...methods}>
        {/* Submission is driven by the Submit button's onClick, not by the form.
            A multi-step wizard must never submit implicitly — pressing Enter on
            step three should not send a half-filled application. */}
        <form onSubmit={(e) => e.preventDefault()} className="max-w-xl mx-auto px-4 pb-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-6">

            {/* Step header */}
            <div>
              <h2 className="text-lg font-bold text-townwize-primary dark:text-white">{stepTitle.title}</h2>
              {stepTitle.sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stepTitle.sub}</p>}
            </div>

            {/* ── Step: Phone OTP ── */}
            {stepKey === "phone" && (
              <div className="space-y-4">
                {/* Preparation content lives on the intro screen now, so this
                    step is just the phone number and the code. */}
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
                  // Must check expiry, not just presence. A dead token kept
                  // showing a green tick, so the user walked the whole form and
                  // only discovered at submit that verification had lapsed.
                  verified={!!phoneVerificationToken && !isTokenExpired(phoneVerificationToken)}
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
                google={google}
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

            {/* ── Step: Identity ──
                Wizer gets the full set: CNIC number + images, licence, face
                verification. GuestTowner is lighter KYC — CNIC images only. */}
            {stepKey === "identity" && (
              selectedRole === "driver" ? (
                <WizerIdentityStep
                  showIdentity={showIdentity}
                  setShowIdentity={setShowIdentity}
                  />
              ) : (
                <IdentitySection
                  showIdentity={showIdentity}
                  setShowIdentity={setShowIdentity}
                  setCnicFrontProgress={() => {}}
                  setCnicBackProgress={() => {}}
                />
              )
            )}

            {stepKey === "faceCheck" && <FaceVerificationStep />}

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

            {/* ── Step: Review ── */}
            {stepKey === "review" && (
              <ReviewStep
                role={selectedRole}
                values={values}
                isGuestTowner={isGuestTowner}
                referralOwnerName={referralOwnerName}
              />
            )}

            {/* Consent, on the step where the user actually commits. Unticked
                by default — a pre-ticked box is not consent. */}
            {isLastStep && (
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPolicies}
                  onChange={(e) => setAcceptedPolicies(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-townwize-primary"
                />
                <span className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer"
                     className="font-semibold text-townwize-primary hover:underline dark:text-townwize-accent">
                    Terms of Use
                  </a>
                  , the{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer"
                     className="font-semibold text-townwize-primary hover:underline dark:text-townwize-accent">
                    Privacy Policy
                  </a>
                  {" "}and the{" "}
                  <a href="/refunds" target="_blank" rel="noopener noreferrer"
                     className="font-semibold text-townwize-primary hover:underline dark:text-townwize-accent">
                    Refund &amp; Cancellation Policy
                  </a>
                  .
                </span>
              </label>
            )}

            {/* ── Navigation buttons ──
                Sticky to the bottom of the viewport. They used to sit below the
                form, so on a step with five uploads and face verification you
                had to scroll the whole way down to move on — or back. Standard
                for multi-step forms and the single biggest friction fix here. */}
            <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex gap-3 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-700 dark:bg-gray-900/95 dark:supports-[backdrop-filter]:bg-gray-900/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-2 sm:backdrop-blur-none dark:sm:bg-transparent">
              {(currentStep > 0 || (currentStep === 0 && mode === "normal" && !forcedRole)) && (
                <button
                  type="button"
                  onClick={currentStep === 0 ? () => { setSelectedRole(null); clearDraft(); } : handleBack}
                  className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
                >
                  ← {currentStep === 0 ? "Change role" : "Back"}
                </button>
              )}
              {/* Distinct keys, and NEITHER is type="submit".
                  The click that moved you onto the review step used to submit
                  the application by itself: both branches render a <button>, so
                  React reconciled them as the same DOM node and merely patched
                  `type` from "button" to "submit" — synchronously, mid-click.
                  The browser then ran the default action of the element as it
                  stood when the click finished, which was now a submit button.
                  Separate keys force a fresh node, and driving submission from
                  onClick removes the implicit-submission path altogether — so
                  Enter in a text field cannot fire it either. */}
              {!isLastStep ? (
                <button
                  key="continue"
                  type="button"
                  onClick={handleNext}
                  disabled={checkingEmail}
                  className={`flex-1 py-3 rounded-xl font-semibold text-white transition text-sm ${checkingEmail ? "bg-gray-400 cursor-not-allowed" : "bg-townwize-primary hover:bg-townwize-primaryDark"}`}
                >
                  {checkingEmail ? "Checking…" : "Continue →"}
                </button>
              ) : (
                <button
                  key="submit"
                  type="button"
                  onClick={methods.handleSubmit(onSubmit)}
                  disabled={isSubmitting || !acceptedPolicies}
                  className={`flex-1 py-3 rounded-xl font-semibold text-white transition text-sm ${isSubmitting || !acceptedPolicies ? "bg-gray-400 cursor-not-allowed" : "bg-townwize-primary hover:bg-townwize-primaryDark"}`}
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
