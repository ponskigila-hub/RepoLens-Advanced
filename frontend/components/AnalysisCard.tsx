'use client';

import { useState } from 'react';
import type { AnalysisResult, DynamicScore, ImprovementSuggestion, RepositoryFile, RepositoryFolder } from '@/types/analysis';

type Tab = 'overview' | 'architecture' | 'files' | 'insights';
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◉' },
  { id: 'architecture', label: 'Architecture', icon: '⌘' },
  { id: 'files', label: 'Files', icon: '▤' },
  { id: 'insights', label: 'Insights', icon: '✳' },
];

const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat().format(value) : 'Not measured';
const scoreBand = (value?: number) => value === undefined ? 'Not available' : value >= 80 ? 'Strong signal' : value >= 60 ? 'Developing' : 'Needs attention';
const tone = (value?: number) => value === undefined ? 'text-slate-400' : value >= 80 ? 'text-teal-200' : value >= 60 ? 'text-amber-200' : 'text-rose-300';
const barTone = (value?: number) => value === undefined ? 'from-slate-600 to-slate-500' : value >= 80 ? 'from-teal-300 to-cyan-400' : value >= 60 ? 'from-amber-300 to-orange-300' : 'from-rose-400 to-fuchsia-400';

export default function AnalysisCard({ result }: { result: AnalysisResult }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [fileQuery, setFileQuery] = useState('');
  const [fileCategory, setFileCategory] = useState('all');

  if (!result.success) {
    return <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5 text-sm text-rose-200">{result.error || 'Analysis could not be completed.'}</div>;
  }

  const metrics = result.metrics;
  const fileMetrics = metrics?.files;
  const lineMetrics = metrics?.lines;
  const ast = metrics?.ast;
  const tests = metrics?.tests;
  const dependencies = metrics?.dependencies;
  const artifacts = metrics?.artifacts;
  const repo = result.repository;
  const fullName = repo?.full_name || result.repo_info?.name || 'Repository';
  const quality = result.scores?.quality?.score ?? result.scores?.overall_quality?.score ?? result.ml_scores?.overall_quality;
  const scoreCards: { key: string; label: string; score?: number; note: string }[] = [
    { key: 'maintainability', label: 'Maintainability', score: result.scores?.maintainability?.score ?? result.ml_scores?.maintainability, note: 'Changeability and maintenance signals' },
    { key: 'scalability', label: 'Scalability', score: result.scores?.scalability?.score ?? result.ml_scores?.scalability, note: 'Structure and growth signals' },
    { key: 'architecture', label: 'Architecture', score: result.scores?.architecture?.score ?? result.ml_scores?.architecture, note: 'Organization and modularity signals' },
    { key: 'production_readiness', label: 'Production readiness', score: result.scores?.production_readiness?.score ?? result.ml_scores?.production_readiness, note: 'Delivery and reliability signals' },
  ];
  const langEntries = Object.entries(metrics?.language_breakdown ?? {}).sort((a, b) => b[1] - a[1]);
  const files = result.files ?? [];
  const categories = Array.from(new Set(files.map((file) => file.category).filter(Boolean)));
  const filteredFiles = files.filter((file) => {
    const matchesCategory = fileCategory === 'all' || file.category === fileCategory;
    const matchesQuery = !fileQuery || `${file.path} ${file.language ?? ''}`.toLowerCase().includes(fileQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });
  const folderRows = (result.folder_breakdown ?? []).slice().sort((a, b) => b.lines - a.lines);
  const maxFolderLines = Math.max(...folderRows.map((folder) => folder.lines || 0), 1);
  const summary = result.insights?.summary || result.repository_overview?.purpose || 'The scan completed without returning a repository summary.';
  const llm = result.insights?.llm;
  const qualityEvidence = result.scores?.quality?.components ?? result.scores?.overall_quality?.components ?? [];

  return (
    <section id="analysis-report" className="scroll-mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-[#080c1e]/95 shadow-[0_32px_110px_rgba(0,0,0,.42)]">
      <header className="flex flex-col gap-4 border-b border-white/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-teal-200/75"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Analysis report</div>
          <h2 className="mt-2 truncate text-xl font-semibold text-white sm:text-2xl">{fullName}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {repo?.url && <a href={repo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-teal-300/30 hover:text-white">Open on GitHub <span aria-hidden="true">↗</span></a>}
          <span className="rounded-lg border border-teal-300/15 bg-teal-300/8 px-3 py-2 text-xs font-medium text-teal-100">{result.score_methodology?.version || result.ml_scores?.model_used || 'Static report'}</span>
        </div>
      </header>

      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500 lg:block">Report sections</p>
          <nav aria-label="Report sections" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`inline-flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${activeTab === tab.id ? 'border border-teal-300/20 bg-teal-300/10 font-semibold text-teal-100' : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <span className="w-5 text-center text-base" aria-hidden="true">{tab.icon}</span>{tab.label}
                {tab.id === 'files' && <span className="ml-auto rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{number(result.file_breakdown?.total ?? fileMetrics?.total)}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-5 hidden rounded-2xl border border-white/8 bg-white/[.025] p-4 lg:block">
            <p className="text-xs font-semibold text-slate-300">Scan scope</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Depth-{number(repo?.clone_depth)} snapshot. Source is inspected statically; repository code is not executed.</p>
          </div>
        </aside>

        <div className="min-w-0" role="tabpanel">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(250px,.85fr)_minmax(0,1.4fr)]">
                <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl border border-violet-300/15 bg-gradient-to-br from-[#111332] via-[#10132d] to-[#091724] p-5 sm:p-6">
                  <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
                  <div className="relative">
                    <p className="text-sm font-medium text-slate-300">Repository quality</p>
                    <p className="mt-1 text-xs text-slate-500">Weighted score from measured signals</p>
                  </div>
                  <div className="relative flex items-center justify-center py-3">
                    <ScoreGauge score={quality} />
                  </div>
                  <div className="relative flex items-center justify-between border-t border-white/8 pt-3 text-xs">
                    <span className="text-slate-500">Method</span>
                    <span className="font-mono text-slate-300">{result.score_methodology?.version || result.ml_scores?.model_used || 'Static analysis'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {scoreCards.map((item) => <ScoreTile key={item.key} label={item.label} score={item.score} note={item.note} />)}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
                  <SectionEyebrow>Repository at a glance</SectionEyebrow>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{summary}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MetricTile label="Files scanned" value={number(fileMetrics?.total ?? result.file_breakdown?.total ?? result.repo_info?.file_count)} />
                    <MetricTile label="Source files" value={number(fileMetrics?.source)} />
                    <MetricTile label="Source + test lines" value={number(lineMetrics?.source_and_tests ?? result.repo_info?.total_lines)} />
                    <MetricTile label="Dependencies" value={number(dependencies?.count)} />
                  </div>
                  <div className="mt-5 border-t border-white/8 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Detected languages</p>
                    {langEntries.length ? <div className="flex flex-wrap gap-2">{langEntries.slice(0, 10).map(([language, count]) => <span key={language} className="rounded-lg border border-white/8 bg-white/[.035] px-2.5 py-1.5 text-xs text-slate-300">{language}<span className="ml-2 text-slate-500">{number(count)} files</span></span>)}</div> : <p className="text-sm text-slate-500">No language signals were returned by the scan.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
                  <SectionEyebrow>Engineering signals</SectionEyebrow>
                  <div className="mt-3 divide-y divide-white/6">
                    <SignalRow label="Automated tests" detected={artifacts?.has_tests} detail={tests?.files === undefined ? undefined : `${number(tests.files)} test files`} />
                    <SignalRow label="CI workflow" detected={artifacts?.has_ci} />
                    <SignalRow label="Container setup" detected={artifacts?.has_docker} />
                    <SignalRow label="License" detected={artifacts?.has_license} />
                    <SignalRow label="Coverage report" detected={tests?.coverage_is_measured} detail={tests?.coverage_percent == null ? 'Not measured' : `${tests.coverage_percent}% measured`} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><SectionEyebrow>Why these scores?</SectionEyebrow><p className="mt-1 text-xs text-slate-500">Component evidence behind the quality score</p></div>
                  <span className="text-xs text-slate-500">Weights and observations come from the API</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {qualityEvidence.slice(0, 6).map((component) => <EvidenceRow key={component.name} component={component} />)}
                </div>
                {!qualityEvidence.length && <p className="mt-4 text-sm text-slate-500">No score components were returned.</p>}
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#0c1228] to-[#101126] p-5 sm:p-6">
                <SectionEyebrow>Architecture overview</SectionEyebrow>
                <h3 className="mt-3 text-2xl font-semibold text-white">{result.architecture_analysis?.architecture_type || result.architecture_overview?.pattern || 'Pattern not classified'}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{result.architecture_analysis?.architecture_explanation || result.architecture_overview?.description || 'The API did not return an architecture description.'}</p>
                {result.architecture_analysis?.design_patterns?.length ? <div className="mt-4 flex flex-wrap gap-2">{result.architecture_analysis.design_patterns.map((pattern) => <span key={pattern} className="rounded-lg border border-violet-300/15 bg-violet-300/5 px-2.5 py-1.5 text-xs text-violet-100">{pattern}</span>)}</div> : null}
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
                  <SectionEyebrow>Folder map</SectionEyebrow>
                  <p className="mt-1 text-xs text-slate-500">Directories measured from the repository tree</p>
                  <div className="mt-4 space-y-3">
                    {folderRows.slice(0, 12).map((folder) => <FolderBar key={folder.path} folder={folder} maxLines={maxFolderLines} />)}
                    {!folderRows.length && <EmptyNotice>No folder breakdown was returned for this repository.</EmptyNotice>}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
                  <SectionEyebrow>Code shape</SectionEyebrow>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricTile label="Functions" value={number(ast?.functions)} />
                    <MetricTile label="Classes" value={number(ast?.classes)} />
                    <MetricTile label="Average complexity" value={typeof ast?.average_cyclomatic_complexity === 'number' ? ast.average_cyclomatic_complexity.toFixed(2) : 'Not measured'} />
                    <MetricTile label="Highest complexity" value={number(ast?.maximum_cyclomatic_complexity)} />
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500">{ast?.complexity_method || 'Complexity methodology was not included in the response.'}</p>
                  <div className="mt-5 border-t border-white/8 pt-4"><SectionEyebrow>Dependency manifests</SectionEyebrow><div className="mt-2 flex flex-wrap gap-2">{dependencies?.manifests?.length ? dependencies.manifests.map((item) => <span key={item} className="rounded-md bg-white/5 px-2.5 py-1.5 text-xs text-slate-300">{item}</span>) : <span className="text-sm text-slate-500">No dependency manifest detected</span>}</div></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><SectionEyebrow>Repository files</SectionEyebrow><p className="mt-1 text-xs text-slate-500">Showing the file sample returned by the API. Total inventory: {number(result.file_breakdown?.total ?? fileMetrics?.total)}.</p></div>
                <label className="relative block sm:w-64"><span className="sr-only">Search files</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">⌕</span><input value={fileQuery} onChange={(event) => setFileQuery(event.target.value)} placeholder="Search scanned files" className="w-full rounded-lg border border-white/10 bg-[#070a19] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-300/40" /></label>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {['all', ...categories].map((category) => <button key={category} type="button" onClick={() => setFileCategory(category)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs capitalize transition ${fileCategory === category ? 'bg-teal-300/12 text-teal-100 ring-1 ring-teal-300/20' : 'bg-white/[.035] text-slate-400 hover:text-white'}`}>{category === 'all' ? 'All files' : category}</button>)}
              </div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/8">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead className="bg-white/[.035] text-[11px] uppercase tracking-[.12em] text-slate-500"><tr><th className="px-4 py-3 font-semibold">Path</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Language</th><th className="px-4 py-3 text-right font-semibold">Lines</th></tr></thead>
                  <tbody className="divide-y divide-white/6">{filteredFiles.slice(0, 100).map((file) => <FileRow key={file.path} file={file} />)}</tbody>
                </table>
                {!filteredFiles.length && <div className="p-8 text-center text-sm text-slate-500">No scanned files match this filter.</div>}
              </div>
              {filteredFiles.length > 100 && <p className="mt-3 text-right text-xs text-slate-500">First 100 of {number(filteredFiles.length)} matching files are shown.</p>}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-teal-300/12 bg-gradient-to-br from-teal-300/[.06] via-[#0b1020] to-violet-400/[.06] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><SectionEyebrow>Executive readout</SectionEyebrow><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[.15em] text-slate-400">Evidence-based</span></div>
                <p className="mt-3 text-sm leading-7 text-slate-200">{summary}</p>
                {llm?.text && <div className="mt-4 rounded-xl border border-violet-300/15 bg-violet-300/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-200">Optional AI narrative</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{llm.text}</p></div>}
                <p className="mt-4 text-xs text-slate-500">Optional AI narrative status: {llm?.status || 'Not included in the response'}{llm?.error ? ` — ${llm.error}` : ''}</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <FindingList title="Strengths found" entries={result.insights?.strengths ?? []} variant="good" />
                <FindingList title="Risks to review" entries={result.insights?.risks ?? []} variant="risk" />
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
                <SectionEyebrow>Recommended next steps</SectionEyebrow>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">{(result.insights?.recommendations ?? result.improvement_suggestions ?? []).map((item, index) => <RecommendationCard key={`${item.category}-${index}`} item={item} />)}</div>
                {!(result.insights?.recommendations?.length || result.improvement_suggestions?.length) && <EmptyNotice>No recommendations were returned for this scan.</EmptyNotice>}
              </div>
              {!!result.insights?.scan_warnings?.length && <div className="rounded-2xl border border-amber-300/15 bg-amber-300/5 p-5"><SectionEyebrow>Scan limitations</SectionEyebrow><ul className="mt-3 space-y-2 text-sm text-amber-100/80">{result.insights.scan_warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ScoreGauge({ score }: { score?: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const safeScore = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : undefined;
  const offset = safeScore === undefined ? circumference : circumference * (1 - safeScore / 100);
  return <div className="relative flex h-40 w-40 items-center justify-center">
    <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-label={safeScore === undefined ? 'Quality score unavailable' : `Quality score ${safeScore.toFixed(1)} out of 100`} role="img">
      <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,.08)" strokeWidth="7" fill="none" />
      {safeScore !== undefined && <><defs><linearGradient id="quality-gauge" x1="0" y1="0" x2="120" y2="120"><stop stopColor="#54E6D8"/><stop offset="1" stopColor="#8358F7"/></linearGradient></defs><circle cx="60" cy="60" r={radius} stroke="url(#quality-gauge)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} fill="none" className="transition-[stroke-dashoffset] duration-700" /></>}
    </svg>
    <div className="absolute text-center"><span className={`block text-4xl font-semibold tracking-tight ${tone(safeScore)}`}>{safeScore === undefined ? '—' : safeScore.toFixed(1)}</span><span className="mt-1 block text-[10px] uppercase tracking-[.18em] text-slate-500">out of 100</span></div>
  </div>;
}

function ScoreTile({ label, score, note }: { label: string; score?: number; note: string }) {
  const bounded = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : undefined;
  return <div className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-white/8 bg-white/[.025] p-4 transition hover:border-teal-300/20 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-medium text-slate-200">{label}</h3><p className="mt-1 text-[11px] leading-4 text-slate-500">{note}</p></div><span className={`font-mono text-xl font-semibold ${tone(bounded)}`}>{bounded === undefined ? '—' : bounded.toFixed(1)}</span></div>
    <div><div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full bg-gradient-to-r ${barTone(bounded)}`} style={{ width: bounded === undefined ? '0%' : `${bounded}%` }} /></div><p className="mt-2 text-[10px] uppercase tracking-[.12em] text-slate-500">{scoreBand(bounded)}</p></div>
  </div>;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) { return <h3 className="text-[11px] font-bold uppercase tracking-[.18em] text-slate-400">{children}</h3>; }
function MetricTile({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/7 bg-[#080b19]/70 p-3"><p className="text-[10px] uppercase tracking-[.1em] text-slate-500">{label}</p><p className="mt-1.5 break-words text-lg font-semibold text-white">{value}</p></div>; }

function SignalRow({ label, detected, detail }: { label: string; detected?: boolean; detail?: string }) {
  const status = detected === undefined ? 'Not measured' : detected ? 'Detected' : 'Not detected';
  return <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm text-slate-300">{label}</p>{detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${detected ? 'bg-teal-300/10 text-teal-100' : 'bg-white/[.04] text-slate-500'}`}>{status}</span></div>;
}

function EvidenceRow({ component }: { component: DynamicScore['components'][number] }) {
  const bounded = Math.max(0, Math.min(100, component.score));
  return <div className="rounded-xl border border-white/7 bg-[#080b19]/65 p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-200">{component.name}</p><span className={`font-mono text-xs ${tone(bounded)}`}>{bounded.toFixed(1)}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full bg-gradient-to-r ${barTone(bounded)}`} style={{ width: `${bounded}%` }} /></div><div className="mt-2 flex items-start justify-between gap-3"><p className="text-[11px] leading-5 text-slate-500">{component.evidence}</p><span className="shrink-0 font-mono text-[10px] text-slate-600">{(component.weight * 100).toFixed(0)}% wt.</span></div></div>;
}

function FolderBar({ folder, maxLines }: { folder: RepositoryFolder; maxLines: number }) {
  const width = Math.max(folder.lines ? 3 : 0, Math.round(((folder.lines || 0) / maxLines) * 100));
  return <div className="rounded-xl border border-white/7 bg-[#080b19]/65 p-3"><div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate font-mono text-xs text-slate-200">{folder.path}</p><span className="shrink-0 text-[10px] text-slate-500">{number(folder.source_files)} src · {number(folder.lines)} lines</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-teal-300/80 to-violet-400/80" style={{ width: `${width}%` }} /></div></div>;
}

function FileRow({ file }: { file: RepositoryFile }) {
  return <tr className="bg-transparent transition hover:bg-white/[.025]"><td className="max-w-[300px] px-4 py-3 font-mono text-xs text-slate-200"><span className="block truncate" title={file.path}>{file.path}</span></td><td className="px-4 py-3"><span className="rounded-md bg-white/[.05] px-2 py-1 text-[10px] capitalize text-slate-400">{file.category || 'other'}</span></td><td className="px-4 py-3 text-xs text-slate-400">{file.language || file.extension || '—'}</td><td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{number(file.lines)}</td></tr>;
}

function FindingList({ title, entries, variant }: { title: string; entries: string[]; variant: 'good' | 'risk' }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 sm:p-6"><SectionEyebrow>{title}</SectionEyebrow><div className="mt-4 space-y-3">{entries.map((entry, index) => <div key={`${index}-${entry}`} className={`flex gap-3 rounded-xl border p-3.5 text-sm leading-6 ${variant === 'good' ? 'border-teal-300/10 bg-teal-300/[.035] text-slate-300' : 'border-amber-300/10 bg-amber-300/[.035] text-slate-300'}`}><span className={`mt-0.5 shrink-0 ${variant === 'good' ? 'text-teal-200' : 'text-amber-200'}`}>{variant === 'good' ? '✓' : '!'}</span><span>{entry}</span></div>)}{!entries.length && <EmptyNotice>No {variant === 'good' ? 'strengths' : 'risks'} were returned for this scan.</EmptyNotice>}</div></div>;
}

function RecommendationCard({ item }: { item: ImprovementSuggestion }) {
  const priority = item.priority?.toLowerCase() || 'unspecified';
  const priorityTone = priority === 'high' ? 'text-rose-200 bg-rose-300/10' : priority === 'medium' ? 'text-amber-100 bg-amber-300/10' : 'text-slate-300 bg-white/[.06]';
  return <article className="rounded-xl border border-white/8 bg-[#080b19]/65 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-teal-100">{item.category}</p><span className={`rounded-md px-2 py-1 text-[9px] uppercase tracking-[.14em] ${priorityTone}`}>{priority} priority</span></div><p className="mt-2 text-sm leading-6 text-slate-200">{item.suggestion}</p><p className="mt-2 text-xs leading-5 text-slate-500">{item.impact}</p></article>;
}
function EmptyNotice({ children }: { children: React.ReactNode }) { return <p className="rounded-xl border border-dashed border-white/10 bg-white/[.02] px-4 py-5 text-sm text-slate-500">{children}</p>; }
