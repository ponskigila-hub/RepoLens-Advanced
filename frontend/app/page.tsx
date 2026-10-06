'use client';

import { useEffect, useRef, useState } from 'react';
import AnalysisCard from '@/components/AnalysisCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import RepoInput from '@/components/RepoInput';
import RepoLensMark from '@/components/RepoLensMark';
import ThemeToggle from '@/components/ThemeToggle';
import { apiService } from '@/services/api';
import type { AnalysisResult } from '@/types/analysis';

const scanAreas = [
  { number: '01', title: 'Repository identity', detail: 'Owner, creation date, and visible contributors from GitHub.' },
  { number: '02', title: 'Code map', detail: 'Folders, entry-point candidates, and function/class names.' },
  { number: '03', title: 'Stack & engineering signals', detail: 'Languages, declared packages, tests, CI, and readiness files.' },
];

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && reportRef.current) reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  useEffect(() => {
    let active = true;
    apiService.healthCheck().then(() => {
      if (active) setApiStatus('online');
    }).catch(() => {
      if (active) setApiStatus('offline');
    });
    return () => { active = false; };
  }, []);

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
    <main className="app-backdrop min-h-screen text-[#203229] selection:bg-[#47734f]/25 selection:text-[#203229]">
      <header className="print-hide mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#top" className="inline-flex items-center gap-3" aria-label="RepoLens home">
          <RepoLensMark className="h-10 w-10" />
          <span className="text-lg font-semibold tracking-tight">RepoLens</span>
          <span className="hidden border-l border-[#d6d8cc] pl-3 text-xs text-[#59665d] sm:inline">Repository explorer</span>
        </a>
        <div className="flex items-center gap-3">
          <a href="#how-it-works" className="hidden text-sm font-medium text-[#45594c] transition hover:text-[#203229] sm:inline">How it works</a>
          <ThemeToggle />
        </div>
      </header>

      <section id="top" className="print-hide mx-auto grid max-w-[1440px] gap-8 px-5 pb-12 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.8fr)] lg:gap-14 lg:px-12 lg:pb-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#315d42]">Public GitHub repository analysis</p>
          <h1 className="mt-4 max-w-3xl text-[2.15rem] font-semibold leading-[1.12] tracking-[-.04em] text-[#203229] sm:text-[2.75rem] lg:text-[3.35rem]">
            Read the codebase, <span className="headline-gradient">not only its README.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#45594c] sm:text-lg sm:leading-8">
            See what the repository documents, how its files and functions are organized, which tools it declares, and who maintains it. Documentation and code evidence are shown separately so gaps stay visible.
          </p>

          <div id="analyze" className="surface-paper-gradient mt-8 scroll-mt-6 rounded-[22px] border border-[#d9ddd2] bg-[#fffefa] p-4 shadow-[0_18px_55px_rgba(32,50,41,.09)] sm:p-5">
            <div className="mb-4 flex items-start gap-3 px-1">
              <div className="rounded-lg bg-[#edf3e9] p-2 text-[#315d42]"><GitHubGlyph /></div>
              <div><h2 className="text-sm font-semibold text-[#203229]">Analyze a public repository</h2><p className="mt-1 text-xs leading-5 text-[#59665d]">RepoLens reads a bounded snapshot. It never runs the repository code.</p></div>
            </div>
            <RepoInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
          </div>

          {apiStatus === 'offline' && <div role="status" className="mt-3 rounded-xl border border-[#dfd1ad] bg-[#fbf5e8] p-4 text-xs leading-5 text-[#604515]">
            <strong className="block font-semibold">Analysis service is not connected</strong>
            <span className="mt-1 block">Configure <code className="rounded bg-black/10 px-1 py-0.5">REPOLENS_API_URL</code> on the Next.js server, or start FastAPI locally on port 8000.</span>
          </div>}
          {error && <div role="alert" className="mt-4 rounded-xl border border-[#e8c9bd] bg-[#f8ece7] p-4 text-sm text-[#833a32]"><div className="font-semibold">Analysis did not complete</div><p className="mt-1 leading-6">{error}</p></div>}
        </div>

        <div className="space-y-4 lg:mt-6">
          <aside className="surface-paper-gradient h-fit rounded-[22px] border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6">
            <div className="flex items-center gap-3"><RepoLensMark className="h-8 w-8" /><div><h2 className="text-sm font-semibold text-[#203229]">What the report reads</h2><p className="mt-1 text-xs text-[#59665d]">Observed evidence, not generated sample scores.</p></div></div>
            <div className="mt-5 divide-y divide-[#e3e1d7]">
              {scanAreas.map((area) => <div key={area.number} className="flex gap-3 py-4 first:pt-0 last:pb-0"><span className="pt-0.5 font-mono text-[10px] font-semibold text-[#315d42]">{area.number}</span><div><h3 className="text-sm font-semibold text-[#304239]">{area.title}</h3><p className="mt-1 text-xs leading-5 text-[#59665d]">{area.detail}</p></div></div>)}
            </div>
            <a href="#how-it-works" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#315d42] underline decoration-[#a9bea4] underline-offset-4">How RepoLens produces a report <span aria-hidden="true">↓</span></a>
          </aside>
          {isAnalyzing && <div className="surface-paper-gradient rounded-2xl border border-[#d9ddd2] bg-[#fffefa] p-5 shadow-sm"><LoadingSpinner /></div>}
        </div>
      </section>

      <section id="how-it-works" className="print-hide mx-auto max-w-[1440px] scroll-mt-8 px-5 pb-12 sm:px-8 lg:px-12">
        <div className="surface-paper-gradient grid gap-4 rounded-2xl border border-[#d9ddd2] bg-[#fffefa] p-5 sm:grid-cols-3 sm:p-6">
          <MethodStep number="1" title="Fetch a snapshot" text="A shallow clone and read-only GitHub metadata request; failures in metadata do not stop code analysis." />
          <MethodStep number="2" title="Map code and declarations" text="Inventory paths, identify supported function/class names, parse manifests, and compare literal framework mentions in the README." />
          <MethodStep number="3" title="Explain the evidence" text="Calculate static scorecards and label unavailable measurements. No code execution, test run, or runtime profiling." />
        </div>
      </section>

      {result && <div ref={reportRef} className="relative z-10 mx-auto max-w-[1440px] scroll-mt-6 px-4 pb-16 sm:px-8 lg:px-12"><AnalysisCard result={result} /></div>}

      <footer className="print-hide border-t border-[#e3e1d7] bg-[#f7f5ee]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-5 text-xs text-[#59665d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><span className="inline-flex items-center gap-2"><RepoLensMark className="h-5 w-5" /><strong className="font-semibold text-[#45594c]">RepoLens</strong><span>· Static repository analysis</span></span><span>Scores are heuristics based on scanned evidence, not a security or runtime audit.</span></div>
      </footer>
    </main>
  );
}

function MethodStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#edf3e9] font-mono text-xs font-semibold text-[#315d42]">{number}</span><div><h3 className="text-sm font-semibold text-[#203229]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#59665d]">{text}</p></div></article>;
}

function GitHubGlyph() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 19c-4.6 1.4-4.6-2.5-6.5-3m13 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.1-.4-3.7 1.4a13 13 0 0 0-6.7 0C7.3 1.2 6.2 1.6 6.2 1.6a4.8 4.8 0 0 0-.1 3.6 5.2 5.2 0 0 0-1.4 3.6c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
