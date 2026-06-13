import * as yup from "yup";

const FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "application/pdf"];

const fileValidation = (fieldName) =>
  yup
    .mixed()
    .nullable()
    .test("fileSize", `${fieldName} must be less than 10MB`, (value) => {
      if (!value) return true;
      return value.size <= FILE_SIZE;
    })
    .test("fileFormat", `${fieldName} must be JPG, PNG, or PDF`, (value) => {
      if (!value) return true;
      return SUPPORTED_FORMATS.includes(value.type);
    });

export const schema = yup.object().shape({
  name: yup.string().trim().min(3, "Full name is required").required("Full name is required"),
  email: yup.string().email("Invalid email address").required("Email is required"),
  phone: yup
    .string()
    .trim()
    .required("Phone is required")
    .test("pk-phone", "Enter a valid Pakistani mobile number", (value) => {
      const raw = String(value || "").replace(/[^\d+]/g, "");
      if (!raw) return false;
      if (raw.startsWith("+92")) return /^(\+92)3\d{9}$/.test(raw);
      if (raw.startsWith("92")) return /^(92)3\d{9}$/.test(raw);
      return /^03\d{9}$/.test(raw);
    }),
  password: yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
  btkAddress: yup.string().trim().required("BTK address is required"),
  residencyType: yup
    .string()
    .oneOf(["owner", "tenant", "owner_family", "tenant_family"], "Select residency type")
    .required("Residency type is required"),
  cnicNumber: yup
    .string()
    .trim()
    .nullable()
    .test("cnic-format", "CNIC must be in format XXXXX-XXXXXXX-X", (value) => {
      if (!value) return true;
      return /^\d{5}-\d{7}-\d$/.test(value);
    }),
  vehicleType: yup.string().trim().nullable(),
  carType: yup.string().oneOf(["economy", "comfort", "xl"]).nullable(),
  vehicleMake: yup.string().trim().nullable(),
  vehicleModel: yup.string().trim().nullable(),
  vehicleYear: yup
    .string()
    .nullable()
    .test("vehicle-year", "Enter a valid vehicle year", (value) => {
      if (!value) return true;
      const year = Number(value);
      return Number.isFinite(year) && year >= 1980 && year <= 2100;
    }),
  vehicleSeats: yup
    .string()
    .nullable()
    .test("vehicle-seats", "Seats should be between 1 and 12", (value) => {
      if (!value) return true;
      const seats = Number(value);
      return Number.isFinite(seats) && seats >= 1 && seats <= 12;
    }),
  vehicleNumber: yup.string().trim().nullable(),
  vehicleColor: yup.string().trim().nullable(),

  btkProofFile: fileValidation("Proof of Residency"),
  btkIdFront: fileValidation("BTK ID Front"),
  btkIdBack: fileValidation("BTK ID Back"),
  vehicleReg: fileValidation("Vehicle Registration"),
  licenseFront: fileValidation("License Front"),
  licenseBack: fileValidation("License Back"),
  vehiclePhotoFront: fileValidation("Vehicle Front Exterior"),
  vehiclePhotoRear: fileValidation("Vehicle Rear Exterior"),
  vehiclePhotoLeft: fileValidation("Vehicle Left Side"),
  vehiclePhotoRight: fileValidation("Vehicle Right Side"),
  vehiclePhotoInteriorFront: fileValidation("Vehicle Interior Front"),
  vehiclePhotoInteriorRear: fileValidation("Vehicle Interior Rear"),
  vehiclePhotoOdometer: fileValidation("Vehicle Odometer"),
  cnicFront: fileValidation("CNIC Front"),
  cnicBack: fileValidation("CNIC Back"),
  selfie: yup.string().nullable(),
});

export const enforceBusinessRules = (data, role) => {
  const errors = {};

  if (!data.btkProofFile) errors.btkProofFile = "Utility bill proof is required";
  if (!data.btkIdFront) errors.btkIdFront = "BTK ID front is required";
  if (!data.btkIdBack) errors.btkIdBack = "BTK ID back is required";
  if (!data.residencyType) errors.residencyType = "Residency type is required";

  if (role === "driver") {
    if (!data.vehicleReg) errors.vehicleReg = "Vehicle registration is required";
    if (!data.licenseFront) errors.licenseFront = "Driver license front is required";
    if (!data.licenseBack) errors.licenseBack = "Driver license back is required";
    if (!data.vehiclePhotoFront) errors.vehiclePhotoFront = "Front exterior photo is required";
    if (!data.vehiclePhotoRear) errors.vehiclePhotoRear = "Rear exterior photo is required";
    if (!data.vehiclePhotoLeft) errors.vehiclePhotoLeft = "Left side photo is required";
    if (!data.vehiclePhotoRight) errors.vehiclePhotoRight = "Right side photo is required";
    if (!data.vehiclePhotoInteriorFront) errors.vehiclePhotoInteriorFront = "Interior front photo is required";
    if (!data.vehiclePhotoInteriorRear) errors.vehiclePhotoInteriorRear = "Interior rear photo is required";
    if (!data.vehiclePhotoOdometer) errors.vehiclePhotoOdometer = "Odometer photo is required";
    if (!data.cnicFront) errors.cnicFront = "CNIC front is required";
    if (!data.cnicBack) errors.cnicBack = "CNIC back is required";
    if (!data.vehicleType) errors.vehicleType = "Vehicle type is required";
    if (!data.carType) errors.carType = "Car class is required";
    if (!data.vehicleMake) errors.vehicleMake = "Vehicle make is required";
    if (!data.vehicleModel) errors.vehicleModel = "Vehicle model is required";
    if (!data.vehicleYear) errors.vehicleYear = "Vehicle year is required";
    if (!data.vehicleSeats) errors.vehicleSeats = "Seat count is required";
    if (!data.vehicleNumber) errors.vehicleNumber = "Vehicle number is required";
    if (!data.vehicleColor) errors.vehicleColor = "Vehicle color is required";
    if (!data.cnicNumber) errors.cnicNumber = "CNIC number is required";
    if (!data.selfie) errors.selfie = "Selfie verification is required";
  }

  return errors;
};
