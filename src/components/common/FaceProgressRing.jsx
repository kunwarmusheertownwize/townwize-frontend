/**
 * Circular progress ring around the camera view.
 *
 * Liveness is five head movements, and the old UI reported them only as a line
 * of text ("Now turn left"). With no visual sense of how far through you are,
 * people stop early or repeat a movement.
 *
 * The ring sweeps continuously from 0 to 100% as steps pass. Dashed while in
 * progress so it reads as a guide rather than a border, solid green on success,
 * red on failure.
 */
export default function FaceProgressRing({
  progress = 0,          // 0..1
  state = "active",      // active | success | error
  size = 240,
  stroke = 6,
  children,
}) {
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, progress));

  const colour =
    state === "success" ? "#15803D" : state === "error" ? "#D92D20" : "#17BEBB";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        {/* track */}
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={stroke}
        />
        {/* progress — dashed while working, solid once resolved */}
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={
            state === "active"
              ? `${circumference * pct} ${circumference}`
              : `${circumference} ${circumference}`
          }
          style={{
            transition: "stroke-dasharray 400ms ease, stroke 200ms ease",
            // A dashed look while in progress, without breaking the sweep maths:
            // the sweep is one long dash, and this overlays the dash rhythm.
            ...(state === "active" ? { strokeDashoffset: 0 } : {}),
          }}
        />
        {/* dash rhythm, drawn over the sweep so it reads as segmented */}
        {state === "active" && (
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke="currentColor"
            className="text-white dark:text-gray-900"
            strokeWidth={stroke}
            strokeDasharray="2 10"
            opacity="0.55"
          />
        )}
      </svg>

      {/* camera view sits inside the ring */}
      <div
        className="absolute overflow-hidden rounded-full bg-black"
        style={{ inset: stroke * 2.5 }}
      >
        {children}
      </div>
    </div>
  );
}
