/**
 * Loading indicator: the Townwize mark held still, with an accent arc orbiting it.
 *
 * The mark is itself a circle, so the arc sits concentric with it rather than
 * fighting it. The logo does NOT spin — a rotating logo reads as broken, and a
 * still mark also keeps the brand legible for the whole wait, which is the only
 * reason to put it here instead of a generic ring.
 *
 * Uses the standalone icon mark, not the `logo-*.png` wordmark — a 711x213
 * lockup cannot sit inside a ring. The 196px source is the largest square mark
 * available, which keeps it sharp on a 3x display where an 88px spinner renders
 * the mark at roughly 137 device pixels.
 *
 * Two files rather than one: `favicon-196x196-light.png` is the dark-teal mark
 * for light surfaces, `favicon-196x196-dark.png` the white one for dark
 * surfaces. (Note this is the inverse of the `logo-*.png` naming — the favicon
 * set is named after the theme it belongs to, not the background it sits on.)
 */
export default function BrandSpinner({ size = 88, label, className = "" }) {
  const stroke = Math.max(2, Math.round(size * 0.05));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const markSize = Math.round(size * 0.52);

  return (
    <div className={`flex flex-col items-center ${className}`} role="status" aria-live="polite">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 animate-spin motion-reduce:animate-none"
          style={{ animationDuration: "1.1s" }}
          aria-hidden="true"
        >
          {/* Full track, so the arc reads as travelling along a path rather
              than as a fragment floating in space. */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={stroke} stroke="currentColor"
            className="text-gray-200 dark:text-white/10"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={stroke} stroke="currentColor"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.26} ${circumference}`}
            className="text-townwize-accent"
          />
        </svg>

        <img
          src="/favicon-196x196-light.png" alt="" aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 dark:hidden"
          style={{ width: markSize, height: markSize }}
        />
        <img
          src="/favicon-196x196-dark.png" alt="" aria-hidden="true"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 dark:block"
          style={{ width: markSize, height: markSize }}
        />
      </div>

      {label && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{label}</p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
}
