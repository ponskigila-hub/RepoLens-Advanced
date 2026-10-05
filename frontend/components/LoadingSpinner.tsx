export default function LoadingSpinner() {
  return (
    <section className="w-full rounded-2xl border border-[#ceddce] bg-[#fffefa] p-5 shadow-[0_18px_55px_rgba(32,50,41,.10)] sm:p-7" role="status" aria-live="polite">
      <div className="flex items-start gap-4">
        <span className="relative mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c5d8c5] bg-[#edf3e9]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#c5d8c5] border-t-[#47734f]" aria-hidden="true" />
          <span className="absolute inset-0 animate-ping rounded-xl border border-[#ceddce]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#203229]">Analyzing repository</h2>
          <p className="mt-1 text-sm leading-6 text-[#66746b]">Fetching the latest snapshot, measuring source signals, and assembling the report.</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eeece3]" aria-label="Analysis is in progress">
            <div className="analysis-progress h-full w-2/5 rounded-full bg-gradient-to-r from-[#47734f] via-[#78936b] to-[#bd7452]" />
          </div>
          <p className="mt-3 text-xs text-[#7c877d]">Progress is indeterminate because the API does not stream per-stage updates.</p>
        </div>
      </div>
    </section>
  );
}
