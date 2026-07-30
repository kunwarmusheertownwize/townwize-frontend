// 📄 src/components/auth/FaceSection.jsx
import FaceLiveness from "../common/FaceLiveness";

/**
 * Face verification.
 *
 * Was an accordion wrapping a component that printed its own "Selfie
 * Verification" heading — so a single button sat beneath three stacked titles
 * ("Face Verification" / "Selfie Verification" / "Initializing…"), and it
 * started collapsed, hiding a mandatory step behind a tap.
 *
 * It is one required action, so it is always open and titled once.
 */
export default function FaceSection({ control, errors }) {
  return (
    <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-700">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Face Verification</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          A quick check that you match your CNIC photo. This is not shown to Towners.
        </p>
      </div>

      <FaceLiveness control={control} name="selfie" />

      {errors?.selfie && (
        <p className="mt-2 text-xs !text-townwize-error">{errors.selfie.message}</p>
      )}
    </div>
  );
}
