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
const tone = (value?: number) => value === undefined ? 'text-[#66746b]' : value >= 80 ? 'text-[#47734f]' : value >= 60 ? 'text-[#946d35]' : 'text-[#a55a4e]';
const barTone = (value?: number) => value === undefined ? 'from-[#a7ada0] to-[#c2c4b9]' : value >= 80 ? 'from-[#47734f] to-[#315d42]' : value >= 60 ? 'from-[#c49a4b] to-[#bd8450]' : 'from-[#bd7452] to-[#a95843]';

export default function AnalysisCard({ result }: { result: AnalysisResult }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [fileQuery, setFileQuery] = useState('');
  const [fileCategory, setFileCategory] = useState('all');

  if (!result.success) {
    return <div role="alert" className="rounded-2xl border border-[#e8c9bd] bg-[#f8ece7] p-5 text-sm text-[#9f5146]">{result.error || 'Analysis could not be completed.'}</div>;
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
    <section id="analysis-report" className="scroll-mt-8 overflow-hidden rounded-[28px] border border-[#e1e2d9] bg-[#fffefa] shadow-[0_28px_90px_rgba(32,50,41,.12)]">
      <header className="flex flex-col gap-4 border-b border-[#e5e3da] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#557b59]"><span className="h-1.5 w-1.5 rounded-full bg-[#47734f]" /> Analysis report</div>
          <h2 className="mt-2 truncate text-xl font-semibold text-[#203229] sm:text-2xl">{fullName}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {repo?.url && <a href={repo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#e1e2d9] px-3 py-2 text-sm text-[#45594c] transition hover:border-[#9fbea1] hover:text-[#203229]">Open on GitHub <span aria-hidden="true">↗</span></a>}
          <span className="rounded-lg border border-[#ceddce] bg-[#edf3e9] px-3 py-2 text-xs font-medium text-[#47734f]">{result.score_methodology?.version || result.ml_scores?.model_used || 'Static report'}</span>
        </div>
      </header>

      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#7c877d] lg:block">Report sections</p>
          <nav aria-label="Report sections" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`inline-flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${activeTab === tab.id ? 'border border-[#c5d8c5] bg-[#edf3e9] font-semibold text-[#47734f]' : 'border border-transparent text-[#66746b] hover:bg-[#f5f3eb] hover:text-[#203229]'}`}>
                <span className="w-5 text-center text-base" aria-hidden="true">{tab.icon}</span>{tab.label}
                {tab.id === 'files' && <span className="ml-auto rounded-md bg-[#f5f3eb] px-1.5 py-0.5 text-[10px] text-[#66746b]">{number(result.file_breakdown?.total ?? fileMetrics?.total)}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-5 hidden rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-4 lg:block">
            <p className="text-xs font-semibold text-[#45594c]">Scan scope</p>
            <p className="mt-1 text-xs leading-5 text-[#7c877d]">Depth-{number(repo?.clone_depth)} snapshot. Source is inspected statically; repository code is not executed.</p>
          </div>
        </aside>

        <div className="min-w-0" role="tabpanel">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(250px,.85fr)_minmax(0,1.4fr)]">
                <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl border border-[#ead8c9] bg-gradient-to-br from-[#f6f2e8] via-[#fffefa] to-[#eef3e9] p-5 sm:p-6">
                  <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-[#f7eee7] blur-3xl" />
                  <div className="relative">
                    <p className="text-sm font-medium text-[#45594c]">Repository quality</p>
                    <p className="mt-1 text-xs text-[#7c877d]">Weighted score from measured signals</p>
                  </div>
                  <div className="relative flex items-center justify-center py-3">
                    <ScoreGauge score={quality} />
                  </div>
                  <div className="relative flex items-center justify-between border-t border-[#e5e3da] pt-3 text-xs">
                    <span className="text-[#7c877d]">Method</span>
                    <span className="font-mono text-[#45594c]">{result.score_methodology?.version || result.ml_scores?.model_used || 'Static analysis'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {scoreCards.map((item) => <ScoreTile key={item.key} label={item.label} score={item.score} note={item.note} />)}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
                <div className="rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-5 sm:p-6">
                  <SectionEyebrow>Repository at a glance</SectionEyebrow>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#45594c]">{summary}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MetricTile label="Files scanned" value={number(fileMetrics?.total ?? result.file_breakdown?.total ?? result.repo_info?.file_count)} />
                    <MetricTile label="Source files" value={number(fileMetrics?.source)} />
                    <MetricTile label="Source + test lines" value={number(lineMetrics?.source_and_tests ?? result.repo_info?.total_lines)} />
                    <MetricTile label="Dependencies" value={number(dependencies?.count)} />
                  </div>
                  <div className="mt-5 border-t border-[#e5e3da] pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#7c877d]">Detected languages</p>
                    {langEntries.length ? <div className="flex flex-wrap gap-2">{langEntries.slice(0, 10).map(([language, count]) => <span key={language} className="rounded-lg border border-[#e5e3da] bg-[#f6f5ee] px-2.5 py-1.5 text-xs text-[#45594c]">{language}<span className="ml-2 text-[#7c877d]">{number(count)} files</span></span>)}</div> : <p className="text-sm text-[#7c877d]">No language signals were returned by the scan.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-5 sm:p-6">
                  <SectionEyebrow>Engineering signals</SectionEyebrow>
                  <div className="mt-3 divide-y divide-[#e9e7de]">
                    <SignalRow label="Automated tests" detected={artifacts?.has_tests} detail={tests?.files === undefined ? undefined : `${number(tests.files)} test files`} />
                    <SignalRow label="CI workflow" detected={artifacts?.has_ci} />
                    <SignalRow label="Container setup" detected={artifacts?.has_docker} />
                    <SignalRow label="License" detected={artifacts?.has_license} />
                    <SignalRow label="Coverage report" detected={tests?.coverage_is_measured} detail={tests?.coverage_percent == null ? 'Not measured' : `${tests.coverage_percent}% measured`} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><SectionEyebrow>Why these scores?</SectionEyebrow><p className="mt-1 text-xs text-[#7c877d]">Component evidence behind the quality score</p></div>
                  <span className="text-xs text-[#7c877d]">Weights and observations come from the API</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {qualityEvidence.slice(0, 6).map((component) => <EvidenceRow key={component.name} component={component} />)}
                </div>
                {!qualityEvidence.length && <p className="mt-4 text-sm text-[#7c877d]">No score components were returned.</p>}
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#e5e3da] bg-gradient-to-br from-[#f5f1e7] to-[#eef3e9] p-5 sm:p-6">
                <SectionEyebrow>Architecture overview</SectionEyebrow>
                <h3 className="mt-3 text-2xl font-semibold text-[#203229]">{result.architecture_analysis?.architecture_type || result.architecture_overview?.pattern || 'Pattern not classified'}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#66746b]">{result.architecture_analysis?.architecture_explanation || result.architecture_overview?.description || 'The API did not return an architecture description.'}</p>
                {result.architecture_analysis?.design_patterns?.length ? <div className="mt-4 flex flex-wrap gap-2">{result.architecture_analysis.design_patterns.map((pattern) => <span key={pattern} className="rounded-lg border border-[#ead8c9] bg-[#f7eee7] px-2.5 py-1.5 text-xs text-[#a35e42]">{pattern}</span>)}</div> : null}
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-5 sm:p-6">
                  <SectionEyebrow>Folder map</SectionEyebrow>
                  <p className="mt-1 text-xs text-[#7c877d]">Directories measured from the repository tree</p>
                  <div className="mt-4 space-y-3">
                    {folderRows.slice(0, 12).map((folder) => <FolderBar key={folder.path} folder={folder} maxLines={maxFolderLines} />)}
                    {!folderRows.length && <EmptyNotice>No folder breakdown was returned for this repository.</EmptyNotice>}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-5 sm:p-6">
                  <SectionEyebrow>Code shape</SectionEyebrow>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricTile label="Functions" value={number(ast?.functions)} />
                    <MetricTile label="Classes" value={number(ast?.classes)} />
                    <MetricTile label="Average complexity" value={typeof ast?.average_cyclomatic_complexity === 'number' ? ast.average_cyclomatic_complexity.toFixed(2) : 'Not measured'} />
                    <MetricTile label="Highest complexity" value={number(ast?.maximum_cyclomatic_complexity)} />
                  </div>
                  <p className="mt-4 text-xs leading-5 text-[#7c877d]">{ast?.complexity_method || 'Complexity methodology was not included in the response.'}</p>
                  <div className="mt-5 border-t border-[#e5e3da] pt-4"><SectionEyebrow>Dependency manifests</SectionEyebrow><div className="mt-2 flex flex-wrap gap-2">{dependencies?.manifests?.length ? dependencies.manifests.map((item) => <span key={item} className="rounded-md bg-[#f5f3eb] px-2.5 py-1.5 text-xs text-[#45594c]">{item}</span>) : <span className="text-sm text-[#7c877d]">No dependency manifest detected</span>}</div></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><SectionEyebrow>Repository files</SectionEyebrow><p className="mt-1 text-xs text-[#7c877d]">Showing the file sample returned by the API. Total inventory: {number(result.file_breakdown?.total ?? fileMetrics?.total)}.</p></div>
                <label className="relative block sm:w-64"><span className="sr-only">Search files</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7c877d]" aria-hidden="true">⌕</span><input value={fileQuery} onChange={(event) => setFileQuery(event.target.value)} placeholder="Search scanned files" className="w-full rounded-lg border border-[#e1e2d9] bg-[#fffefa] py-2.5 pl-9 pr-3 text-sm text-[#203229] outline-none placeholder:text-[#92978c] focus:border-[#47734f]/40" /></label>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {['all', ...categories].map((category) => <button key={category} type="button" onClick={() => setFileCategory(category)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs capitalize transition ${fileCategory === category ? 'bg-[#edf3e9] text-[#47734f] ring-1 ring-[#47734f]/20' : 'bg-[#f6f5ee] text-[#66746b] hover:text-[#203229]'}`}>{category === 'all' ? 'All files' : category}</button>)}
              </div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e3da]">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead className="bg-[#f6f5ee] text-[11px] uppercase tracking-[.12em] text-[#7c877d]"><tr><th className="px-4 py-3 font-semibold">Path</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Language</th><th className="px-4 py-3 text-right font-semibold">Lines</th></tr></thead>
                  <tbody className="divide-y divide-[#e9e7de]">{filteredFiles.slice(0, 100).map((file) => <FileRow key={file.path} file={file} />)}</tbody>
                </table>
                {!filteredFiles.length && <div className="p-8 text-center text-sm text-[#7c877d]">No scanned files match this filter.</div>}
              </div>
              {filteredFiles.length > 100 && <p className="mt-3 text-right text-xs text-[#7c877d]">First 100 of {number(filteredFiles.length)} matching files are shown.</p>}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#ceddce] bg-gradient-to-br from-[#edf3e9] via-[#fffefa] to-[#f7eee7] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><SectionEyebrow>Executive readout</SectionEyebrow><span className="rounded-full border border-[#e1e2d9] px-2.5 py-1 text-[10px] uppercase tracking-[.15em] text-[#66746b]">Evidence-based</span></div>
                <p className="mt-3 text-sm leading-7 text-[#304239]">{summary}</p>
                {llm?.text && <div className="mt-4 rounded-xl border border-[#ead8c9] bg-[#f7eee7] p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a35e42]">Optional AI narrative</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#45594c]">{llm.text}</p></div>}
                <p className="mt-4 text-xs text-[#7c877d]">Optional AI narrative status: {llm?.status || 'Not included in the response'}{llm?.error ? ` — ${llm.error}` : ''}</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <FindingList title="Strengths found" entries={result.insights?.strengths ?? []} variant="good" />
                <FindingList title="Risks to review" entries={result.insights?.risks ?? []} variant="risk" />
              </div>
              <div className="rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-5 sm:p-6">
                <SectionEyebrow>Recommended next steps</SectionEyebrow>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">{(result.insights?.recommendations ?? result.improvement_suggestions ?? []).map((item, index) => <RecommendationCard key={`${item.category}-${index}`} item={item} />)}</div>
                {!(result.insights?.recommendations?.length || result.improvement_suggestions?.length) && <EmptyNotice>No recommendations were returned for this scan.</EmptyNotice>}
              </div>
              {!!result.insights?.scan_warnings?.length && <div className="rounded-2xl border border-[#ebdfc6] bg-[#f8f2e5] p-5"><SectionEyebrow>Scan limitations</SectionEyebrow><ul className="mt-3 space-y-2 text-sm text-[#946d35]">{result.insights.scan_warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div>}
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
      <circle cx="60" cy="60" r={radius} stroke="rgba(32,50,41,.12)" strokeWidth="7" fill="none" />
      {safeScore !== undefined && <><defs><linearGradient id="quality-gauge" x1="0" y1="0" x2="120" y2="120"><stop stopColor="#47734F"/><stop offset="1" stopColor="#BD7452"/></linearGradient></defs><circle cx="60" cy="60" r={radius} stroke="url(#quality-gauge)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} fill="none" className="transition-[stroke-dashoffset] duration-700" /></>}
    </svg>
    <div className="absolute text-center"><span className={`block text-4xl font-semibold tracking-tight ${tone(safeScore)}`}>{safeScore === undefined ? '—' : safeScore.toFixed(1)}</span><span className="mt-1 block text-[10px] uppercase tracking-[.18em] text-[#7c877d]">out of 100</span></div>
  </div>;
}

function ScoreTile({ label, score, note }: { label: string; score?: number; note: string }) {
  const bounded = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : undefined;
  return <div className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-4 transition hover:border-[#c5d8c5] sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-medium text-[#304239]">{label}</h3><p className="mt-1 text-[11px] leading-4 text-[#7c877d]">{note}</p></div><span className={`font-mono text-xl font-semibold ${tone(bounded)}`}>{bounded === undefined ? '—' : bounded.toFixed(1)}</span></div>
    <div><div className="h-1.5 overflow-hidden rounded-full bg-[#eeece3]"><div className={`h-full rounded-full bg-gradient-to-r ${barTone(bounded)}`} style={{ width: bounded === undefined ? '0%' : `${bounded}%` }} /></div><p className="mt-2 text-[10px] uppercase tracking-[.12em] text-[#7c877d]">{scoreBand(bounded)}</p></div>
  </div>;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) { return <h3 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#66746b]">{children}</h3>; }
function MetricTile({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#e8e5dc] bg-[#f7f5ee] p-3"><p className="text-[10px] uppercase tracking-[.1em] text-[#7c877d]">{label}</p><p className="mt-1.5 break-words text-lg font-semibold text-[#203229]">{value}</p></div>; }

function SignalRow({ label, detected, detail }: { label: string; detected?: boolean; detail?: string }) {
  const status = detected === undefined ? 'Not measured' : detected ? 'Detected' : 'Not detected';
  return <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm text-[#45594c]">{label}</p>{detail && <p className="mt-0.5 text-xs text-[#7c877d]">{detail}</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${detected ? 'bg-[#edf3e9] text-[#47734f]' : 'bg-[#f4f2eb] text-[#7c877d]'}`}>{status}</span></div>;
}

function EvidenceRow({ component }: { component: DynamicScore['components'][number] }) {
  const bounded = Math.max(0, Math.min(100, component.score));
  return <div className="rounded-xl border border-[#e8e5dc] bg-[#f7f5ee] p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-[#304239]">{component.name}</p><span className={`font-mono text-xs ${tone(bounded)}`}>{bounded.toFixed(1)}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eeece3]"><div className={`h-full rounded-full bg-gradient-to-r ${barTone(bounded)}`} style={{ width: `${bounded}%` }} /></div><div className="mt-2 flex items-start justify-between gap-3"><p className="text-[11px] leading-5 text-[#7c877d]">{component.evidence}</p><span className="shrink-0 font-mono text-[10px] text-[#92998e]">{(component.weight * 100).toFixed(0)}% wt.</span></div></div>;
}

function FolderBar({ folder, maxLines }: { folder: RepositoryFolder; maxLines: number }) {
  const width = Math.max(folder.lines ? 3 : 0, Math.round(((folder.lines || 0) / maxLines) * 100));
  return <div className="rounded-xl border border-[#e8e5dc] bg-[#f7f5ee] p-3"><div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate font-mono text-xs text-[#304239]">{folder.path}</p><span className="shrink-0 text-[10px] text-[#7c877d]">{number(folder.source_files)} src · {number(folder.lines)} lines</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eeece3]"><div className="h-full rounded-full bg-gradient-to-r from-[#47734f] to-[#bd7452]" style={{ width: `${width}%` }} /></div></div>;
}

function FileRow({ file }: { file: RepositoryFile }) {
  return <tr className="bg-transparent transition hover:bg-[#faf9f4]"><td className="max-w-[300px] px-4 py-3 font-mono text-xs text-[#304239]"><span className="block truncate" title={file.path}>{file.path}</span></td><td className="px-4 py-3"><span className="rounded-md bg-[#f4f2eb] px-2 py-1 text-[10px] capitalize text-[#66746b]">{file.category || 'other'}</span></td><td className="px-4 py-3 text-xs text-[#66746b]">{file.language || file.extension || '—'}</td><td className="px-4 py-3 text-right font-mono text-xs text-[#66746b]">{number(file.lines)}</td></tr>;
}

function FindingList({ title, entries, variant }: { title: string; entries: string[]; variant: 'good' | 'risk' }) {
  return <div className="rounded-2xl border border-[#e5e3da] bg-[#faf9f4] p-5 sm:p-6"><SectionEyebrow>{title}</SectionEyebrow><div className="mt-4 space-y-3">{entries.map((entry, index) => <div key={`${index}-${entry}`} className={`flex gap-3 rounded-xl border p-3.5 text-sm leading-6 ${variant === 'good' ? 'border-[#ceddce] bg-[#edf3e9] text-[#45594c]' : 'border-[#ebdfc6] bg-[#f8f2e5] text-[#45594c]'}`}><span className={`mt-0.5 shrink-0 ${variant === 'good' ? 'text-[#47734f]' : 'text-[#946d35]'}`}>{variant === 'good' ? '✓' : '!'}</span><span>{entry}</span></div>)}{!entries.length && <EmptyNotice>No {variant === 'good' ? 'strengths' : 'risks'} were returned for this scan.</EmptyNotice>}</div></div>;
}

function RecommendationCard({ item }: { item: ImprovementSuggestion }) {
  const priority = item.priority?.toLowerCase() || 'unspecified';
  const priorityTone = priority === 'high' ? 'text-[#9f5146] bg-[#f8ece7]' : priority === 'medium' ? 'text-[#946d35] bg-[#f8f2e5]' : 'text-[#45594c] bg-[#f1efe7]';
  return <article className="rounded-xl border border-[#e5e3da] bg-[#f7f5ee] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-[#47734f]">{item.category}</p><span className={`rounded-md px-2 py-1 text-[9px] uppercase tracking-[.14em] ${priorityTone}`}>{priority} priority</span></div><p className="mt-2 text-sm leading-6 text-[#304239]">{item.suggestion}</p><p className="mt-2 text-xs leading-5 text-[#7c877d]">{item.impact}</p></article>;
}
function EmptyNotice({ children }: { children: React.ReactNode }) { return <p className="rounded-xl border border-dashed border-[#e1e2d9] bg-[#faf9f4] px-4 py-5 text-sm text-[#7c877d]">{children}</p>; }
