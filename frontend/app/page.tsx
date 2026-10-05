'use client';

import { useEffect, useRef, useState } from 'react';
import AnalysisCard from '@/components/AnalysisCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import RepoInput from '@/components/RepoInput';
import RepoLensMark from '@/components/RepoLensMark';
import { apiService } from '@/services/api';
import type { AnalysisResult } from '@/types/analysis';

const capabilities = [
  { symbol: '⌕', label: 'Source signals', detail: 'AST and complexity' },
  { symbol: '▤', label: 'Tests & coverage', detail: 'Measured when reported' },
  { symbol: '⌘', label: 'Architecture', detail: 'Folders and dependencies' },
  { symbol: '↗', label: 'Ship readiness', detail: 'CI and deployment files' },
];

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && reportRef.current) reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  const handleAnalyze = async (url: string, includeLlm: boolean) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiService.analyzeRepository(url, !includeLlm);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The repository could not be analyzed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#050716] text-slate-100 selection:bg-teal-300/25 selection:text-white">
      <div className="site-glow site-glow-teal" aria-hidden="true" />
      <div className="site-glow site-glow-violet" aria-hidden="true" />
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#top" className="group inline-flex items-center gap-3" aria-label="RepoLens home">
          <RepoLensMark className="h-11 w-11 transition-transform duration-300 group-hover:rotate-[-8deg]" />
          <span className="text-lg font-semibold tracking-tight text-white">RepoLens <span className="bg-gradient-to-r from-teal-200 to-violet-300 bg-clip-text text-transparent">AI</span></span>
        </a>
        <div className="flex items-center gap-3">
          <a href="#how-it-works" className="hidden text-sm text-slate-400 transition hover:text-white sm:inline">How it works</a>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[11px] font-medium text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Static scan · optional AI</span>
        </div>
      </header>

      <section id="top" className="relative z-10 mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-16 pt-7 sm:px-8 sm:pt-12 lg:grid-cols-[.95fr_1.05fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/15 bg-teal-300/[.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-teal-100/90">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Understand. Analyze. Score. Ship.
          </div>
          <h1 className="mt-6 text-[2.8rem] font-semibold leading-[1.05] tracking-[-.055em] text-white sm:text-6xl lg:text-[4.35rem]">
            Make any repository <span className="bg-gradient-to-r from-teal-200 via-cyan-300 to-violet-400 bg-clip-text text-transparent">make sense.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">Get a grounded first read of an unfamiliar codebase—what it contains, how it is organized, and which engineering signals deserve a closer look.</p>

          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-2">
            {capabilities.map((capability) => <div key={capability.label} className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] text-lg text-cyan-200">{capability.symbol}</span><span><span className="block text-sm font-medium text-slate-200">{capability.label}</span><span className="mt-0.5 block text-[11px] text-slate-500">{capability.detail}</span></span></div>)}
          </div>

          <div id="analyze" className="mt-9 scroll-mt-6 rounded-[22px] border border-white/10 bg-[#090d20]/90 p-4 shadow-[0_25px_90px_rgba(0,0,0,.36)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-start gap-3 px-1"><div className="mt-0.5 rounded-lg bg-violet-300/10 p-2 text-violet-200"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1M15.5 8.5l-7 7m-.5-3.5a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div><h2 className="text-sm font-semibold text-white">Start with a GitHub URL</h2><p className="mt-1 text-xs leading-5 text-slate-500">Scores come from repository evidence. AI-written context is optional.</p></div></div>
            <RepoInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
          </div>
          {error && <div role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[.06] p-4 text-sm text-rose-100"><div className="font-semibold">Analysis did not complete</div><p className="mt-1 leading-6 text-rose-100/75">{error}</p></div>}
        </div>

        <div className="relative mx-auto w-full max-w-[680px] lg:ml-auto">
          <div className="absolute -inset-4 rounded-[34px] bg-gradient-to-br from-cyan-400/10 via-blue-500/5 to-violet-500/10 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[26px] border border-indigo-300/15 bg-[#070a1a]/95 p-3 shadow-[0_36px_100px_rgba(0,0,0,.52)] sm:p-4">
            <div className="flex items-center justify-between border-b border-white/8 px-2 pb-3">
              <div className="flex items-center gap-2"><RepoLensMark className="h-7 w-7"/><span className="text-xs font-semibold text-slate-200">Analysis workspace</span></div>
              <span className="rounded-full border border-white/8 px-2 py-1 text-[9px] uppercase tracking-[.14em] text-slate-500">Live report</span>
            </div>
            <div className="min-h-[390px] p-2 sm:min-h-[445px] sm:p-4">
              {isAnalyzing ? <div className="flex min-h-[360px] items-center"><LoadingSpinner /></div> : result ? <LiveReportPreview result={result} /> : <EmptyReportPreview />}
            </div>
            <div className="grid grid-cols-3 border-t border-white/8 px-1 pt-3">
              {[['01', 'Inventory'], ['02', 'Measure'], ['03', 'Explain']].map(([step, label]) => <div key={step} className="flex items-center gap-2 px-2 py-1"><span className="font-mono text-[9px] text-teal-200/65">{step}</span><span className="text-[10px] text-slate-500">{label}</span></div>)}
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-6 left-8 right-8 h-10 rounded-full bg-cyan-400/10 blur-2xl" aria-hidden="true" />
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-4 sm:grid-cols-3 sm:p-5">
          <ProcessCard icon="↘" title="Paste a public URL" description="A depth-one snapshot keeps the scan focused and quick." />
          <ProcessCard icon="⌘" title="Read the evidence" description="AST, file structure, dependencies, tests, CI, and delivery signals." />
          <ProcessCard icon="↗" title="Decide what to inspect" description="Clear score evidence and practical next steps for a first-time reader." />
        </div>
      </section>

      {result && <div ref={reportRef} className="relative z-10 mx-auto max-w-[1440px] scroll-mt-6 px-4 pb-16 sm:px-8 lg:px-12"><AnalysisCard result={result} /></div>}

      <footer className="relative z-10 border-t border-white/6 bg-[#040611]/55">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><div className="flex items-center gap-2"><RepoLensMark className="h-6 w-6"/><span className="font-medium text-slate-400">RepoLens AI</span><span>· Evidence-first repository intelligence</span></div><span>Static analysis is a starting point, not a runtime or security audit.</span></div>
      </footer>
    </main>
  );
}

