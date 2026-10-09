'use client';

import type { AnalysisProgress } from '@/types/analysis';

const steps = [
  { id: 'fetch', label: 'Fetch depth-1 snapshot' },
  { id: 'inventory', label: 'Inventory files & manifests' },
  { id: 'metrics', label: 'Measure AST & static signals' },
  { id: 'report', label: 'Assemble findings & report' },
] as const;

const cards = [
  { label: 'Repository snapshot', completeAfter: 1 },
  { label: 'File map and stack', completeAfter: 2 },
  { label: 'Score evidence', completeAfter: 3 },
];

export default function LoadingSpinner({ events = [] }: { events?: AnalysisProgress[] }) {
  const current = events[events.length - 1];
  const completed = current?.completed_steps ?? 0;
  const activeStep = current?.stage === 'complete' ? steps.length : Math.min(completed, steps.length - 1);
  const latest = current?.message ?? 'Connecting to the analysis service and waiting for the first backend milestone.';

  return (
    <section className="w-full rounded-2xl border border-[#ceddce] bg-[#fffefa] p-5 shadow-[0_18px_55px_rgba(32,50,41,.10)] sm:p-6" aria-labelledby="scan-progress-title" aria-live="polite">
      <div className="flex items-start gap-4">
        <span className="relative mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c5d8c5] bg-[#edf3e9]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#c5d8c5] border-t-[#47734f]" aria-hidden="true" />
          <span className="absolute inset-0 animate-ping rounded-xl border border-[#ceddce]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="scan-progress-title" className="font-semibold text-[#203229]">Analyzing repository</h2>
          <p className="mt-1 text-sm leading-6 text-[#59665d]">{latest}</p>
          <div className="mt-4 grid grid-cols-4 gap-1.5" aria-label={`${completed} of ${steps.length} analysis stages completed`}>
            {steps.map((step, index) => <span key={step.id} className={`h-1.5 rounded-full transition-colors duration-300 ${index < completed ? 'bg-[#47734f]' : index === activeStep && current?.stage !== 'complete' ? 'analysis-progress bg-gradient-to-r from-[#47734f] to-[#bd7452]' : 'bg-[#e7e6dc]'}`} />)}
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Analysis stages">
            {steps.map((step, index) => {
              const done = index < completed || current?.stage === 'complete';
              const active = index === activeStep && current?.stage !== 'complete';
              return <li key={step.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] transition-colors ${done ? 'border-[#b8d0b9] bg-[#eff6eb] text-[#245338]' : active ? 'border-[#d8c58c] bg-[#fff5d8] text-[#62440d]' : 'border-[#e3e1d7] bg-[#faf9f4] text-[#66746b]'}`}>
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold" aria-hidden="true">{done ? '✓' : active ? '·' : index + 1}</span>
                {step.label}
              </li>;
            })}
          </ol>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3" aria-label="Report sections being prepared">
        {cards.map((card, index) => {
          const ready = completed >= card.completeAfter || current?.stage === 'complete';
          return <div key={card.label} className={`rounded-xl border p-3 ${ready ? 'border-[#b8d0b9] bg-[#eff6eb]' : 'border-[#e3e1d7] bg-[#faf9f4]'}`}>
            <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold text-[#304239]">{card.label}</p><span className="text-[9px] text-[#59665d]">{ready ? 'Measured' : 'Pending'}</span></div>
            <div className="mt-2 space-y-1.5" aria-hidden="true">
              <span className={`block h-2 w-4/5 rounded ${ready ? 'bg-[#c7dec7]' : 'skeleton-line'}`} />
              <span className={`block h-2 w-3/5 rounded ${ready ? 'bg-[#d5e5d3]' : 'skeleton-line skeleton-line--delay'}`} />
              {index === 2 && <span className={`block h-2 w-2/5 rounded ${ready ? 'bg-[#e4eddc]' : 'skeleton-line skeleton-line--delay-more'}`} />}
            </div>
          </div>;
        })}
      </div>
      <p className="mt-3 text-[10px] leading-4 text-[#59665d]">Stage updates come from the analysis API; the report payload is delivered together when the scan finishes.</p>
      {events.length > 0 && <details className="mt-3 rounded-lg border border-[#e3e1d7] bg-[#faf9f4] px-3 py-2">
        <summary className="cursor-pointer text-[10px] font-semibold text-[#45594c]">Live scan log ({events.length} events)</summary>
        <ol className="mt-2 space-y-1.5">{events.map((event, index) => <li key={`${event.stage}-${index}`} className="flex gap-2 text-[10px] leading-4 text-[#59665d]"><span className="shrink-0 font-mono text-[#315d42]">{String(index + 1).padStart(2, '0')}</span><span>{event.message}</span></li>)}</ol>
      </details>}
    </section>
  );
}
