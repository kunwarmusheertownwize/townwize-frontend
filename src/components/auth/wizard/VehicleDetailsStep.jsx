import { useFormContext } from "react-hook-form";
import UploadPreview from "../../common/UploadPreview";

export default function VehicleDetailsStep({ setVehicleProgress, setLicenseFrontProgress, setLicenseBackProgress }) {
  const { register, watch, setValue, trigger, formState: { errors } } = useFormContext();

  const vehicleReg = watch("vehicleReg");
  const licenseFront = watch("licenseFront");
  const licenseBack = watch("licenseBack");

  const mkHandler = (field, setter) => (file) => {
    setValue(field, file, { shouldValidate: true });
    setter?.(file ? 100 : 0);
    trigger(field);
  };

  const input = "mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none text-sm";
  const err = "text-xs text-red-600 mt-1";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-100 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 p-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vehicle Basics</p>
        <p className="mt-1 text-xs text-gray-500">Enter details exactly as they appear on your registration documents.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">Vehicle Type</label>
          <select {...register("vehicleType")} className={input}>
            <option value="Car">Car</option>
            <option value="Van">Van</option>
          </select>
          {errors.vehicleType && <p className={err}>{errors.vehicleType.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">Car Class</label>
          <select {...register("carType")} className={input}>
            <option value="economy">Economy</option>
            <option value="comfort">Comfort</option>
            <option value="xl">XL</option>
          </select>
          {errors.carType && <p className={err}>{errors.carType.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">Vehicle Number</label>
          <input {...register("vehicleNumber")} className={input} placeholder="ABC-123" />
          {errors.vehicleNumber && <p className={err}>{errors.vehicleNumber.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">Make</label>
          <input {...register("vehicleMake")} className={input} placeholder="Toyota" />
          {errors.vehicleMake && <p className={err}>{errors.vehicleMake.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">Model</label>
          <input {...register("vehicleModel")} className={input} placeholder="Corolla" />
          {errors.vehicleModel && <p className={err}>{errors.vehicleModel.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">Year</label>
          <input type="number" {...register("vehicleYear")} className={input} placeholder="2020" />
          {errors.vehicleYear && <p className={err}>{errors.vehicleYear.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">Seats</label>
          <input type="number" {...register("vehicleSeats")} className={input} placeholder="4" />
          {errors.vehicleSeats && <p className={err}>{errors.vehicleSeats.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">Color</label>
          <input {...register("vehicleColor")} className={input} placeholder="White" />
          {errors.vehicleColor && <p className={err}>{errors.vehicleColor.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300">CNIC Number</label>
          <input
            {...register("cnicNumber")}
            className={input}
            placeholder="XXXXX-XXXXXXX-X"
            maxLength={15}
          />
          {errors.cnicNumber && <p className={err}>{errors.cnicNumber.message}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("hasMTag")}
            className="mt-0.5 h-4 w-4 accent-townwize-primary cursor-pointer"
          />
          <div>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">I have an M-Tag</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              M-Tag holders pay a lower toll rate. If selected, the system will automatically apply M-Tag rates when calculating toll charges on your rides.
            </p>
          </div>
        </label>
      </div>

      <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vehicle Documents</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UploadPreview
            id="veh-reg-upload"
            label="Vehicle Registration"
            file={vehicleReg}
            onFileChange={mkHandler("vehicleReg", setVehicleProgress)}
            minWidth={600} minHeight={400} maxSizeMB={5}
            onProgress={setVehicleProgress}
          />
          <UploadPreview
            id="lic-front-upload"
            label="License Front"
            file={licenseFront}
            onFileChange={mkHandler("licenseFront", setLicenseFrontProgress)}
            minWidth={600} minHeight={400} maxSizeMB={5}
            onProgress={setLicenseFrontProgress}
          />
          <UploadPreview
            id="lic-back-upload"
            label="License Back"
            file={licenseBack}
            onFileChange={mkHandler("licenseBack", setLicenseBackProgress)}
            minWidth={600} minHeight={400} maxSizeMB={5}
            onProgress={setLicenseBackProgress}
          />
        </div>
        {errors.vehicleReg    && <p className={err}>{errors.vehicleReg.message}</p>}
        {errors.licenseFront  && <p className={err}>{errors.licenseFront.message}</p>}
        {errors.licenseBack   && <p className={err}>{errors.licenseBack.message}</p>}
      </div>
    </div>
  );
}
