export default function LoadingSpinner() {
  return (
    <section className="w-full rounded-2xl border border-teal-300/15 bg-[#070b1d]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,.32)] sm:p-7" role="status" aria-live="polite">
      <div className="flex items-start gap-4">
        <span className="relative mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-300/10">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-200/25 border-t-teal-200" aria-hidden="true" />
          <span className="absolute inset-0 animate-ping rounded-xl border border-teal-300/15" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-white">Analyzing repository</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">Fetching the latest snapshot, measuring source signals, and assembling the report.</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8" aria-label="Analysis is in progress">
            <div className="analysis-progress h-full w-2/5 rounded-full bg-gradient-to-r from-teal-300 via-cyan-300 to-violet-400" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Progress is indeterminate because the API does not stream per-stage updates.</p>
        </div>
      </div>
    </section>
  );
}