function EmptyReportPreview() {
  return <div className="flex min-h-[360px] flex-col justify-between rounded-2xl border border-white/7 bg-[radial-gradient(ellipse_at_top,rgba(77,85,177,.13),transparent_58%)] p-4 sm:p-5">
    <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Repository report</p><p className="mt-1 text-sm font-medium text-slate-300">Waiting for a repository</p></div><span className="rounded-md border border-white/8 px-2 py-1 text-[9px] text-slate-500">No data yet</span></div>
    <div className="relative flex flex-1 flex-col items-center justify-center py-6 text-center">
      <div className="absolute inset-x-4 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" aria-hidden="true" />
      <div className="absolute left-[15%] top-[35%] h-2 w-2 rounded-full bg-teal-300/80 shadow-[0_0_16px_rgba(94,234,212,.65)]" aria-hidden="true" />
      <div className="absolute right-[17%] top-[43%] h-1.5 w-1.5 rounded-full bg-violet-300/80 shadow-[0_0_14px_rgba(167,139,250,.65)]" aria-hidden="true" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-300/15 bg-teal-300/[.05] shadow-[0_0_50px_rgba(45,212,191,.08)]"><RepoLensMark className="h-12 w-12" /></div>
      <h3 className="mt-5 text-lg font-semibold text-white">Your repo, made readable</h3>
      <p className="mt-2 max-w-xs text-xs leading-6 text-slate-500">The report will appear here after you submit a repository URL. No sample scores are shown.</p>
    </div>
    <div className="grid grid-cols-3 gap-2">{[['Files', 'Inventory'], ['AST', 'Code shape'], ['CI', 'Delivery']].map(([tag, label]) => <div key={tag} className="rounded-xl border border-white/7 bg-black/15 px-2 py-2.5 text-center"><span className="block font-mono text-[10px] text-teal-100/80">{tag}</span><span className="mt-1 block text-[9px] text-slate-600">{label}</span></div>)}</div>
  </div>;
}

