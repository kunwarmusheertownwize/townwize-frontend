// 📄 src/components/auth/FaceSection.jsx
import FaceLiveness from "../common/FaceLiveness";

export default function FaceSection({ showFace, setShowFace, control, errors }) {
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setShowFace(!showFace)}
        className="w-full flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-t-lg"
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Face Verification
        </span>
        <span className="text-gray-500 dark:text-gray-300">
          {showFace ? "−" : "+"}
        </span>
      </button>

      {showFace && (
        <div className="p-4 space-y-6">
          <FaceLiveness
            control={control}
            name="selfie"
            label="Selfie Verification"
          />

          {errors?.selfie && (
            <p className="text-xs !text-townwize-error mt-1">
              {errors.selfie.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
