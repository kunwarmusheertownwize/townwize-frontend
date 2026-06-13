//File: townwize-frontend/src/components/auth/RegistrationProgress.jsx


import { useFormContext} from "react-hook-form";


export default function RegistrationProgress({
  role,
  showReferral,
  btkProofProgress,
  btkFrontProgress,
  btkBackProgress,
  vehicleProgress,
  licenseFrontProgress,
  licenseBackProgress,
  cnicFrontProgress,
  cnicBackProgress,
  selfieProgress,
  referralVerified,
  compact = false,
}) {
  const {
    watch,
    formState: { errors, dirtyFields },
  } = useFormContext();

  // ✅ watch inputs
  const name = watch("name");
  const email = watch("email");
  const phone = watch("phone");
  const password = watch("password");
  //const referralCode = watch("referralCode");
  const btkAddress = watch("btkAddress");
  const btkProofFile = watch("btkProofFile");
  const btkIdFront = watch("btkIdFront");
  const btkIdBack = watch("btkIdBack");
  const vehicleReg = watch("vehicleReg");
  const licenseFront = watch("licenseFront");
  const licenseBack = watch("licenseBack");
  const vehicleType = watch("vehicleType");
  const carType = watch("carType");
  const vehicleNumber = watch("vehicleNumber");
  const vehicleColor = watch("vehicleColor");
  const vehicleMake = watch("vehicleMake");
  const vehicleModel = watch("vehicleModel");
  const vehicleYear = watch("vehicleYear");
  const vehicleSeats = watch("vehicleSeats");
  const vehiclePhotoFront = watch("vehiclePhotoFront");
  const vehiclePhotoRear = watch("vehiclePhotoRear");
  const vehiclePhotoLeft = watch("vehiclePhotoLeft");
  const vehiclePhotoRight = watch("vehiclePhotoRight");
  const vehiclePhotoInteriorFront = watch("vehiclePhotoInteriorFront");
  const vehiclePhotoInteriorRear = watch("vehiclePhotoInteriorRear");
  const vehiclePhotoOdometer = watch("vehiclePhotoOdometer");
  const cnicNumber = watch("cnicNumber");
  const cnicFront = watch("cnicFront");
  const cnicBack = watch("cnicBack");
  const selfie = watch("selfie");

  const isDirtyValid = (fieldKey, value, error) => {
    return Boolean(dirtyFields?.[fieldKey]) && Boolean(value) && !error;
  };

  
  // ✅ section configs
  const sections = [
    {
      label: "Account Info",
      fields: [
        { valid: name && !errors.name, error: errors.name?.message },
        { valid: email && !errors.email, error: errors.email?.message },
        { valid: phone && !errors.phone, error: errors.phone?.message },
        { valid: password && !errors.password, error: errors.password?.message },
      ],
    },
    {
      label: "Referral",
      skip: !showReferral,
      fields: showReferral
        ? [
          {
            valid: referralVerified, // ✅ only true if backend confirms
            error: errors.referralCode?.message,
          },
        ]
        : [],
    },

    {
      label: "Residency Verification",
      fields: [
        { valid: btkAddress && !errors.btkAddress, error: errors.btkAddress?.message },
        { valid: btkProofFile && !errors.btkProofFile, error: errors.btkProofFile?.message },
        { valid: btkIdFront && !errors.btkIdFront, error: errors.btkIdFront?.message },
        { valid: btkIdBack && !errors.btkIdBack, error: errors.btkIdBack?.message },
      ],
      uploading:
        (btkProofProgress > 0 && btkProofProgress < 100) ||
        (btkFrontProgress > 0 && btkFrontProgress < 100) ||
        (btkBackProgress > 0 && btkBackProgress < 100),
    },
    {
      label: "Vehicle & License",
      skip: role !== "driver",
      fields:
        role === "driver"
          ? [
            { valid: isDirtyValid("vehicleType", vehicleType, errors.vehicleType), error: errors.vehicleType?.message },
            { valid: isDirtyValid("carType", carType, errors.carType), error: errors.carType?.message },
            { valid: isDirtyValid("vehicleNumber", vehicleNumber, errors.vehicleNumber), error: errors.vehicleNumber?.message },
            { valid: isDirtyValid("vehicleColor", vehicleColor, errors.vehicleColor), error: errors.vehicleColor?.message },
            { valid: isDirtyValid("vehicleMake", vehicleMake, errors.vehicleMake), error: errors.vehicleMake?.message },
            { valid: isDirtyValid("vehicleModel", vehicleModel, errors.vehicleModel), error: errors.vehicleModel?.message },
            { valid: isDirtyValid("vehicleYear", vehicleYear, errors.vehicleYear), error: errors.vehicleYear?.message },
            { valid: isDirtyValid("vehicleSeats", vehicleSeats, errors.vehicleSeats), error: errors.vehicleSeats?.message },
            { valid: vehicleReg && !errors.vehicleReg, error: errors.vehicleReg?.message },
            { valid: licenseFront && !errors.licenseFront, error: errors.licenseFront?.message },
            { valid: licenseBack && !errors.licenseBack, error: errors.licenseBack?.message },
            { valid: vehiclePhotoFront && !errors.vehiclePhotoFront, error: errors.vehiclePhotoFront?.message },
            { valid: vehiclePhotoRear && !errors.vehiclePhotoRear, error: errors.vehiclePhotoRear?.message },
            { valid: vehiclePhotoLeft && !errors.vehiclePhotoLeft, error: errors.vehiclePhotoLeft?.message },
            { valid: vehiclePhotoRight && !errors.vehiclePhotoRight, error: errors.vehiclePhotoRight?.message },
            { valid: vehiclePhotoInteriorFront && !errors.vehiclePhotoInteriorFront, error: errors.vehiclePhotoInteriorFront?.message },
            { valid: vehiclePhotoInteriorRear && !errors.vehiclePhotoInteriorRear, error: errors.vehiclePhotoInteriorRear?.message },
            { valid: vehiclePhotoOdometer && !errors.vehiclePhotoOdometer, error: errors.vehiclePhotoOdometer?.message },
          ]
          : [],
      uploading:
        role === "driver" &&
        ((vehicleProgress > 0 && vehicleProgress < 100) ||
          (licenseFrontProgress > 0 && licenseFrontProgress < 100) ||
          (licenseBackProgress > 0 && licenseBackProgress < 100)),
    },
    {
      label: "Identity Verification",
      skip: role !== "driver",
      fields:
        role === "driver"
          ? [
            { valid: cnicNumber && !errors.cnicNumber, error: errors.cnicNumber?.message },
            { valid: cnicFront && !errors.cnicFront, error: errors.cnicFront?.message },
            { valid: cnicBack && !errors.cnicBack, error: errors.cnicBack?.message },
          ]
          : [],
      uploading:
        role === "driver" &&
        ((cnicFrontProgress > 0 && cnicFrontProgress < 100) ||
          (cnicBackProgress > 0 && cnicBackProgress < 100)),
    },
    {
      label: "Face Verification",
      skip: role !== "driver",
      fields: role === "driver"
        ? [{ valid: selfie && !errors.selfie, error: errors.selfie?.message }]
        : [],
      uploading: role === "driver" && selfieProgress > 0 && selfieProgress < 100,
    },
  ];

  // ✅ calc per-section %
  sections.forEach((s) => {
    const total = s.fields.length;
    const done = s.fields.filter((f) => f.valid).length;
    s.percent = total > 0 ? Math.round((done / total) * 100) : 0;
    s.done = total > 0 && done === total;
    s.sectionErrors = s.fields.filter((f) => f.error).map((f) => f.error);
  });

  const allFields = sections.flatMap((s) => s.fields);
  const totalFields = allFields.length;
  const completedFields = allFields.filter((f) => f.valid).length;
  const overallPercent = Math.round((completedFields / totalFields) * 100);

  let barColor = "bg-red-500";
  if (overallPercent >= 70) barColor = "bg-green-500";
  else if (overallPercent >= 30) barColor = "bg-yellow-500";

  return (
    <div
      className={`${compact
        ? "bg-white dark:bg-gray-800 p-3 rounded-md"
        : "bg-gray-50 dark:bg-gray-700 p-4 rounded-xl mb-6"
        }`}
    >
      <h2
        className={`${compact ? "text-sm mb-2" : "text-lg mb-3"
          } font-semibold text-gray-800 dark:text-gray-200`}
      >
        {compact ? "Progress" : "Registration Progress"}
      </h2>

      {/* overall bar */}
      <div
        className={`w-full bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden ${compact ? "h-2 mb-2" : "h-3 mb-4"
          }`}
      >
        <div
          className={`${barColor} ${compact ? "h-2" : "h-3"} rounded-full transition-all duration-500 ease-in-out ${overallPercent < 10
            ? "bg-townwize-progR"
            : overallPercent < 26
              ? "bg-townwize-prog1"
              : overallPercent < 50
                ? "bg-townwize-prog2"
                : overallPercent < 75
                  ? "bg-townwize-prog3"
                  : overallPercent < 95
                    ? "bg-townwize-prog4"
                    : "bg-townwize-progS"
            }`}
          style={{ width: `${Math.max(overallPercent, 5)}%` }}
        />
      </div>

      {!compact && (
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
          {overallPercent}% completed
        </p>
      )}

      {/* section list with mini-bars */}
      <ul className="space-y-3">
        {sections.map(
          (s, idx) =>
            !s.skip && (
              <li key={idx}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">
                    {s.label}
                  </span>
                  <span>
                    {s.uploading
                      ? "⏳ Uploading…"
                      : s.done
                        ? "✔️"
                        : `${s.percent}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ease-in-out ${s.percent < 10
                      ? "bg-townwize-progR"
                      : s.percent < 26
                        ? "bg-townwize-prog1"
                        : s.percent < 50
                          ? "bg-townwize-prog2"
                          : s.percent < 75
                            ? "bg-townwize-prog3"
                            : s.percent < 95
                              ? "bg-townwize-prog4"
                              : "bg-townwize-progS"
                      }`}
                    style={{ width: `${Math.max(s.percent, 5)}%` }}
                  />
                </div>
                {/* inline errors */}
                {s.sectionErrors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {s.sectionErrors.map((err, i) => (
                      <li
                        key={i}
                        className="text-xs text-red-500 dark:text-red-400"
                      >
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
        )}
      </ul>
    </div>
  );
}
