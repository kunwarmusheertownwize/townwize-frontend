import { useFormContext } from "react-hook-form";
import UploadPreview from "../common/UploadPreview";

export default function IdentitySection({
  showIdentity,
  setShowIdentity,
  setCnicFrontProgress,
  setCnicBackProgress,
}) {
  const {
    register,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext();

  const cnicFront = watch("cnicFront");
  const cnicBack = watch("cnicBack");
  const cnicNumber = watch("cnicNumber") || "";

  const formatCnicInput = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 13);
    const a = digits.slice(0, 5);
    const b = digits.slice(5, 12);
    const c = digits.slice(12, 13);
    if (digits.length <= 5) return a;
    if (digits.length <= 12) return `${a}-${b}`;
    return `${a}-${b}-${c}`;
  };

  const handleFrontChange = (file) => {
    setValue("cnicFront", file, { shouldValidate: true });
    trigger("cnicFront");
  };

  const handleBackChange = (file) => {
    setValue("cnicBack", file, { shouldValidate: true });
    trigger("cnicBack");
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
      <button
        type="button"
        onClick={() => setShowIdentity(!showIdentity)}
        className="w-full flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-t-lg"
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Identity Verification
        </span>
        <span className="text-gray-500 dark:text-gray-300">
          {showIdentity ? "−" : "+"}
        </span>
      </button>

      {showIdentity && (
        <div className="p-4 space-y-6">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-300">CNIC Number</label>
            <input
              {...register("cnicNumber")}
              value={cnicNumber}
              onChange={(e) =>
                setValue("cnicNumber", formatCnicInput(e.target.value), {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
              placeholder="XXXXX-XXXXXXX-X"
            />
            {errors.cnicNumber && (
              <p className="text-xs !text-townwize-error mt-1">{errors.cnicNumber.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
            <UploadPreview
              id="cnic-front-upload"
              label="CNIC Front"
              hint="Take it out of any cover. Fill the frame, avoid glare."
              file={cnicFront}
              onFileChange={handleFrontChange}
              minWidth={600}
              minHeight={400}
              maxSizeMB={8}
              requireCamera
              onProgress={setCnicFrontProgress}
            />
            <UploadPreview
              id="cnic-back-upload"
              label="CNIC Back"
              hint="Take it out of any cover. Fill the frame, avoid glare."
              file={cnicBack}
              onFileChange={handleBackChange}
              minWidth={600}
              minHeight={400}
              maxSizeMB={8}
              requireCamera
              onProgress={setCnicBackProgress}
            />
          </div>
          {errors.cnicFront && (
            <p className="text-xs !text-townwize-error mt-1">
              {errors.cnicFront.message}
            </p>
          )}
          {errors.cnicBack && (
            <p className="text-xs !text-townwize-error mt-1">
              {errors.cnicBack.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
