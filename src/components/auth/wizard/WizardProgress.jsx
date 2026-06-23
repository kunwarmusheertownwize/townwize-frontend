export default function WizardProgress({ steps, currentStep }) {
  return (
    <div className="w-full px-4 py-4">
      <div className="flex items-center justify-between max-w-xl mx-auto">
        {steps.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={s.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                    ${done
                      ? "bg-townwize-primary border-townwize-primary text-white"
                      : active
                      ? "bg-white dark:bg-gray-800 border-townwize-primary text-townwize-primary"
                      : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400"
                    }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium leading-tight text-center hidden sm:block
                    ${active ? "text-townwize-primary" : done ? "text-gray-500" : "text-gray-400"}`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? "bg-townwize-primary" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
