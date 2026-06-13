import { useFormContext } from "react-hook-form";
import UploadPreview from "../common/UploadPreview";

export default function VehicleSection({
  showVehicle,
  setShowVehicle,
  setVehicleProgress,
  setLicenseFrontProgress,
  setLicenseBackProgress,
}) {
  const {
    register,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext();

  const vehicleReg = watch("vehicleReg");
  const licenseFront = watch("licenseFront");
  const licenseBack = watch("licenseBack");
  const vehiclePhotoFront = watch("vehiclePhotoFront");
  const vehiclePhotoRear = watch("vehiclePhotoRear");
  const vehiclePhotoLeft = watch("vehiclePhotoLeft");
  const vehiclePhotoRight = watch("vehiclePhotoRight");
  const vehiclePhotoInteriorFront = watch("vehiclePhotoInteriorFront");
  const vehiclePhotoInteriorRear = watch("vehiclePhotoInteriorRear");
  const vehiclePhotoOdometer = watch("vehiclePhotoOdometer");
  const conditionFiles = [
    vehiclePhotoFront,
    vehiclePhotoRear,
    vehiclePhotoLeft,
    vehiclePhotoRight,
    vehiclePhotoInteriorFront,
    vehiclePhotoInteriorRear,
    vehiclePhotoOdometer,
  ];
  const uploadedConditionCount = conditionFiles.filter(Boolean).length;

  const handleVehicleChange = (file) => {
    setValue("vehicleReg", file, { shouldValidate: true });
    trigger("vehicleReg");
  };

  const handleFrontChange = (file) => {
    setValue("licenseFront", file, { shouldValidate: true });
    trigger("licenseFront");
  };

  const handleBackChange = (file) => {
    setValue("licenseBack", file, { shouldValidate: true });
    trigger("licenseBack");
  };

  const makeFileHandler = (field) => (file) => {
    setValue(field, file, { shouldValidate: true });
    trigger(field);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
      <button
        type="button"
        onClick={() => setShowVehicle(!showVehicle)}
        className="w-full flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-t-lg"
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Vehicle & License
        </span>
        <span className="text-gray-500 dark:text-gray-300">
          {showVehicle ? "−" : "+"}
        </span>
      </button>

      {showVehicle && (
        <div className="space-y-6 p-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vehicle Basics</p>
            <p className="mt-1 text-xs text-gray-500">Set car class and vehicle details exactly as registration documents.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Vehicle Type</label>
              <select
                {...register("vehicleType")}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
              >
                <option value="Car">Car</option>
                <option value="Van">Van</option>
              </select>
              {errors.vehicleType && (
                <p className="text-xs !text-townwize-error mt-1">{errors.vehicleType.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Car Class</label>
              <select
                {...register("carType")}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
              >
                <option value="economy">Economy</option>
                <option value="comfort">Comfort</option>
                <option value="xl">XL</option>
              </select>
              {errors.carType && (
                <p className="text-xs !text-townwize-error mt-1">{errors.carType.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Vehicle Number</label>
              <input
                {...register("vehicleNumber")}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
                placeholder="ABC-123"
              />
              {errors.vehicleNumber && (
                <p className="text-xs !text-townwize-error mt-1">{errors.vehicleNumber.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Vehicle Color</label>
              <input
                {...register("vehicleColor")}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
                placeholder="White"
              />
              {errors.vehicleColor && (
                <p className="text-xs !text-townwize-error mt-1">{errors.vehicleColor.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Make</label>
              <input
                {...register("vehicleMake")}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
                placeholder="Toyota"
              />
              {errors.vehicleMake && (
                <p className="text-xs !text-townwize-error mt-1">{errors.vehicleMake.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Model</label>
              <input
                {...register("vehicleModel")}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
                placeholder="Corolla"
              />
              {errors.vehicleModel && (
                <p className="text-xs !text-townwize-error mt-1">{errors.vehicleModel.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Year</label>
              <input
                type="number"
                {...register("vehicleYear")}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
                placeholder="2020"
              />
              {errors.vehicleYear && (
                <p className="text-xs !text-townwize-error mt-1">{errors.vehicleYear.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">Seats</label>
              <input
                type="number"
                {...register("vehicleSeats")}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 outline-none"
                placeholder="4"
              />
              {errors.vehicleSeats && (
                <p className="text-xs !text-townwize-error mt-1">{errors.vehicleSeats.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-700">
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Required Vehicle Documents</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <UploadPreview
                id="vehicle-upload"
                label="Vehicle Registration"
                file={vehicleReg}
                onFileChange={handleVehicleChange}
                minWidth={600}
                minHeight={400}
                maxSizeMB={5}
                onProgress={setVehicleProgress}
              />
              <UploadPreview
                id="license-front-upload"
                label="License Front"
                file={licenseFront}
                onFileChange={handleFrontChange}
                minWidth={600}
                minHeight={400}
                maxSizeMB={5}
                onProgress={setLicenseFrontProgress}
              />
              <UploadPreview
                id="license-back-upload"
                label="License Back"
                file={licenseBack}
                onFileChange={handleBackChange}
                minWidth={600}
                minHeight={400}
                maxSizeMB={5}
                onProgress={setLicenseBackProgress}
              />
            </div>
          </div>
          {errors.vehicleReg && <p className="mt-1 text-xs !text-townwize-error">{errors.vehicleReg.message}</p>}
          {errors.licenseFront && (
            <p className="mt-1 text-xs !text-townwize-error">{errors.licenseFront.message}</p>
          )}
          {errors.licenseBack && (
            <p className="mt-1 text-xs !text-townwize-error">{errors.licenseBack.message}</p>
          )}

          <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-700">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vehicle Condition Photos</p>
              <span className={`text-xs font-medium ${uploadedConditionCount >= 6 ? "text-green-700" : "text-amber-700"}`}>
                {uploadedConditionCount}/7 uploaded
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500">Upload clear photos. Minimum 6 required for condition pass during admin review.</p>

            <div className="mb-4 h-1.5 rounded bg-gray-100">
              <div
                className={`h-1.5 rounded ${uploadedConditionCount >= 6 ? "bg-green-500" : "bg-amber-500"}`}
                style={{ width: `${Math.round((uploadedConditionCount / 7) * 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <UploadPreview id="vehicle-photo-front" label="Front Exterior" file={vehiclePhotoFront} onFileChange={makeFileHandler("vehiclePhotoFront")} minWidth={600} minHeight={400} maxSizeMB={5} />
              <UploadPreview id="vehicle-photo-rear" label="Rear Exterior" file={vehiclePhotoRear} onFileChange={makeFileHandler("vehiclePhotoRear")} minWidth={600} minHeight={400} maxSizeMB={5} />
              <UploadPreview id="vehicle-photo-left" label="Left Side" file={vehiclePhotoLeft} onFileChange={makeFileHandler("vehiclePhotoLeft")} minWidth={600} minHeight={400} maxSizeMB={5} />
              <UploadPreview id="vehicle-photo-right" label="Right Side" file={vehiclePhotoRight} onFileChange={makeFileHandler("vehiclePhotoRight")} minWidth={600} minHeight={400} maxSizeMB={5} />
              <UploadPreview id="vehicle-photo-interior-front" label="Interior Front Seats" file={vehiclePhotoInteriorFront} onFileChange={makeFileHandler("vehiclePhotoInteriorFront")} minWidth={600} minHeight={400} maxSizeMB={5} />
              <UploadPreview id="vehicle-photo-interior-rear" label="Interior Rear Seats" file={vehiclePhotoInteriorRear} onFileChange={makeFileHandler("vehiclePhotoInteriorRear")} minWidth={600} minHeight={400} maxSizeMB={5} />
              <UploadPreview id="vehicle-photo-odometer" label="Dashboard / Odometer" file={vehiclePhotoOdometer} onFileChange={makeFileHandler("vehiclePhotoOdometer")} minWidth={600} minHeight={400} maxSizeMB={5} />
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800/40">
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Extra Angle (optional)</p>
                <div className="flex h-28 items-center justify-center rounded-md border-2 border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-700">
                  Reserved for future use
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {errors.vehiclePhotoFront && <p className="text-xs !text-townwize-error">{errors.vehiclePhotoFront.message}</p>}
              {errors.vehiclePhotoRear && <p className="text-xs !text-townwize-error">{errors.vehiclePhotoRear.message}</p>}
              {errors.vehiclePhotoLeft && <p className="text-xs !text-townwize-error">{errors.vehiclePhotoLeft.message}</p>}
              {errors.vehiclePhotoRight && <p className="text-xs !text-townwize-error">{errors.vehiclePhotoRight.message}</p>}
              {errors.vehiclePhotoInteriorFront && <p className="text-xs !text-townwize-error">{errors.vehiclePhotoInteriorFront.message}</p>}
              {errors.vehiclePhotoInteriorRear && <p className="text-xs !text-townwize-error">{errors.vehiclePhotoInteriorRear.message}</p>}
              {errors.vehiclePhotoOdometer && <p className="text-xs !text-townwize-error">{errors.vehiclePhotoOdometer.message}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
