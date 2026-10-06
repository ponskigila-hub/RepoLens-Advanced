'use client';

import { useState } from 'react';
import type {
  AnalysisResult, CodeOverview, DynamicScore, GitHubMetadata, ImprovementSuggestion,
  QuickFixItem, RepositoryFile, RepositoryFolder, SavedReport,
} from '@/types/analysis';
import { apiService } from '@/services/api';

type Tab = 'overview' | 'architecture' | 'stack' | 'files' | 'quick-fixes' | 'insights' | 'method';
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◉' },
  { id: 'architecture', label: 'Code map', icon: '⌘' },
  { id: 'stack', label: 'Stack', icon: '▦' },
  { id: 'files', label: 'Files', icon: '▤' },
  { id: 'quick-fixes', label: 'Quick fixes', icon: '☑' },
  { id: 'insights', label: 'Findings', icon: '!' },
  { id: 'method', label: 'How it works', icon: '?' },
];

const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat().format(value) : 'Not measured';
const scoreBand = (value?: number) => value === undefined ? 'Not available' : value >= 80 ? 'Strong signal' : value >= 60 ? 'Developing' : 'Needs attention';
const tone = (value?: number) => value === undefined ? 'text-[#59665d]' : value >= 80 ? 'text-[#315d42]' : value >= 60 ? 'text-[#735017]' : 'text-[#833a32]';
const barTone = (value?: number) => value === undefined ? 'from-[#a7ada0] to-[#c2c4b9]' : value >= 80 ? 'from-[#47734f] to-[#315d42]' : value >= 60 ? 'from-[#c49a4b] to-[#bd8450]' : 'from-[#bd7452] to-[#a95843]';

