import { useFormContext } from "react-hook-form";
import UploadPreview from "../../common/UploadPreview";

const PHOTOS = [
  { field: "vehiclePhotoFront",         id: "vp-front",    label: "Front Exterior" },
  { field: "vehiclePhotoRear",          id: "vp-rear",     label: "Rear Exterior" },
  { field: "vehiclePhotoLeft",          id: "vp-left",     label: "Left Side" },
  { field: "vehiclePhotoRight",         id: "vp-right",    label: "Right Side" },
  { field: "vehiclePhotoInteriorFront", id: "vp-int-f",    label: "Interior Front Seats" },
  { field: "vehiclePhotoInteriorRear",  id: "vp-int-r",    label: "Interior Rear Seats" },
  { field: "vehiclePhotoOdometer",      id: "vp-odo",      label: "Dashboard / Odometer" },
];

export default function VehiclePhotosStep() {
  const { watch, setValue, trigger, formState: { errors } } = useFormContext();

  const values = PHOTOS.map(p => watch(p.field));
  const uploaded = values.filter(Boolean).length;

  const mkHandler = (field) => (file) => {
    setValue(field, file, { shouldValidate: true });
    trigger(field);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vehicle Condition Photos</p>
          <span className={`text-xs font-medium ${uploaded >= 6 ? "text-green-700" : "text-amber-700"}`}>
            {uploaded}/7 uploaded
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-1.5 rounded transition-all ${uploaded >= 6 ? "bg-green-500" : "bg-amber-500"}`}
            style={{ width: `${Math.round((uploaded / 7) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">All 7 photos required. Clear, well-lit shots from each angle.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PHOTOS.map((p, i) => (
          <UploadPreview
            key={p.field}
            id={p.id}
            label={p.label}
            file={values[i]}
            onFileChange={mkHandler(p.field)}
            minWidth={600} minHeight={400}
            // Live capture: the whole point is evidence of THIS vehicle, and a
            // gallery pick proves nothing. 8 MB because an unprocessed
            // full-resolution phone photo routinely exceeds 5.
            requireCamera captureAspect={4 / 3} maxSizeMB={8}
          />
        ))}
      </div>

      <div className="space-y-1">
        {PHOTOS.map(p => errors[p.field] && (
          <p key={p.field} className="text-xs text-red-600">{errors[p.field].message}</p>
        ))}
      </div>
    </div>
  );
}
