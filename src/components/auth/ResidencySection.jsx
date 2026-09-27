import { useFormContext } from "react-hook-form";
import UploadPreview from "../common/UploadPreview";

export default function ResidencySection({
  showResidency,
  setShowResidency,
  setBtkProofProgress,
  setBtkFrontProgress,
  setBtkBackProgress,
}) {
  // ✅ pull directly from form context
  const {
    register,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext();

  // ✅ watch files for preview rendering
  const btkProofFile = watch("btkProofFile");
  const btkIdFront = watch("btkIdFront");
  const btkIdBack = watch("btkIdBack");
  const residencyType = watch("residencyType");

  const residencyGuidance = (() => {
    if (residencyType === "owner") {
      return {
        title: "Owner Verification",
        text: "Your name should match BTK ID and residency records. Address consistency is mandatory.",
      };
    }
    if (residencyType === "owner_family") {
      return {
        title: "Owner Family Verification",
        text: "Family-member residency is allowed. BTK ID details must still be valid and address consistency is mandatory.",
      };
    }
    if (residencyType === "tenant") {
      return {
        title: "Tenant Verification",
        text: "Bill name can differ from applicant name. BTK ID validity and address consistency checks still apply.",
      };
    }
    if (residencyType === "tenant_family") {
      return {
        title: "Tenant Family Verification",
        text: "Tenant-family residency is allowed. Applicant and bill name may differ, but BTK ID validity and address consistency still apply.",
      };
    }
    return {
      title: "Residency Guidance",
      text: "Select residency type to see exact verification expectations for your case.",
    };
  })();

  const handleProofChange = (file) => {
    setValue("btkProofFile", file, { shouldValidate: true });
    trigger("btkProofFile");
  };

  const handleFrontChange = (file) => {
    setValue("btkIdFront", file, { shouldValidate: true });
    trigger("btkIdFront");
  };

  const handleBackChange = (file) => {
    setValue("btkIdBack", file, { shouldValidate: true });
    trigger("btkIdBack");
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setShowResidency(!showResidency)}
        className="w-full flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-t-lg"
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Residency Verification
        </span>
        <span className="text-gray-500 dark:text-gray-300">
          {showResidency ? "−" : "+"}
        </span>
      </button>

      {showResidency && (
        <div className="p-4 space-y-6">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-300">
              Residency Type
            </label>
            <select
              {...register("residencyType")}
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
            >
              <option value="">Select</option>
              <option value="owner">Owner</option>
              <option value="tenant">Tenant</option>
              <option value="owner_family">Owner Family</option>
              <option value="tenant_family">Tenant Family</option>
            </select>
            {errors.residencyType && (
              <p className="text-xs !text-townwize-error mt-1">
                {errors.residencyType.message}
              </p>
            )}
          </div>

          {/* BTK Address */}
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-300">
              BTK Address
            </label>
            <input
              {...register("btkAddress")}
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
              placeholder="Street, Precinct, Bahria Town Karachi"
            />
            {errors.btkAddress && (
              <p className="text-xs !text-townwize-error mt-1">
                {errors.btkAddress.message}
              </p>
            )}
          </div>

          {/* BTK Registration No. — printed on the BTK ID card as "REG. No."
              The redesigned card carries no address, so this is the only field
              on it we can verify against what the applicant types. */}
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-300">
              BTK Registration No.
            </label>
            <input
              {...register("btkRegNo")}
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none uppercase"
              placeholder="e.g. BTKSC-V00711"
            />
            {/* The card shows CARD ID directly above REG. No., and they are
                different numbers. Saying so here is cheaper than rejecting the
                application after the upload. */}
            <p className="mt-1 text-xs text-gray-400">
              Find <span className="font-semibold">REG. No.</span> on the front of your BTK ID card —
              it is the line <span className="font-semibold">below CARD ID</span>, and starts with letters.
              We check it against the card you upload.
            </p>
            {errors.btkRegNo && (
              <p className="text-xs !text-townwize-error mt-1">
                {errors.btkRegNo.message}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-3 py-2">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {residencyGuidance.title}
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-200 mt-1">
              {residencyGuidance.text}
            </p>
          </div>

          {/* Utility Bill Proof */}
          <UploadPreview
            id="btk-proof-upload"
            label="Utility Bill (Proof)"
            hint="A clear photo or the PDF from your email. All four corners must be visible."
            file={btkProofFile}
            onFileChange={handleProofChange}
            minWidth={400}
            minHeight={300}
            maxSizeMB={5}
            onProgress={setBtkProofProgress}
          />
          {errors.btkProofFile && (
            <p className="text-xs  mt-1">
              {errors.btkProofFile.message}
            </p>
          )}
          <p className="text-sm text-townwize-e1 font-medium mt-1">
            ⚠ If the bill is not in your name, the address must match your BTK ID.
          </p>
          {/* BTK ID Front/Back */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
            <UploadPreview
              id="btk-id-front-upload"
              label="BTK ID Front"
              hint="Take the card out of its plastic sleeve. Fill the frame, avoid reflections."
              file={btkIdFront}
              onFileChange={handleFrontChange}
              minWidth={400}
              minHeight={300}
              maxSizeMB={8}
              requireCamera
              onProgress={setBtkFrontProgress}
            />
            <UploadPreview
              id="btk-id-back-upload"
              label="BTK ID Back"
              hint="Take the card out of its plastic sleeve. Fill the frame, avoid reflections."
              file={btkIdBack}
              onFileChange={handleBackChange}
              minWidth={400}
              minHeight={300}
              maxSizeMB={8}
              requireCamera
              onProgress={setBtkBackProgress}
            />
          </div>
          {errors.btkIdFront && (
            <p className="text-xs !text-townwize-error mt-1">
              {errors.btkIdFront.message}
            </p>
          )}
          {errors.btkIdBack && (
            <p className="text-xs !text-townwize-error mt-1">
              {errors.btkIdBack.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