export default function AnalysisCard({ result, allowSave = true }: { result: AnalysisResult; allowSave?: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [fileQuery, setFileQuery] = useState('');
  const [fileCategory, setFileCategory] = useState('all');
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);
  const [shareLinks, setShareLinks] = useState<{ report: string; badge: string; markdown: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (!result.success) {
    return <div role="alert" className="rounded-2xl border border-[#e8c9bd] bg-[#f8ece7] p-5 text-sm text-[#833a32]">{result.error || 'Analysis could not be completed.'}</div>;
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
  const project = result.repository_overview;
  const projectPurpose = typeof project?.purpose === 'string' ? project.purpose.trim() : '';
  const purposeAvailable = !!projectPurpose && (project?.purpose_status === 'documented' || (!project?.purpose_status && !!project?.summary_source && project.summary_source !== 'static repository inventory' && !projectPurpose.startsWith('No explicit project description')));
  const scanSummary = result.insights?.summary?.trim() || '';
  const frameworks = result.technology_stack?.frameworks ?? [];
  const frameworkDetection = result.technology_stack?.framework_detection;
  const quickFixes = result.quick_fix_checklist;
  const llm = result.insights?.llm;
  const qualityEvidence = result.scores?.quality?.components ?? result.scores?.overall_quality?.components ?? [];
  const codeOverview = result.code_overview;
  const githubMetadata = result.github_metadata;

  const handleSaveAndShare = async () => {
    setSaving(true);
    setShareError(null);
    try {
      const saved = await apiService.saveReport(result);
      const origin = window.location.origin;
      const reportUrl = `${origin}${saved.report_url}`;
      const badgeUrl = `${origin}${saved.badge_url}`;
      setSavedReport(saved);
      setShareLinks({ report: reportUrl, badge: badgeUrl, markdown: `[![RepoLens Score](${badgeUrl})](${reportUrl})` });
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Could not save this report.');
    } finally {
      setSaving(false);
    }
  };

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1800);
      setShareError(null);
    } catch {
      setShareError('Clipboard access was blocked. Select and copy the text manually.');
    }
  };

  return (
    <section id="analysis-report" className="analysis-report scroll-mt-8 overflow-hidden rounded-[26px] border border-[#d9ddd2] bg-[#fffefa] shadow-[0_24px_72px_rgba(32,50,41,.11)]">
      <header className="flex flex-col gap-4 border-b border-[#e3e1d7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#315d42]"><span className="h-1.5 w-1.5 rounded-full bg-[#47734f]" /> Repository report</div>
          <h2 className="mt-2 truncate text-xl font-semibold text-[#203229] sm:text-2xl">{fullName}</h2>
          <p className="mt-1 text-xs text-[#59665d]">Snapshot scan · {number(fileMetrics?.total ?? result.file_breakdown?.total)} files inventoried</p>
        </div>
        <div className="print-hide flex flex-wrap items-center gap-2">
          {repo?.url && <a href={repo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#d9ddd2] px-3 py-2 text-sm font-medium text-[#45594c] transition hover:border-[#9fbea1] hover:text-[#203229]">Open on GitHub <span aria-hidden="true">↗</span></a>}
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-[#d9ddd2] px-3 py-2 text-sm font-medium text-[#45594c] transition hover:border-[#9fbea1]">Save PDF</button>
          {allowSave && <button type="button" disabled={saving || !!savedReport} onClick={handleSaveAndShare} className="rounded-lg bg-[#315d42] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#274c35] disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving…' : savedReport ? 'Saved & shared' : 'Save & share'}</button>}
          <span className="rounded-lg border border-[#ceddce] bg-[#edf3e9] px-3 py-2 text-xs font-medium text-[#315d42]">{result.score_methodology?.version || result.ml_scores?.model_used || 'Static report'}</span>
        </div>
      </header>

      {shareLinks && savedReport && <div className="print-hide border-b border-[#e3e1d7] bg-[#f6f8f2] px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#203229]">Shareable report saved</h3><p className="mt-1 text-xs text-[#45594c]">Public, unlisted link — anyone with the URL can view this saved snapshot.</p></div><span className="rounded-full border border-[#ceddce] bg-[#edf3e9] px-2.5 py-1 text-[10px] text-[#315d42]">{new Date(savedReport.created_at).toLocaleString()}</span></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0"><label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#59665d]">Public report URL</label><div className="mt-1 flex gap-2"><input readOnly value={shareLinks.report} className="min-w-0 flex-1 rounded-lg border border-[#d9ddd2] bg-white px-3 py-2 text-xs text-[#304239]"/><button type="button" onClick={() => copyValue('report', shareLinks.report)} className="rounded-lg border border-[#c5d8c5] px-3 py-2 text-xs font-semibold text-[#315d42]">{copied === 'report' ? 'Copied' : 'Copy link'}</button></div></div>
          <div className="min-w-0"><label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#59665d]">README badge Markdown</label><div className="mt-1 flex gap-2"><input readOnly value={shareLinks.markdown} className="min-w-0 flex-1 rounded-lg border border-[#d9ddd2] bg-white px-3 py-2 font-mono text-[10px] text-[#304239]"/><button type="button" onClick={() => copyValue('badge', shareLinks.markdown)} className="rounded-lg border border-[#c5d8c5] px-3 py-2 text-xs font-semibold text-[#315d42]">{copied === 'badge' ? 'Copied' : 'Copy badge'}</button></div></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><img src={shareLinks.badge} alt={`RepoLens score badge for ${fullName}`} width="250" height="32"/><a href={shareLinks.report} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#315d42] underline underline-offset-2">Open public report ↗</a></div>
        {shareError && <p role="alert" className="mt-3 text-xs text-[#833a32]">{shareError}</p>}
      </div>}
      {shareError && !shareLinks && <p role="alert" className="print-hide border-b border-[#e8c9bd] bg-[#f8ece7] px-5 py-3 text-xs text-[#833a32] sm:px-7">{shareError}</p>}

      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[215px_minmax(0,1fr)]">
        <aside className="print-hide lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#59665d] lg:block">Report sections</p>
          <nav aria-label="Report sections" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`inline-flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${activeTab === tab.id ? 'border border-[#c5d8c5] bg-[#edf3e9] font-semibold text-[#315d42]' : 'border border-transparent text-[#45594c] hover:bg-[#f5f3eb] hover:text-[#203229]'}`}>
                <span className="w-5 text-center text-base" aria-hidden="true">{tab.icon}</span>{tab.label}
                {tab.id === 'files' && <span className="ml-auto rounded-md bg-[#f5f3eb] px-1.5 py-0.5 text-[10px] text-[#59665d]">{number(result.file_breakdown?.total ?? fileMetrics?.total)}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-5 hidden rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-4 lg:block">
            <p className="text-xs font-semibold text-[#304239]">Scan scope</p>
            <p className="mt-1 text-xs leading-5 text-[#45594c]">Depth-{number(repo?.clone_depth)} snapshot. Source is inspected statically; repository code is not executed.</p>
          </div>
        </aside>

        <div className="min-w-0" role="tabpanel">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-[#ceddce] border-l-[5px] border-l-[#315d42] bg-white p-5 shadow-[0_8px_28px_rgba(32,50,41,.05)] sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><SectionEyebrow>What the project documents</SectionEyebrow><h3 className="mt-2 text-xl font-semibold tracking-tight text-[#203229]">{project?.name || fullName}</h3></div>
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${purposeAvailable ? 'border-[#ceddce] bg-[#edf3e9] text-[#315d42]' : 'border-[#dfd1ad] bg-[#fbf5e8] text-[#604515]'}`}>{purposeAvailable ? `Source · ${project?.summary_source || 'repository docs'}` : 'Purpose not documented'}</span>
                </div>
                {purposeAvailable ? <p className="mt-4 max-w-4xl text-base leading-7 text-[#304239] sm:text-lg sm:leading-8">{projectPurpose}</p> : <div className="mt-4 rounded-xl border border-[#dfd1ad] bg-[#fbf5e8] p-4"><p className="text-sm font-semibold text-[#604515]">The README/manifest does not provide a clear project-purpose statement.</p><p className="mt-1 text-sm leading-6 text-[#45594c]">{project?.purpose_note || 'See the code-based map below: detected folders, entry-point candidates, framework declarations, and function/class names can still describe how the repository is organized.'}</p></div>}
                {purposeAvailable && <p className="mt-3 text-xs leading-5 text-[#45594c]">{project?.purpose_note || 'Maintainer-provided description; RepoLens does not independently validate product claims.'}{project?.evidence?.length ? ` Evidence: ${project.evidence.join(', ')}.` : ''}</p>}
                {project?.application_type && <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#d9e2d6] bg-[#f3f7f1] px-3 py-2"><span className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#59665d]">Likely project type</span><span className="text-sm font-semibold text-[#315d42]">{project.application_type}</span><span className="text-[11px] text-[#45594c]">Inferred from declared framework signals</span></div>}
              </section>

              <CodeSummaryCard code={codeOverview} />
              <GitHubCard repositoryOwner={repo?.owner} metadata={githubMetadata} />

              <div className="grid gap-4 xl:grid-cols-[minmax(250px,.8fr)_minmax(0,1.2fr)]">
                <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div><SectionEyebrow>Quality score</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Weighted static signals</p></div><span className="rounded-md border border-[#ceddce] bg-white px-2 py-1 font-mono text-[10px] text-[#315d42]">{result.score_methodology?.version || 'static'}</span></div>
                  <div className="flex justify-center py-2"><ScoreGauge score={quality} /></div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{scoreCards.map((item) => <ScoreTile key={item.key} label={item.label} score={item.score} note={item.note} />)}</div>
              </div>

              <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><SectionEyebrow>Repository inventory</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Counts measured from the scanned snapshot</p></div><span className="rounded-full border border-[#dfe5da] bg-white px-2.5 py-1 text-[10px] font-medium text-[#45594c]">Static inventory</span></div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricTile label="Files scanned" value={number(fileMetrics?.total ?? result.file_breakdown?.total ?? result.repo_info?.file_count)} />
                  <MetricTile label="Source files" value={number(fileMetrics?.source)} />
                  <MetricTile label="Source + test lines" value={number(lineMetrics?.source_and_tests ?? result.repo_info?.total_lines)} />
                  <MetricTile label="Dependencies" value={number(dependencies?.count)} />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><SectionEyebrow>Engineering signals</SectionEyebrow><div className="mt-3 divide-y divide-[#e3e1d7]">
                  <SignalRow label="Automated tests" detected={artifacts?.has_tests} detail={tests?.files === undefined ? undefined : `${number(tests.files)} test files`} />
                  <SignalRow label="CI workflow" detected={artifacts?.has_ci} />
                  <SignalRow label="Container setup" detected={artifacts?.has_docker} />
                  <SignalRow label="License" detected={artifacts?.has_license} />
                  <SignalRow label="Coverage measurement" detected={tests?.coverage_is_measured} detail={tests?.coverage_percent == null ? (artifacts?.has_coverage_report ? 'Report found; percentage not parsed' : 'No supported report detected') : `${tests.coverage_percent}% measured`} detectedLabel="Measured" missingLabel="Not measured" />
                </div></div>
                <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><SectionEyebrow>Why these scores?</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Evidence behind the quality score</p></div><span className="text-[11px] text-[#59665d]">Weights from API</span></div><div className="mt-4 space-y-3">{qualityEvidence.slice(0, 4).map((component) => <EvidenceRow key={component.name} component={component} />)}{!qualityEvidence.length && <EmptyNotice>No score components were returned.</EmptyNotice>}</div></div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && <ArchitectureTab code={codeOverview} files={files} folders={folderRows} maxFolderLines={maxFolderLines} ast={ast} dependencies={dependencies} />}
          {activeTab === 'stack' && <StackTab result={result} languageEntries={langEntries} />}

          {activeTab === 'files' && (
            <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><SectionEyebrow>Repository files</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Returned sample: {number(files.length)} files. Total inventory: {number(result.file_breakdown?.total ?? fileMetrics?.total)}.</p></div>
                <label className="relative block sm:w-64"><span className="sr-only">Search files</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#59665d]" aria-hidden="true">⌕</span><input value={fileQuery} onChange={(event) => setFileQuery(event.target.value)} placeholder="Search paths or language" className="w-full rounded-lg border border-[#d9ddd2] bg-[#fffefa] py-2.5 pl-9 pr-3 text-sm text-[#203229] outline-none placeholder:text-[#59665d] focus:border-[#47734f]" /></label>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{['all', ...categories].map((category) => <button key={category} type="button" onClick={() => setFileCategory(category)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs capitalize transition ${fileCategory === category ? 'bg-[#edf3e9] font-semibold text-[#315d42] ring-1 ring-[#47734f]/25' : 'bg-[#f1efe7] text-[#45594c] hover:text-[#203229]'}`}>{category === 'all' ? 'All files' : category}</button>)}</div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-[#d9ddd2]"><table className="w-full min-w-[560px] border-collapse text-left text-sm"><thead className="bg-[#f1efe7] text-[11px] uppercase tracking-[.1em] text-[#45594c]"><tr><th className="px-4 py-3 font-semibold">Path</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Language</th><th className="px-4 py-3 text-right font-semibold">Lines</th></tr></thead><tbody className="divide-y divide-[#e3e1d7]">{filteredFiles.slice(0, 100).map((file) => <FileRow key={file.path} file={file} />)}</tbody></table>{!filteredFiles.length && <div className="p-8 text-center text-sm text-[#45594c]">No scanned files match this filter.</div>}</div>
              {filteredFiles.length > 100 && <p className="mt-3 text-right text-xs text-[#45594c]">First 100 of {number(filteredFiles.length)} matching files are shown.</p>}
              {(result.file_breakdown?.total ?? 0) > files.length && <p className="mt-2 text-xs leading-5 text-[#59665d]">The API limits returned file rows to {number(result.file_breakdown?.sample_limit)}. Counts above use the full scanned inventory.</p>}
            </div>
          )}

          {activeTab === 'quick-fixes' && <QuickFixTab items={quickFixes?.items ?? []} completed={quickFixes?.completed ?? 0} total={quickFixes?.total ?? 0} note={quickFixes?.note} />}

          {activeTab === 'insights' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><SectionEyebrow>Measured scan summary</SectionEyebrow><span className="rounded-full border border-[#d9ddd2] bg-white px-2.5 py-1 text-[10px] uppercase tracking-[.1em] text-[#45594c]">Static evidence</span></div><p className="mt-3 text-sm leading-7 text-[#304239]">{scanSummary || 'No scan summary was returned by the API.'}</p>{llm?.text && <div className="mt-4 rounded-xl border border-[#ead8c9] bg-[#fff8f2] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#854830]">Optional AI narrative</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#304239]">{llm.text}</p></div>}<p className="mt-4 text-xs text-[#45594c]">Optional AI narrative status: {llm?.status || 'Not included'}{llm?.error ? ` — ${llm.error}` : ''}</p></div>
              <div className="grid gap-4 xl:grid-cols-2"><FindingList title="Strengths found" entries={result.insights?.strengths ?? []} variant="good" /><FindingList title="Risks to review" entries={result.insights?.risks ?? []} variant="risk" /></div>
              <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><SectionEyebrow>Recommended next steps</SectionEyebrow><div className="mt-4 grid gap-3 lg:grid-cols-2">{(result.insights?.recommendations ?? result.improvement_suggestions ?? []).map((item, index) => <RecommendationCard key={`${item.category}-${index}`} item={item} />)}</div>{!(result.insights?.recommendations?.length || result.improvement_suggestions?.length) && <EmptyNotice>No recommendations were returned for this scan.</EmptyNotice>}</div>
              {!!result.insights?.scan_warnings?.length && <div className="rounded-2xl border border-[#dfd1ad] bg-[#fbf5e8] p-5"><SectionEyebrow>Scan limitations</SectionEyebrow><ul className="mt-3 space-y-2 text-sm text-[#604515]">{result.insights.scan_warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div>}
            </div>
          )}

          {activeTab === 'method' && <MethodTab result={result} />}
        </div>
      </div>
    </section>
  );
}

function CodeSummaryCard({ code }: { code?: CodeOverview }) {
  return <section className="rounded-2xl border border-[#d9ddd2] bg-[#f7f8f3] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><SectionEyebrow>What the code shows</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Independent of the README description</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${code?.status === 'available' ? 'bg-[#edf3e9] text-[#315d42]' : 'bg-[#f1efe7] text-[#59665d]'}`}>{code?.status === 'available' ? 'Code signals available' : 'Code summary unavailable'}</span></div>
    {code?.summary ? <p className="mt-4 text-sm leading-7 text-[#304239]">{code.summary}</p> : <p className="mt-4 text-sm leading-6 text-[#45594c]">No supported source files were available for a code-based summary. The file inventory and documentation status are still shown in their respective tabs.</p>}
    {!!code?.directory_roles?.length && <div className="mt-4 flex flex-wrap gap-2">{code.directory_roles.slice(0, 6).map((folder) => <span key={folder.path} className="inline-flex items-center gap-2 rounded-lg border border-[#d9ddd2] bg-white px-2.5 py-1.5"><span className="font-mono text-xs font-semibold text-[#315d42]">{folder.path}</span><span className="text-[10px] text-[#59665d]">{folder.role}</span></span>)}</div>}
    {code?.readme_framework_crosscheck && <div className="mt-5 border-t border-[#d9ddd2] pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold text-[#304239]">README framework cross-check</h4><span className="text-[10px] text-[#59665d]">{code.readme_framework_crosscheck.status === 'compared' ? 'Literal name comparison' : code.readme_framework_crosscheck.status === 'unavailable' ? 'README unavailable' : 'No recognized names to compare'}</span></div>
      {code.readme_framework_crosscheck.items.length ? <div className="mt-3 flex flex-wrap gap-2">{code.readme_framework_crosscheck.items.map((item) => <span key={item.name} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${item.status === 'mentioned_and_declared' ? 'border-[#ceddce] bg-[#edf3e9] text-[#315d42]' : item.status === 'readme_only' ? 'border-[#dfd1ad] bg-[#fbf5e8] text-[#604515]' : 'border-[#d9ddd2] bg-white text-[#45594c]'}`}><strong>{item.name}</strong> · {item.status === 'mentioned_and_declared' ? 'README + manifest' : item.status === 'readme_only' ? 'README only' : 'Manifest only'}</span>)}</div> : <p className="mt-2 text-xs leading-5 text-[#45594c]">{code.readme_framework_crosscheck.note}</p>}
      <p className="mt-2 text-[10px] leading-4 text-[#59665d]">{code.readme_framework_crosscheck.note}</p></div>}
  </section>;
}

function GitHubCard({ repositoryOwner, metadata }: { repositoryOwner?: string; metadata?: GitHubMetadata }) {
  const ownerName = metadata?.owner?.login || repositoryOwner;
  const ownerUrl = metadata?.owner?.html_url || (repositoryOwner ? `https://github.com/${encodeURIComponent(repositoryOwner)}` : null);
  const contributors = metadata?.contributors ?? [];
  return <section className="rounded-2xl border border-[#d9ddd2] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><SectionEyebrow>Repository ownership</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Public GitHub metadata</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${metadata?.status === 'available' ? 'bg-[#edf3e9] text-[#315d42]' : metadata?.status === 'partial' ? 'bg-[#fbf5e8] text-[#604515]' : 'bg-[#f1efe7] text-[#59665d]'}`}>{metadata?.status || 'unavailable'}</span></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
      <div className="flex items-center gap-3 rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e5eee2] text-sm font-bold text-[#315d42]">{ownerName?.slice(0, 2).toUpperCase() || 'GH'}</div><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.1em] text-[#59665d]">Owner</p>{ownerName ? <a href={ownerUrl || '#'} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-[#203229] hover:underline">{ownerName} <span className="text-xs font-normal text-[#59665d]">{metadata?.owner?.type ? `· ${metadata.owner.type}` : ''}</span></a> : <p className="text-sm text-[#59665d]">Not available</p>}</div></div>
      <div className="rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3"><p className="text-[10px] uppercase tracking-[.1em] text-[#59665d]">Repository created</p><p className="mt-1 text-sm font-semibold text-[#203229]">{formatDate(metadata?.created_at)}</p><p className="mt-1 text-[10px] text-[#59665d]">Date supplied by GitHub; not inferred from the commit history.</p></div>
    </div>
    <div className="mt-4 border-t border-[#e3e1d7] pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold text-[#304239]">Contributors</h4><span className="text-[10px] text-[#59665d]">{contributors.length ? `${contributors.length}${metadata?.contributors_truncated ? '+' : ''} shown` : metadata?.contributors_status === 'none_reported' ? 'None reported by API' : 'Not available'}</span></div>
      {contributors.length ? <div className="mt-3 flex flex-wrap gap-2">{contributors.map((person) => <a key={person.login} href={person.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#d9ddd2] bg-[#faf9f4] py-1 pl-1 pr-3 text-xs font-medium text-[#304239] hover:border-[#9fbea1]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e5eee2] text-[10px] font-bold text-[#315d42]">{person.login.slice(0, 2).toUpperCase()}</span>{person.login}{typeof person.contributions === 'number' && <span className="text-[10px] text-[#59665d]">{number(person.contributions)} commits</span>}</a>)}</div> : <p className="mt-2 text-xs leading-5 text-[#45594c]">{metadata?.contributors_status === 'none_reported' ? 'The public contributors endpoint returned no named accounts.' : 'Contributor information could not be loaded. The repository scan is unaffected.'}</p>}
    </div>
    <p className="mt-3 text-[10px] leading-4 text-[#59665d]">{metadata?.note || 'GitHub metadata was not included in this saved report.'}</p>
  </section>;
}

function ArchitectureTab({ code, files, folders, maxFolderLines, ast, dependencies }: { code?: CodeOverview; files: RepositoryFile[]; folders: RepositoryFolder[]; maxFolderLines: number; ast?: AnalysisResult['metrics'] extends infer M ? M extends { ast?: infer A } ? A : never : never; dependencies?: AnalysisResult['metrics'] extends infer M ? M extends { dependencies?: infer D } ? D : never : never }) {
  const tree = makeTree(files.slice(0, 350));
  const symbols = code?.symbols.items ?? [];
  return <div className="space-y-5">
    <section className="rounded-2xl border border-[#d9ddd2] bg-[#f7f8f3] p-5 sm:p-6"><SectionEyebrow>Architecture from paths</SectionEyebrow><h3 className="mt-2 text-xl font-semibold text-[#203229]">{code?.directory_roles?.length ? `${code.directory_roles.length} code-bearing directories in the map` : 'Repository structure'}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#45594c]">{code?.limitations || 'This map uses scanned paths and source declarations; it does not claim runtime call flow.'}</p>{!!code?.entrypoint_candidates?.length && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#59665d]">Entry-point candidates</p><div className="mt-2 flex flex-wrap gap-2">{code.entrypoint_candidates.slice(0, 12).map((path) => <code key={path} className="rounded-md border border-[#d9ddd2] bg-white px-2.5 py-1.5 text-[11px] text-[#304239]">{path}</code>)}</div></div>}</section>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><div><SectionEyebrow>File tree</SectionEyebrow><p className="mt-1 text-xs leading-5 text-[#45594c]">Built from returned repository paths. Expand folders to inspect them.</p></div><div className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-[#e3e1d7] bg-white p-3">{tree.length ? <TreeList nodes={tree} depth={0} /> : <EmptyNotice>No file paths were returned.</EmptyNotice>}</div>{files.length > 350 && <p className="mt-2 text-[10px] text-[#59665d]">Tree displays the first 350 of {number(files.length)} returned paths.</p>}</section>
      <section className="space-y-5">
        <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><div><SectionEyebrow>Folders by source size</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Measured source files and line counts</p></div><div className="mt-4 space-y-3">{folders.slice(0, 12).map((folder) => <FolderBar key={folder.path} folder={folder} maxLines={maxFolderLines} />)}{!folders.length && <EmptyNotice>No folder breakdown was returned.</EmptyNotice>}</div></div>
        <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><SectionEyebrow>Code shape</SectionEyebrow><div className="mt-4 grid grid-cols-2 gap-3"><MetricTile label="Functions" value={number(ast?.functions)} /><MetricTile label="Classes" value={number(ast?.classes)} /><MetricTile label="Average complexity" value={typeof ast?.average_cyclomatic_complexity === 'number' ? ast.average_cyclomatic_complexity.toFixed(2) : 'Not measured'} /><MetricTile label="Highest complexity" value={number(ast?.maximum_cyclomatic_complexity)} /></div><p className="mt-3 text-[11px] leading-5 text-[#59665d]">{ast?.complexity_method || 'Complexity method unavailable.'}</p><div className="mt-4 border-t border-[#e3e1d7] pt-4"><SectionEyebrow>Dependency manifests</SectionEyebrow><div className="mt-2 flex flex-wrap gap-2">{dependencies?.manifests?.length ? dependencies.manifests.map((item) => <span key={item} className="rounded-md bg-[#f1efe7] px-2.5 py-1.5 text-xs text-[#45594c]">{item}</span>) : <span className="text-sm text-[#59665d]">No dependency manifest detected</span>}</div></div></div>
      </section>
    </div>
    <section className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><SectionEyebrow>Function and class names</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Names and paths extracted from supported syntax; no source text is shown.</p></div><span className="rounded-full border border-[#d9ddd2] bg-white px-2.5 py-1 text-[10px] text-[#45594c]">{number(code?.symbols.count)} symbols · {number(code?.symbols.parsed_files)} files</span></div><p className="mt-3 text-[10px] leading-4 text-[#59665d]">{code?.symbols.method || 'Symbol extraction was not included in this report.'}</p><div className="mt-4 grid gap-2 md:grid-cols-2">{symbols.slice(0, 40).map((symbol, index) => <div key={`${symbol.path}-${symbol.line}-${symbol.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e3e1d7] bg-white px-3 py-2.5"><span className="rounded-md bg-[#edf3e9] px-2 py-1 text-[9px] font-bold uppercase text-[#315d42]">{symbol.kind}</span><span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-[#203229]">{symbol.name}</span><span className="max-w-[45%] truncate font-mono text-[10px] text-[#59665d]" title={`${symbol.path}:${symbol.line}`}>{symbol.path}:{symbol.line}</span></div>)}</div>{!symbols.length && <EmptyNotice>No function/class names were extracted from the supported languages in this repository.</EmptyNotice>}{!!code?.symbols.truncated && <p className="mt-3 text-right text-[10px] text-[#59665d]">Showing a bounded sample of {number(code.symbols.sample_limit)} names.</p>}</section>
  </div>;
}

function StackTab({ result, languageEntries }: { result: AnalysisResult; languageEntries: [string, number][] }) {
  const frameworks = result.technology_stack?.frameworks ?? [];
  const detection = result.technology_stack?.framework_detection;
  const dependencies = result.metrics?.dependencies;
  const maxLanguageFiles = Math.max(...languageEntries.map(([, count]) => count), 1);
  const groups = [
    ['Frontend', result.technology_stack?.frontend], ['Backend', result.technology_stack?.backend],
    ['Data', result.technology_stack?.database], ['Delivery', result.technology_stack?.deployment],
    ['Testing', result.technology_stack?.testing], ['Other signals', result.technology_stack?.other],
  ] as const;
  return <div className="space-y-5">
    <section className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><SectionEyebrow>Languages</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Counted by scanned source/test files, not lines or runtime imports</p></div><span className="rounded-full border border-[#d9ddd2] bg-white px-2.5 py-1 text-[10px] text-[#45594c]">{number(languageEntries.reduce((sum, [, count]) => sum + count, 0))} files classified</span></div>
      {languageEntries.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{languageEntries.map(([language, count]) => <div key={language} className="flex items-center gap-3 rounded-xl border border-[#e3e1d7] bg-white p-3"><TechMark name={language} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-[#203229]">{language}</p><p className="font-mono text-xs text-[#45594c]">{number(count)} files</p></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eeece3]"><div className="h-full rounded-full bg-[#47734f]" style={{ width: `${Math.max(2, (count / maxLanguageFiles) * 100)}%` }} /></div></div></div>)}</div> : <EmptyNotice>{result.metrics?.language_breakdown ? 'No recognized source languages were found.' : 'Language data is unavailable in this report.'}</EmptyNotice>}
    </section>
    <section className="rounded-2xl border border-[#d9ddd2] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><SectionEyebrow>Frameworks and libraries</SectionEyebrow><p className="mt-1 text-xs leading-5 text-[#45594c]">Direct package declarations in supported manifests</p></div><span className="rounded-full bg-[#edf3e9] px-2.5 py-1 text-[10px] font-semibold text-[#315d42]">{frameworks.length} recognized</span></div>
      {frameworks.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{frameworks.map((framework) => <article key={framework.name} className="flex gap-3 rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3"><TechMark name={framework.name} /><div className="min-w-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-sm font-semibold text-[#203229]">{framework.name}</h4><span className="text-[10px] text-[#315d42]">{framework.role}</span></div><p className="mt-1 break-words font-mono text-[10px] text-[#45594c]">{framework.packages.join(', ')}</p><div className="mt-2 flex flex-wrap gap-1.5">{framework.evidence.map((evidence) => <span key={`${framework.name}-${evidence.manifest}-${evidence.section}`} className="rounded-md bg-white px-2 py-1 text-[9px] text-[#45594c]">{evidence.manifest} · {evidence.section}</span>)}</div></div></article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-[#d9ddd2] bg-[#faf9f4] p-4"><p className="text-sm font-semibold text-[#304239]">{detection?.status === 'not_detected' ? 'No recognized declaration found' : 'Framework data unavailable'}</p><p className="mt-1 text-xs leading-5 text-[#45594c]">{detection?.note || 'Framework evidence was not returned.'}</p>{!!detection?.manifests?.length && <p className="mt-2 break-words font-mono text-[10px] text-[#59665d]">Checked: {detection.manifests.join(', ')}</p>}</div>}
    </section>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><SectionEyebrow>Detected stack groups</SectionEyebrow><div className="mt-4 space-y-3">{groups.map(([group, items]) => <div key={group} className="border-b border-[#e3e1d7] pb-3 last:border-0"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#59665d]">{group}</p>{items?.length ? <div className="mt-2 flex flex-wrap gap-2">{items.map((name) => <span key={name} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9ddd2] bg-white px-2 py-1.5 text-xs text-[#304239]"><TechMark name={name} small />{name}</span>)}</div> : <p className="mt-1 text-xs text-[#59665d]">No recognized signal</p>}</div>)}</div></section>
      <section className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><SectionEyebrow>Declared dependencies</SectionEyebrow><p className="mt-1 text-xs text-[#45594c]">Package names read from manifests; they may not all be used by runtime code.</p></div><span className="rounded-full border border-[#d9ddd2] bg-white px-2.5 py-1 text-[10px] text-[#45594c]">{number(dependencies?.count)} detected</span></div><div className="mt-4 flex flex-wrap gap-2">{dependencies?.names?.length ? dependencies.names.slice(0, 60).map((name) => <code key={name} className="rounded-md border border-[#e3e1d7] bg-white px-2 py-1 text-[10px] text-[#304239]">{name}</code>) : <p className="text-sm text-[#59665d]">No supported dependency declarations were found.</p>}</div>{(dependencies?.names?.length ?? 0) > 60 && <p className="mt-3 text-right text-[10px] text-[#59665d]">Showing 60 of {number(dependencies?.names?.length)} returned names.</p>}<div className="mt-4 border-t border-[#e3e1d7] pt-3"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#59665d]">Manifests and lockfiles</p><div className="mt-2 flex flex-wrap gap-2">{[...(dependencies?.manifests ?? []), ...(dependencies?.lockfiles ?? [])].map((path) => <span key={path} className="rounded-md bg-white px-2 py-1 font-mono text-[10px] text-[#45594c]">{path}</span>)}</div></div></section>
    </div>
  </div>;
}

function QuickFixTab({ items, completed, total, note }: { items: QuickFixItem[]; completed: number; total: number; note?: string }) {
  return <div className="space-y-5"><div className="rounded-2xl border border-[#d9ddd2] bg-[#f7f8f3] p-5 sm:p-6"><SectionEyebrow>Production readiness quick fixes</SectionEyebrow><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><h3 className="text-xl font-semibold text-[#203229]">File-presence checklist</h3><span className="rounded-full border border-[#c5d8c5] bg-white px-3 py-1.5 text-xs font-semibold text-[#315d42]">{number(completed)} / {number(total)} present</span></div><p className="mt-2 max-w-3xl text-sm leading-6 text-[#45594c]">Checkboxes reflect files found in the scanned repository. Missing items suggest next steps; presence is not a quality or safety certification.</p></div><div className="grid gap-3 lg:grid-cols-2">{items.map((item) => <QuickFixCard key={item.id} item={item} />)}{!items.length && <EmptyNotice>The API did not return a quick-fix checklist.</EmptyNotice>}</div>{note && <p className="text-xs leading-5 text-[#59665d]">{note}</p>}</div>;
}

function MethodTab({ result }: { result: AnalysisResult }) {
  const steps = [
    ['1. Fetch', 'RepoLens validates the public GitHub URL, takes a shallow snapshot, and asks the public GitHub API for creation/owner/contributor metadata. Metadata is best-effort and cannot fail the code scan.'],
    ['2. Inventory', 'The scanner walks bounded file paths, counts folders/languages/dependencies, recognizes common manifests and CI/deployment files, and never follows repository symlinks.'],
    ['3. Read code shape', 'Python functions/classes are extracted with AST. JavaScript, TypeScript, Go, and Rust symbol names use syntax patterns. The code map lists paths and names only; it does not claim to understand runtime behavior.'],
    ['4. Cross-check docs', 'README purpose is shown as maintainer-provided text. Literal framework-name mentions are compared with direct dependency declarations so documentation and code signals stay distinguishable.'],
    ['5. Score and explain', 'The static-v2 scorecards are weighted from measured repository signals. Optional LLM text is separate and never modifies scores.'],
  ];
  return <div className="space-y-5"><section className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><SectionEyebrow>How RepoLens works</SectionEyebrow><p className="mt-2 max-w-3xl text-sm leading-6 text-[#45594c]">This report is a bounded static reading of a public repository snapshot. Each step labels where data comes from and what RepoLens could not verify.</p><ol className="mt-5 space-y-3">{steps.map(([title, description]) => <li key={title} className="flex gap-3 rounded-xl border border-[#e3e1d7] bg-white p-4"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf3e9] text-[10px] font-bold text-[#315d42]">✓</span><div><h3 className="text-sm font-semibold text-[#203229]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#45594c]">{description}</p></div></li>)}</ol></section><section className="rounded-2xl border border-[#dfd1ad] bg-[#fbf5e8] p-5 sm:p-6"><SectionEyebrow>What this report cannot prove</SectionEyebrow><ul className="mt-3 space-y-2 text-sm leading-6 text-[#604515]"><li>• Repository code is not executed and dependencies are not installed.</li><li>• Tests and runtime performance are not run; coverage is reported only when a supported report file exists.</li><li>• Framework declarations and entry-point names are evidence, not proof of active runtime use.</li><li>• GitHub creation/contributor metadata depends on the public API and may be unavailable or rate-limited.</li><li>• Static findings are not a complete security audit or human code review.</li></ul><p className="mt-4 text-xs text-[#604515]">Scoring method reported by this analysis: <strong>{result.score_methodology?.version || 'not provided'}</strong>.</p></section></div>;
}

function ScoreGauge({ score }: { score?: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const safeScore = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : undefined;
  const offset = safeScore === undefined ? circumference : circumference * (1 - safeScore / 100);
  return <div className="relative flex h-40 w-40 items-center justify-center"><svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-label={safeScore === undefined ? 'Quality score unavailable' : `Quality score ${safeScore.toFixed(1)} out of 100`} role="img"><circle cx="60" cy="60" r={radius} stroke="rgba(32,50,41,.14)" strokeWidth="7" fill="none" />{safeScore !== undefined && <><defs><linearGradient id="quality-gauge" x1="0" y1="0" x2="120" y2="120"><stop stopColor="#47734F"/><stop offset="1" stopColor="#BD7452"/></linearGradient></defs><circle cx="60" cy="60" r={radius} stroke="url(#quality-gauge)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} fill="none" className="transition-[stroke-dashoffset] duration-700" /></>}</svg><div className="absolute text-center"><span className={`block text-4xl font-semibold tracking-tight ${tone(safeScore)}`}>{safeScore === undefined ? '—' : safeScore.toFixed(1)}</span><span className="mt-1 block text-[10px] uppercase tracking-[.14em] text-[#45594c]">out of 100</span></div></div>;
}

function ScoreTile({ label, score, note }: { label: string; score?: number; note: string }) {
  const bounded = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : undefined;
  return <div className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-4 transition hover:border-[#c5d8c5] sm:p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#304239]">{label}</h3><p className="mt-1 text-[11px] leading-4 text-[#45594c]">{note}</p></div><span className={`font-mono text-xl font-semibold ${tone(bounded)}`}>{bounded === undefined ? '—' : bounded.toFixed(1)}</span></div><div><div className="h-1.5 overflow-hidden rounded-full bg-[#eeece3]"><div className={`h-full rounded-full bg-gradient-to-r ${barTone(bounded)}`} style={{ width: bounded === undefined ? '0%' : `${bounded}%` }} /></div><p className="mt-2 text-[10px] uppercase tracking-[.1em] text-[#59665d]">{scoreBand(bounded)}</p></div></div>;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) { return <h3 className="text-[10px] font-bold uppercase tracking-[.14em] text-[#59665d]">{children}</h3>; }
function MetricTile({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#e3e1d7] bg-white p-3"><p className="text-[10px] uppercase tracking-[.08em] text-[#59665d]">{label}</p><p className="mt-1.5 break-words text-lg font-semibold text-[#203229]">{value}</p></div>; }

function QuickFixCard({ item }: { item: QuickFixItem }) {
  return <article className={`rounded-2xl border p-4 sm:p-5 ${item.complete ? 'border-[#ceddce] bg-[#f6f8f2]' : 'border-[#ead8c9] bg-[#fffaf6]'}`}><div className="flex items-start gap-3"><input type="checkbox" checked={item.complete} disabled aria-label={`${item.file_pattern}: ${item.status}`} className="mt-1 h-4 w-4 accent-[#47734f]"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-mono text-sm font-semibold text-[#203229]">{item.file_pattern}</h4><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.08em] ${item.complete ? 'bg-[#edf3e9] text-[#315d42]' : 'bg-[#f7eee7] text-[#854830]'}`}>{item.status}</span></div><p className="mt-2 text-sm leading-6 text-[#304239]">{item.instruction}</p><p className="mt-2 break-words text-[11px] leading-5 text-[#45594c]">Evidence: {item.evidence}</p><p className="mt-2 text-[10px] font-medium text-[#315d42]">Production Readiness · {item.production_readiness_component}</p></div></div></article>;
}

function SignalRow({ label, detected, detail, detectedLabel = 'Detected', missingLabel = 'Not detected', unavailableLabel = 'Unavailable' }: { label: string; detected?: boolean; detail?: string; detectedLabel?: string; missingLabel?: string; unavailableLabel?: string }) {
  const status = detected === undefined ? unavailableLabel : detected ? detectedLabel : missingLabel;
  const badgeTone = detected ? 'bg-[#edf3e9] text-[#315d42]' : 'bg-[#f1efe7] text-[#45594c]';
  return <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm text-[#304239]">{label}</p>{detail && <p className="mt-0.5 text-xs text-[#45594c]">{detail}</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${badgeTone}`}>{status}</span></div>;
}

function EvidenceRow({ component }: { component: DynamicScore['components'][number] }) {
  const bounded = Math.max(0, Math.min(100, component.score));
  return <div className="rounded-xl border border-[#e3e1d7] bg-white p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#304239]">{component.name}</p><span className={`font-mono text-xs ${tone(bounded)}`}>{bounded.toFixed(1)}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eeece3]"><div className={`h-full rounded-full bg-gradient-to-r ${barTone(bounded)}`} style={{ width: `${bounded}%` }} /></div><div className="mt-2 flex items-start justify-between gap-3"><p className="text-[11px] leading-5 text-[#45594c]">{component.evidence}</p><span className="shrink-0 font-mono text-[10px] text-[#59665d]">{(component.weight * 100).toFixed(0)}% weight</span></div></div>;
}

function FolderBar({ folder, maxLines }: { folder: RepositoryFolder; maxLines: number }) {
  const width = Math.max(folder.lines ? 3 : 0, Math.round(((folder.lines || 0) / maxLines) * 100));
  return <div className="rounded-xl border border-[#e3e1d7] bg-white p-3"><div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate font-mono text-xs text-[#304239]">{folder.path}</p><span className="shrink-0 text-[10px] text-[#45594c]">{number(folder.source_files)} source · {number(folder.lines)} lines</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eeece3]"><div className="h-full rounded-full bg-gradient-to-r from-[#47734f] to-[#bd7452]" style={{ width: `${width}%` }} /></div></div>;
}

function FileRow({ file }: { file: RepositoryFile }) {
  return <tr className="transition hover:bg-white"><td className="max-w-[300px] px-4 py-3 font-mono text-xs text-[#304239]"><span className="block truncate" title={file.path}>{file.path}</span></td><td className="px-4 py-3"><span className="rounded-md bg-[#f1efe7] px-2 py-1 text-[10px] capitalize text-[#45594c]">{file.category || 'other'}</span></td><td className="px-4 py-3 text-xs text-[#45594c]">{file.language || file.extension || '—'}</td><td className="px-4 py-3 text-right font-mono text-xs text-[#45594c]">{number(file.lines)}</td></tr>;
}

function FindingList({ title, entries, variant }: { title: string; entries: string[]; variant: 'good' | 'risk' }) {
  return <div className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-5 sm:p-6"><SectionEyebrow>{title}</SectionEyebrow><div className="mt-4 space-y-3">{entries.map((entry, index) => <div key={`${index}-${entry}`} className={`flex gap-3 rounded-xl border p-3.5 text-sm leading-6 ${variant === 'good' ? 'border-[#ceddce] bg-[#edf3e9] text-[#304239]' : 'border-[#dfd1ad] bg-[#fbf5e8] text-[#304239]'}`}><span className={`mt-0.5 shrink-0 ${variant === 'good' ? 'text-[#315d42]' : 'text-[#735017]'}`} aria-hidden="true">{variant === 'good' ? '✓' : '!'}</span><span>{entry}</span></div>)}{!entries.length && <EmptyNotice>No {variant === 'good' ? 'strengths' : 'risks'} were returned.</EmptyNotice>}</div></div>;
}

function RecommendationCard({ item }: { item: ImprovementSuggestion }) {
  const priority = item.priority?.toLowerCase() || 'unspecified';
  const priorityTone = priority === 'high' ? 'text-[#833a32] bg-[#f8ece7]' : priority === 'medium' ? 'text-[#604515] bg-[#fbf5e8]' : 'text-[#45594c] bg-[#f1efe7]';
  return <article className="rounded-xl border border-[#e3e1d7] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-[#315d42]">{item.category}</p><span className={`rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-[.1em] ${priorityTone}`}>{priority} priority</span></div><p className="mt-2 text-sm leading-6 text-[#304239]">{item.suggestion}</p><p className="mt-2 text-xs leading-5 text-[#45594c]">{item.impact}</p></article>;
}

function EmptyNotice({ children }: { children: React.ReactNode }) { return <p className="rounded-xl border border-dashed border-[#d9ddd2] bg-white px-4 py-5 text-sm text-[#45594c]">{children}</p>; }

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

function TechMark({ name, small = false }: { name: string; small?: boolean }) {
  const key = name.toLowerCase();
  const entries: Record<string, { text: string; color: string; background: string }> = {
    python: { text: 'Py', color: '#1e4b69', background: '#e8f0f5' }, javascript: { text: 'JS', color: '#695c00', background: '#fff5c5' },
    typescript: { text: 'TS', color: '#15558a', background: '#e4f1fb' }, react: { text: '⚛', color: '#087b91', background: '#e0f7fa' },
    'next.js': { text: 'N', color: '#202020', background: '#ecece9' }, fastapi: { text: 'API', color: '#17694d', background: '#e4f4ec' },
    docker: { text: 'D', color: '#0d6593', background: '#e2f3fb' }, 'tailwind css': { text: 'TW', color: '#0f7185', background: '#e2f7f5' },
    go: { text: 'Go', color: '#086b83', background: '#e1f5f8' }, rust: { text: 'Rs', color: '#6c4932', background: '#f3ece6' },
    java: { text: 'J', color: '#8a4a21', background: '#f9eee4' }, 'c#': { text: 'C#', color: '#5d4e91', background: '#eeeafd' },
  };
  const glyph = entries[key] || { text: name.split(/[ ._-]/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?', color: '#315d42', background: '#edf3e9' };
  return <span aria-label={`${name} marker`} title={name} className={`inline-flex shrink-0 items-center justify-center rounded-lg font-bold ${small ? 'h-5 w-5 text-[8px]' : 'h-10 w-10 text-xs'}`} style={{ color: glyph.color, backgroundColor: glyph.background }}>{glyph.text}</span>;
}

type TreeNode = { name: string; path: string; kind: 'folder' | 'file'; children: Map<string, TreeNode>; file?: RepositoryFile };
function makeTree(files: RepositoryFile[]) {
  const root: TreeNode = { name: '', path: '', kind: 'folder', children: new Map() };
  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let current = root;
    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;
      const path = current.path ? `${current.path}/${segment}` : segment;
      let child = current.children.get(segment);
      if (!child) {
        child = { name: segment, path, kind: isFile ? 'file' : 'folder', children: new Map(), file: isFile ? file : undefined };
        current.children.set(segment, child);
      }
      current = child;
    });
  }
  return [...root.children.values()].sort(sortTreeNodes);
}
function sortTreeNodes(a: TreeNode, b: TreeNode) { return a.kind !== b.kind ? (a.kind === 'folder' ? -1 : 1) : a.name.localeCompare(b.name); }
function TreeList({ nodes, depth }: { nodes: TreeNode[]; depth: number }) {
  return <div className="space-y-1">{nodes.map((node) => node.kind === 'folder' ? <details key={node.path} open={depth < 1} className="group"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#304239] hover:bg-[#f1efe7]" style={{ paddingLeft: `${depth * 13 + 8}px` }}><span className="text-[#315d42]">▸</span><span className="font-semibold">{node.name}/</span><span className="ml-auto text-[10px] text-[#59665d]">{countTreeFiles(node)} files</span></summary><div className="hidden group-open:block"><TreeList nodes={[...node.children.values()].sort(sortTreeNodes)} depth={depth + 1} /></div></details> : <div key={node.path} className="flex items-center gap-2 rounded-md py-1.5 pr-2 font-mono text-[11px] text-[#45594c] hover:bg-[#f7f6f0]" style={{ paddingLeft: `${depth * 13 + 28}px` }} title={node.path}><span className="text-[#a16a47]">·</span><span className="min-w-0 flex-1 truncate">{node.name}</span><span className="shrink-0 text-[9px] text-[#59665d]">{node.file?.language || node.file?.category}</span></div>)}</div>;
}
function countTreeFiles(node: TreeNode): number { return node.kind === 'file' ? 1 : [...node.children.values()].reduce((sum, child) => sum + countTreeFiles(child), 0); }