function LiveReportPreview({ result }: { result: AnalysisResult }) {
  const quality = result.scores?.quality?.score ?? result.scores?.overall_quality?.score ?? result.ml_scores?.overall_quality;
  const repoName = result.repository?.full_name ?? result.repo_info?.name ?? 'Repository analyzed';
  const files = result.metrics?.files?.total ?? result.file_breakdown?.total ?? result.repo_info?.file_count;
  const languages = Object.keys(result.metrics?.language_breakdown ?? {}).slice(0, 5);
  return <div className="flex min-h-[360px] flex-col rounded-2xl border border-teal-300/10 bg-[radial-gradient(ellipse_at_top,rgba(38,186,195,.08),transparent_58%)] p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Repository analyzed</p><p className="mt-1 truncate text-sm font-semibold text-white">{repoName}</p></div><span className="rounded-full border border-teal-300/15 bg-teal-300/[.07] px-2 py-1 text-[9px] text-teal-100">Complete</span></div>
    <div className="my-5 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-white/7 bg-black/15 p-4"><div><p className="text-xs text-slate-500">Quality score</p><p className="mt-1 text-4xl font-semibold tracking-tight text-white">{typeof quality === 'number' ? quality.toFixed(1) : '—'}<span className="ml-1 text-xs font-normal text-slate-500">/100</span></p><p className="mt-2 text-[10px] text-teal-200/75">{result.score_methodology?.version || result.ml_scores?.model_used || 'Evidence-based report'}</p></div><MiniGauge score={quality} /></div>
    <div className="grid grid-cols-2 gap-2"><PreviewStat label="Files scanned" value={files} /><PreviewStat label="Source + test lines" value={result.metrics?.lines?.source_and_tests ?? result.repo_info?.total_lines} /></div>
    <div className="mt-auto pt-5"><p className="text-[10px] uppercase tracking-[.15em] text-slate-500">Detected languages</p><div className="mt-2 flex flex-wrap gap-1.5">{languages.length ? languages.map((language) => <span key={language} className="rounded-md border border-white/8 px-2 py-1 text-[10px] text-slate-300">{language}</span>) : <span className="text-xs text-slate-600">No language signals</span>}</div></div>
  </div>;
}

function MiniGauge({ score }: { score?: number }) {
  const bounded = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : undefined;
  return <div className="relative h-16 w-16 rounded-full p-[5px]" style={{ background: bounded === undefined ? 'conic-gradient(rgba(255,255,255,.08) 0deg, rgba(255,255,255,.08) 360deg)' : `conic-gradient(#5eead4 ${bounded * 3.6}deg, rgba(255,255,255,.08) 0deg)` }}><div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b1021] text-xs font-semibold text-teal-100">{bounded === undefined ? '—' : `${Math.round(bounded)}`}</div></div>;
}
function PreviewStat({ label, value }: { label: string; value?: number }) { return <div className="rounded-xl border border-white/7 bg-black/15 px-3 py-2.5"><p className="text-[9px] uppercase tracking-[.1em] text-slate-600">{label}</p><p className="mt-1 text-sm font-medium text-slate-200">{typeof value === 'number' ? new Intl.NumberFormat().format(value) : 'Not measured'}</p></div>; }
function ProcessCard({ icon, title, description }: { icon: string; title: string; description: string }) { return <div className="flex items-start gap-3 rounded-xl px-2 py-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-300/15 bg-violet-300/[.05] text-violet-200">{icon}</span><div><h3 className="text-xs font-semibold text-slate-200">{title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{description}</p></div></div>; }
