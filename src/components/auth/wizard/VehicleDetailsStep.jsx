import { useFormContext } from "react-hook-form";
import UploadPreview from "../../common/UploadPreview";

export default function VehicleDetailsStep({ setVehicleProgress, setLicenseFrontProgress, setLicenseBackProgress }) {
  const { register, watch, setValue, trigger, formState: { errors } } = useFormContext();

  const vehicleReg = watch("vehicleReg");
  const hasMTag = watch("hasMTag");
  const mTagPhoto = watch("mTagPhoto");

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
              Townwize requires a verified M-Tag before you can go online. M-Tag holders also pay a lower toll on BTK trips.
            </p>
          </div>
        </label>

        {/* Wording stays honest: cash lanes DO exist at the BTK exit, the BTK
            entrance and M-9, so a Wizer without a tag can still make the trip.
            Requiring one is our policy. Applicants drive that road daily and
            would spot an overstatement immediately. */}
        {hasMTag ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Photograph the M-Tag on your windscreen. An admin checks it before you can go online.
            </p>
            <UploadPreview
              id="mtag-photo-upload"
              label="M-Tag on windscreen"
              file={mTagPhoto}
              onFileChange={mkHandler("mTagPhoto")}
              minWidth={600} minHeight={400} maxSizeMB={8}
              requireCamera captureAspect={4 / 3}
            />
            {errors.mTagPhoto && <p className={err}>{errors.mTagPhoto.message}</p>}
          </div>
        ) : (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Without a verified M-Tag you will not be able to go online. You can finish
            registering and add it later from your profile.
          </p>
        )}
      </div>

      {/* Licence and CNIC moved to the Identity step — they identify the person,
          not the vehicle. Only the registration document belongs here. */}
      <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vehicle Document</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UploadPreview
            id="veh-reg-upload"
            label="Vehicle Registration"
            file={vehicleReg}
            onFileChange={mkHandler("vehicleReg", setVehicleProgress)}
            minWidth={600} minHeight={400} maxSizeMB={8}
            requireCamera
            onProgress={setVehicleProgress}
          />
        </div>
        {errors.vehicleReg && <p className={err}>{errors.vehicleReg.message}</p>}
      </div>
    </div>
  );
}
