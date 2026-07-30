import { useFormContext } from "react-hook-form";
import UploadPreview from "../../common/UploadPreview";
import IdentitySection from "../IdentitySection";
import FaceSection from "../FaceSection";

/**
 * Wizer identity: everything that proves who the person is.
 *
 * Previously scattered — the CNIC number sat in the Vehicle step, the CNIC
 * images two steps later in a step keyed `licenseIdentity`, and the driving
 * licence was filed under Vehicle despite being a personal document. The whole
 * group also came last, after seven vehicle photos, so a driver invested the
 * most effort before the cheapest disqualifying check.
 *
 * It now runs third, straight after the account is created.
 */
export default function WizerIdentityStep({
  showIdentity, setShowIdentity, showFace, setShowFace, control, errors: formErrors,
}) {
  const { register, watch, setValue, trigger, formState: { errors } } = useFormContext();

  const licenseFront = watch("licenseFront");
  const licenseBack = watch("licenseBack");

  const mkHandler = (field) => (file) => {
    setValue(field, file, { shouldValidate: true });
    trigger(field);
  };

  const input =
    "mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none text-sm";
  const err = "text-xs text-red-600 mt-1";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Verify your identity</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Towners are riding with a stranger, so every Wizer is identity-checked
          before approval. We do this first — before vehicle details — so nothing
          is wasted if something needs correcting.
        </p>
      </div>

      <div>
        <label className="text-sm text-gray-600 dark:text-gray-300">CNIC Number</label>
        <input
          {...register("cnicNumber")}
          className={input}
          placeholder="XXXXX-XXXXXXX-X"
          maxLength={15}
          inputMode="numeric"
        />
        {errors.cnicNumber && <p className={err}>{errors.cnicNumber.message}</p>}
      </div>

      <IdentitySection
        showIdentity={showIdentity}
        setShowIdentity={setShowIdentity}
        setCnicFrontProgress={() => {}}
        setCnicBackProgress={() => {}}
      />

      <div className="space-y-4 rounded-lg border border-gray-100 p-4 dark:border-gray-700">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Driving Licence</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Must be valid and not expired. Both sides required.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UploadPreview
            id="lic-front-upload"
            label="Licence Front"
            file={licenseFront}
            onFileChange={mkHandler("licenseFront")}
            minWidth={600} minHeight={400} maxSizeMB={5}
            onProgress={() => {}}
          />
          <UploadPreview
            id="lic-back-upload"
            label="Licence Back"
            file={licenseBack}
            onFileChange={mkHandler("licenseBack")}
            minWidth={600} minHeight={400} maxSizeMB={5}
            onProgress={() => {}}
          />
        </div>
        {errors.licenseFront && <p className={err}>{errors.licenseFront.message}</p>}
        {errors.licenseBack && <p className={err}>{errors.licenseBack.message}</p>}
      </div>

      <FaceSection
        showFace={showFace}
        setShowFace={setShowFace}
        control={control}
        errors={formErrors}
      />
    </div>
  );
}
