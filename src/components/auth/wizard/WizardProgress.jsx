/**
 * Wizard progress.
 *
 * The previous version rendered one numbered circle per step with the labels
 * hidden below `sm`. On a phone — where almost every Wizer registers — that was
 * seven unlabelled circles with no indication of what any of them meant. The
 * narrow layout now states position and name in words; the circles appear only
 * where there is room to label them.
 *
 * Completed steps are tappable, so correcting something does not mean pressing
 * Back four times. Future steps are not: they may depend on fields not yet
 * filled, and skipping ahead would bypass step validation.
 */
export default function WizardProgress({ steps, currentStep, onStepSelect }) {
  const total = steps.length;
  const current = steps[currentStep];
  const pct = Math.round(((currentStep + 1) / total) * 100);
  const canGo = (i) => i < currentStep && typeof onStepSelect === "function";

  return (
    <div className="w-full px-4 py-4">
      {/* ── Narrow: words, not seven anonymous dots ── */}
      <div className="sm:hidden">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
            {current?.label}
          </p>
          <p className="shrink-0 text-xs font-medium text-gray-400">
            Step {currentStep + 1} of {total}
          </p>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Step ${currentStep + 1} of ${total}: ${current?.label || ""}`}
        >
          <div
            className="h-full rounded-full bg-townwize-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {currentStep > 0 && (
          <button
            type="button"
            onClick={() => onStepSelect?.(currentStep - 1)}
            className="mt-1.5 text-[11px] font-medium text-gray-400 underline-offset-2 hover:text-townwize-primary hover:underline"
          >
            ← Back to {steps[currentStep - 1]?.label}
          </button>
        )}
      </div>

      {/* ── Wide: full stepper, where labels actually fit ── */}
      <div className="mx-auto hidden max-w-xl items-center justify-between sm:flex">
        {steps.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const clickable = canGo(i);
          return (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStepSelect(i)}
                  title={clickable ? `Back to ${s.label}` : undefined}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors
                    ${done
                      ? "border-townwize-primary bg-townwize-primary text-white"
                      : active
                        ? "border-townwize-primary bg-white text-townwize-primary dark:bg-gray-800"
                        : "border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-700"
                    }
                    ${clickable
                      ? "cursor-pointer hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-townwize-accent"
                      : "cursor-default"}`}
                >
                  {done ? "✓" : i + 1}
                </button>
                <span
                  className={`text-center text-[10px] font-medium leading-tight
                    ${active ? "text-townwize-primary" : done ? "text-gray-500" : "text-gray-400"}`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 ${
                    i < currentStep ? "bg-townwize-primary" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
