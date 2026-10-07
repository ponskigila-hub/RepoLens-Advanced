'use client';

import { useState } from 'react';
import RepositoryFiles from '@/components/RepositoryFiles';
import HistoryTrends from '@/components/HistoryTrends';
import TechLogo from '@/components/TechLogo';
import type { AnalysisResult, DynamicScore, ProjectGuide, QuickFixItem, RepositoryFolder } from '@/types/analysis';

const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat().format(value) : 'Not measured';
type StatusTone = 'present' | 'medium' | 'low' | 'missing';
const scoreTone = (value?: number): StatusTone => value === undefined ? 'missing' : value >= 80 ? 'present' : value >= 60 ? 'medium' : 'low';
const scoreBand = (value?: number) => value === undefined ? 'Not available' : value >= 80 ? 'Strong signal' : value >= 60 ? 'Developing' : 'Needs attention';

function severityTone(value?: string): StatusTone {
  const label = (value || '').toLowerCase();
  if (/\b(critical|high|blocker|urgent)\b/.test(label)) return 'low';
  if (/\b(medium|moderate|warning)\b/.test(label)) return 'medium';
  if (/\b(low|minor|info|informational|none)\b/.test(label)) return 'present';
  return 'missing';
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5', CSS: '#563d7c', HTML: '#e34c26',
  Go: '#00add8', Rust: '#dea584', Java: '#b07219', 'C#': '#178600', 'C/C++': '#f34b7d', C: '#555555',
  'C++': '#f34b7d', Ruby: '#701516', PHP: '#4f5d95', Swift: '#f05138', Kotlin: '#a97bff', Scala: '#c22d40',
  Shell: '#89e051', SQL: '#e38c00', SCSS: '#c6538c', Vue: '#41b883', Svelte: '#ff3e00',
};

function languageColor(name: string) { return LANGUAGE_COLORS[name] || '#8b948b'; }

function languageStatistics(result: AnalysisResult) {
  const counts = new Map(Object.entries(result.metrics?.language_breakdown ?? {}));
  const bytes = new Map<string, number>();
  const fileCounts = new Map<string, number>();
  for (const file of result.files ?? []) {
    if (!['source', 'test'].includes(file.category) || !file.language || file.language === 'Other') continue;
    fileCounts.set(file.language, (fileCounts.get(file.language) ?? 0) + 1);
    const size = typeof file.size_bytes === 'number' && Number.isFinite(file.size_bytes) ? Math.max(0, file.size_bytes) : 0;
    bytes.set(file.language, (bytes.get(file.language) ?? 0) + size);
  }
  const totalBytes = [...bytes.values()].reduce((sum, size) => sum + size, 0);
  const names = new Set([...counts.keys(), ...bytes.keys()]);
  const items = [...names].map((name) => {
    const size = bytes.get(name) ?? 0;
    return { name, files: counts.get(name) ?? fileCounts.get(name) ?? 0, bytes: size, share: totalBytes > 0 ? (size / totalBytes) * 100 : null };
  }).filter((item) => item.files > 0 || item.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes || b.files - a.files || a.name.localeCompare(b.name));
  return { items, totalBytes };
}

function scoreFor(result: AnalysisResult, key: string): number | undefined {
  const value = result.scores?.[key]?.score;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (key === 'quality' && typeof result.scores?.overall_quality?.score === 'number') return result.scores.overall_quality.score;
  if (key === 'quality' && typeof result.ml_scores?.overall_quality === 'number') return result.ml_scores.overall_quality;
  const legacy = result.ml_scores?.[key as keyof NonNullable<AnalysisResult['ml_scores']>];
  return typeof legacy === 'number' ? legacy : undefined;
}

function tone(value?: number) {
  return `signal-text--${scoreTone(value)}`;
}

function compactCodeSummary(value?: string) {
  if (!value) return '';
  let summary = value;
  const directoryMarker = ' Main code directories:';
  if (summary.includes(directoryMarker)) {
    const overview = summary.split(directoryMarker, 1)[0];
    const symbolCount = summary.match(/\s+\d[\d,]* function\/class names were extracted[^.]*\./)?.[0]?.trim();
    summary = [overview, symbolCount].filter(Boolean).join(' ');
  }
  return summary.replace(/\s+Entry-point candidates:[\s\S]*$/, '').replaceAll('`', '').replace(/\s+/g, ' ').trim();
}

function Panel({ title, note, children, className = '' }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#d9ddd2] bg-[#fffefa] p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#203229]">{title}</h3>
        {note && <p className="mt-1 text-xs leading-5 text-[#59665d]">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#59665d]">{label}</p>
      <p className="mt-1.5 break-words text-lg font-semibold text-[#203229]">{value}</p>
      {detail && <p className="mt-1 text-[10px] leading-4 text-[#59665d]">{detail}</p>}
    </div>
  );
}

function ScoreTile({ label, value, note }: { label: string; value?: number; note: string }) {
  const safe = value === undefined ? undefined : Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-xl border border-[#e3e1d7] bg-[#fffefa] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div><h4 className="text-xs font-semibold text-[#304239]">{label}</h4><p className="mt-1 text-[10px] leading-4 text-[#59665d]">{note}</p></div>
        <span className={`font-mono text-lg font-semibold ${tone(safe)}`}>{safe === undefined ? '—' : safe.toFixed(1)}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eeece3]"><div className={`h-full rounded-full score-fill--${scoreTone(safe)}`} style={{ width: `${safe ?? 0}%` }} /></div>
      <p className={`mt-1.5 w-fit status-pill status-pill--${scoreTone(safe)}`}>{scoreBand(safe)}</p>
    </div>
  );
}

function QualityCircle({ value, methodology }: { value?: number; methodology: string }) {
  const safe = value === undefined ? undefined : Math.max(0, Math.min(100, value));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - (safe ?? 0) / 100);
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#d9ddd2] bg-[#f7f8f3] p-3 text-center">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 112 112" className="h-full w-full" role="img" aria-label={`Quality score ${safe === undefined ? 'not available' : `${safe.toFixed(1)} out of 100`}`}>
          <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
          <circle cx="56" cy="56" r={radius} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 56 56)" className={tone(safe)} />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-semibold tracking-tight ${tone(safe)}`}>{safe === undefined ? '—' : safe.toFixed(1)}</span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[.1em] text-[#59665d]">Quality / 100</span>
        </div>
      </div>
      <p className={`mt-1 status-pill status-pill--${scoreTone(safe)}`}>{scoreBand(safe)}</p>
      <p className="mt-1 text-[10px] text-[#59665d]">{methodology}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

export function AtAGlance({ result }: { result: AnalysisResult }) {
  const project = result.repository_overview;
  const code = result.code_overview;
  const guide = result.project_guide;
  const quality = scoreFor(result, 'quality');
  const identity = result.github_metadata;
  const owner = identity?.owner?.login || result.repository?.owner;
  const ownerUrl = identity?.owner?.html_url || (owner ? `https://github.com/${encodeURIComponent(owner)}` : undefined);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#cbd9cb] border-l-4 border-l-[#315d42] bg-[#fffefa] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#59665d]">What this project is for</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-[#203229]">{project?.name || result.repository?.full_name || 'Repository overview'}</h3></div>
          <span className={`status-pill status-pill--${project?.purpose_status === 'documented' ? 'present' : 'missing'}`}>{project?.purpose_status === 'documented' ? `Documented · ${project.summary_source || 'README'}` : 'Purpose not documented'}</span>
        </div>
        {project?.purpose ? <p className="mt-3 max-w-4xl text-sm leading-7 text-[#304239]">{project.purpose}</p> : <p className="mt-3 max-w-4xl text-sm leading-7 text-[#45594c]">No clear purpose statement was found in the README or supported manifests. RepoLens does not guess a product description from filenames alone.</p>}
        {project?.purpose_note && <p className="mt-2 text-[10px] leading-5 text-[#59665d]">{project.purpose_note}{project.evidence?.length ? ` Evidence: ${project.evidence.join(', ')}.` : ''}</p>}
      </section>

      <Panel title="What the code scan observed" note="A structural summary independent of the README's product description.">
        <p className="text-sm leading-6 text-[#304239]">{compactCodeSummary(code?.summary) || 'No supported source files were available for a code-based summary.'}</p>
        {!!code?.entrypoint_candidates?.length && <div className="mt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#59665d]">Entry-point candidates</p><div className="flex flex-wrap gap-2">{code.entrypoint_candidates.slice(0, 5).map((path) => <code key={path} className="rounded-md border border-[#d9ddd2] bg-[#faf9f4] px-2 py-1 text-[10px] text-[#304239]">{path}</code>)}</div></div>}
      </Panel>

      {!!guide?.features?.length && <Panel title="Key capabilities described by the repository" note={guide.feature_note || 'README capability statements are maintainer-provided and are shown separately from code-derived evidence.'}>
        <ul className="grid gap-2 sm:grid-cols-2">{guide.features.slice(0, 5).map((feature, index) => <li key={`${feature.source}-${index}`} className="rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3"><p className="text-xs leading-5 text-[#304239]">{feature.text}</p><p className="mt-2 font-mono text-[9px] text-[#59665d]">Source: {feature.source}</p></li>)}</ul>
      </Panel>}

      <Panel title="Repository health" note="Measured static signals. These scores do not represent a runtime test or a security certification.">
        <div className="grid gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
          <QualityCircle value={quality} methodology={result.score_methodology?.version || result.ml_scores?.model_used || 'static score'} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <ScoreTile label="Maintainability" value={scoreFor(result, 'maintainability')} note="Changeability signals" />
            <ScoreTile label="Scalability" value={scoreFor(result, 'scalability')} note="Structure and growth" />
            <ScoreTile label="Architecture" value={scoreFor(result, 'architecture')} note="Organization signals" />
            <ScoreTile label="Production readiness" value={scoreFor(result, 'production_readiness')} note="Delivery artifacts" />
          </div>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-[#59665d]">Every score is computed from scanned evidence. Missing measurements remain unavailable rather than receiving a fixed fallback.</p>
      </Panel>

      <Panel title="GitHub identity" note="Best-effort metadata from the public GitHub API; it does not affect scores.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Owner" value={owner || 'Not available'} detail={identity?.owner?.type || 'GitHub account'} />
          <Stat label="Created" value={formatDate(identity?.created_at)} detail="GitHub repository metadata" />
          <Stat label="Visible contributors" value={`${number(identity?.contributors?.length ?? 0)}${identity?.contributors_truncated ? '+' : ''}`} detail={identity?.contributors_status === 'none_reported' ? 'None returned by API' : identity?.contributors_status || 'Not available'} />
        </div>
        {owner && ownerUrl && <a href={ownerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#315d42] underline underline-offset-2">View owner on GitHub ↗</a>}
        {!!identity?.contributors?.length && <details className="mt-3 rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3"><summary className="cursor-pointer text-xs font-semibold text-[#304239]">View contributors ({identity.contributors.length}{identity.contributors_truncated ? '+' : ''})</summary><div className="mt-3 flex flex-wrap gap-2">{identity.contributors.map((person) => <a key={person.login} href={person.html_url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d9ddd2] bg-[#fffefa] px-2.5 py-1.5 text-xs text-[#304239]">{person.login}{person.contributions != null ? ` · ${number(person.contributions)} commits` : ''}</a>)}</div></details>}
        {identity?.note && <p className="mt-2 text-[10px] leading-5 text-[#59665d]">{identity.note}</p>}
      </Panel>

    </div>
  );
}

export function StackSection({ result }: { result: AnalysisResult }) {
  const guide = result.project_guide;
  const { items: languages, totalBytes: totalLanguageBytes } = languageStatistics(result);
  const versions = new Map((guide?.language_versions ?? []).map((item) => [item.name.toLowerCase(), item.version]));
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const displayedLanguages = showAllLanguages ? languages : languages.slice(0, 8);
  return (
    <div className="space-y-4">
      <Panel title="Languages and frameworks" note="GitHub-style language share is estimated from scanned source/test bytes; counts are files in the bounded inventory.">
        {languages.length ? <div>
          {totalLanguageBytes > 0 ? <div role="img" aria-label="Language distribution by scanned source and test byte size" className="mb-3 flex h-3 overflow-hidden rounded-full bg-[#eeece3]">
            {languages.map((language) => <span key={language.name} title={`${language.name}: ${language.share?.toFixed(1)}%`} style={{ width: `${language.share ?? 0}%`, backgroundColor: languageColor(language.name) }} />)}
          </div> : <p className="mb-3 text-[10px] text-[#59665d]">Byte share unavailable for this snapshot; file counts are shown instead.</p>}
          <div className="flex flex-wrap gap-2.5">
            {displayedLanguages.map((language) => {
              const version = versions.get(language.name.toLowerCase());
              return <div key={language.name} className="inline-flex items-center gap-2 rounded-xl border border-[#e3e1d7] bg-[#faf9f4] px-2.5 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: languageColor(language.name) }} aria-hidden="true" />
                <TechLogo name={language.name} />
                <div><p className="text-xs font-semibold text-[#203229]">{language.name}</p><p className="text-[10px] text-[#59665d]">{language.share === null ? 'Share n/a' : `${language.share.toFixed(1)}%`} · {number(language.files)} files{version ? ` · ${version}` : ''}</p></div>
              </div>;
            })}
            {languages.length > 8 && <button type="button" onClick={() => setShowAllLanguages((value) => !value)} className="rounded-lg border border-[#d9ddd2] bg-[#fffefa] px-3 py-2 text-xs font-semibold text-[#315d42]">{showAllLanguages ? 'Show fewer' : `Show all ${languages.length} languages`}</button>}
          </div>
        </div> : <p className="text-sm text-[#59665d]">No recognized source languages were found in the scanned files.</p>}
        <p className="mt-3 text-[10px] leading-4 text-[#59665d]">Shares are based on scanned source and test file sizes, not GitHub Linguist's exact repository statistics.</p>
      </Panel>
      <details className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-[#203229]">Setup, versions, environment, frameworks, and dependencies</summary>
        <div className="mt-4"><GettingStartedSection result={result} /></div>
      </details>
    </div>
  );
}

export function ArchitectureSection({ result }: { result: AnalysisResult }) {
  const code = result.code_overview;
  const folders = (result.folder_breakdown ?? []).slice().sort((a, b) => b.source_files - a.source_files || b.lines - a.lines);
  const stages = [
    ['Repository URL', 'Public GitHub input'],
    ['Depth-1 snapshot', 'Bounded file tree'],
    ['Static scan', 'Paths, manifests, AST/patterns'],
    ['Evidence model', 'Metrics and score weights'],
    ['Report UI', 'Summary, maps, fixes'],
  ];
  return (
    <div className="space-y-4">
      <Panel title="Architecture and request flow" note="This depicts RepoLens' analysis pipeline. The target repository's runtime call flow is not inferred or executed.">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {stages.map(([title, text], index) => <div key={title} className="relative rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3">
            <span className="font-mono text-[10px] font-bold text-[#315d42]">0{index + 1}</span><p className="mt-2 text-xs font-semibold text-[#203229]">{title}</p><p className="mt-1 text-[10px] leading-4 text-[#59665d]">{text}</p>
            {index < stages.length - 1 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-[#fffefa] px-1 text-[#315d42] xl:block" aria-hidden="true">→</span>}
          </div>)}
        </div>
        <p className="mt-3 text-xs leading-5 text-[#59665d]">The analysis flow is grounded in RepoLens behavior; repository entry-point names and folder roles below are static candidates, not verified execution paths.</p>
      </Panel>

      <Panel title="Code-first map" note={code?.limitations || 'Folder names and file paths are structural hints only.'}>
          {code?.summary && <p className="mb-4 text-sm leading-6 text-[#304239]">{compactCodeSummary(code.summary)}</p>}
          {!!code?.entrypoint_candidates?.length && <div className="mb-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#59665d]">Entry-point candidates</p><div className="flex flex-wrap gap-2">{code.entrypoint_candidates.slice(0, 20).map((path) => <code key={path} className="rounded-md border border-[#d9ddd2] bg-[#faf9f4] px-2 py-1.5 text-[10px] text-[#304239]">{path}</code>)}</div></div>}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {folders.slice(0, 18).map((folder) => <FolderCard key={folder.path} folder={folder} />)}
            {!folders.length && <p className="text-sm text-[#59665d]">No folder aggregates were returned.</p>}
          </div>
      </Panel>
      <Panel title="Function and class names" note={code?.symbols.method || 'Static symbol extraction is available only for supported languages.'}>
          <p className="mb-3 text-xs text-[#59665d]">{number(code?.symbols.count)} names from {number(code?.symbols.parsed_files)} parsed source files; the symbol list is bounded.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(code?.symbols.items ?? []).slice(0, 24).map((item, index) => <div key={`${item.path}-${item.line}-${item.name}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#e3e1d7] bg-[#faf9f4] px-3 py-2">
              <span className="rounded bg-[#edf3e9] px-1.5 py-1 text-[9px] font-bold uppercase text-[#315d42]">{item.kind}</span><span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-[#203229]">{item.name}</span><span className="max-w-[45%] truncate font-mono text-[9px] text-[#59665d]" title={`${item.path}:${item.line}`}>{item.path}:{item.line}</span>
            </div>)}
            {!(code?.symbols.items?.length) && <p className="text-sm text-[#59665d]">No supported function/class names were extracted.</p>}
          </div>
          {code?.symbols.truncated && <p className="mt-3 text-right text-[10px] text-[#59665d]">Showing a bounded sample; the scanner limit is {number(code.symbols.sample_limit)} names.</p>}
      </Panel>
    </div>
  );
}

export function FilesSection({ result }: { result: AnalysisResult }) {
  const files = result.files ?? [];
  const total = result.file_breakdown?.total ?? result.metrics?.files?.total ?? files.length;
  return <RepositoryFiles repositoryUrl={result.repository?.url} files={files} totalFiles={total} sampleLimit={result.file_breakdown?.sample_limit} warnings={result.insights?.scan_warnings ?? []} />;
}

function FolderCard({ folder }: { folder: RepositoryFolder }) {
  return <div className="rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3">
    <p className="truncate font-mono text-xs font-semibold text-[#203229]" title={folder.path}>{folder.path || '.'}{folder.path === '.' ? '' : '/'}</p>
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#59665d]"><span>{number(folder.source_files)} source files</span><span>{number(folder.file_count)} total</span><span>{number(folder.lines)} lines</span></div>
  </div>;
}

export function GettingStartedSection({ result }: { result: AnalysisResult }) {
  const guide: ProjectGuide | undefined = result.project_guide;
  const commands = guide?.commands ?? [];
  const versions = guide?.language_versions ?? [];
  const deps = guide?.direct_dependencies ?? [];
  const envVars = guide?.environment_variables ?? [];
  const frameworks = result.technology_stack?.frameworks ?? [];
  const manifests = result.metrics?.dependencies?.manifests ?? [];
  return (
    <div className="space-y-4">
      <Panel title="Run commands found" note="Commands are copied from README code blocks or formed from declared package scripts/manifests. Check each source before running it.">
        {commands.length ? <div className="space-y-2">{commands.map((item, index) => <div key={`${item.source}-${item.command}-${index}`} className="grid gap-2 rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3 sm:grid-cols-[150px_minmax(0,1fr)]">
          <div><p className="text-xs font-semibold text-[#304239]">{item.title}</p><p className="mt-1 truncate font-mono text-[10px] text-[#59665d]" title={item.source}>{item.source}</p></div>
          <div><code className="block overflow-x-auto rounded-lg bg-[#111a15] px-3 py-2 text-xs text-[#e5eee7]">{item.command}</code>{item.declared_command && <p className="mt-1 text-[10px] text-[#59665d]">Declared script: <code>{item.declared_command}</code></p>}</div>
        </div>)}</div> : <div className="rounded-xl border border-dashed border-[#d9ddd2] bg-[#faf9f4] p-4 text-sm leading-6 text-[#45594c]">No dependable install/run commands were found in recognized documentation or package scripts. Review the repository README and manifest files before running it.</div>}
        {!!guide?.scripts?.length && <details className="mt-3 rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3"><summary className="cursor-pointer text-xs font-semibold text-[#304239]">View declared package scripts ({guide.scripts.length})</summary><div className="mt-3 flex flex-wrap gap-2">{guide.scripts.map((script) => <span key={`${script.source}-${script.name}`} className="rounded-md border border-[#d9ddd2] bg-[#fffefa] px-2.5 py-1.5 text-[10px] text-[#304239]"><code>{script.command}</code> · {script.declared_command}</span>)}</div></details>}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Language and runtime versions" note="Only explicit version declarations are shown; an absent version is not inferred.">
          {versions.length ? <div className="space-y-2">{versions.map((item) => <div key={`${item.name}-${item.source}`} className="flex items-center gap-3 rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3"><TechLogo name={item.name.replace(' edition', '')} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-xs font-semibold text-[#203229]">{item.name}</p><code className="text-xs text-[#315d42]">{item.version}</code></div><p className="mt-1 truncate font-mono text-[10px] text-[#59665d]">{item.source}</p></div></div>)}</div> : <p className="text-sm text-[#59665d]">No explicit language/runtime version file or manifest constraint was found.</p>}
        </Panel>
        <Panel title="Environment configuration" note={guide?.environment_note || 'Values are never returned; only names from example templates are listed.'}>
          {envVars.length ? <><p className="mb-2 text-xs text-[#45594c]">Found in example templates:</p><div className="flex flex-wrap gap-2">{envVars.map((item) => <code key={`${item.source}-${item.name}`} title={item.source} className="rounded-md border border-[#d9ddd2] bg-[#faf9f4] px-2 py-1.5 text-[10px] text-[#304239]">{item.name}</code>)}</div><p className="mt-3 text-[10px] text-[#59665d]">Sources: {Array.from(new Set(envVars.map((item) => item.source))).join(', ')}</p></> : <p className="text-sm text-[#59665d]">No `.env.example`, `.env.sample`, or `example.env` template was detected. Required settings need maintainer confirmation.</p>}
        </Panel>
      </div>

      <Panel title="Frameworks, tools, and dependencies" note="Direct declarations from the detected manifests; packages may not all be imported or active at runtime.">
        {!!frameworks.length && <div className="mb-4 flex flex-wrap gap-2">{frameworks.map((item) => <span key={item.name} title={item.evidence.map((evidence) => evidence.manifest).join(', ')} className="inline-flex items-center gap-2 rounded-lg border border-[#d9ddd2] bg-[#faf9f4] px-2.5 py-1.5 text-xs text-[#304239]"><TechLogo name={item.name} small />{item.name}</span>)}</div>}
        {deps.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{deps.slice(0, 18).map((item) => <div key={`${item.manifest}-${item.name}`} className="rounded-lg border border-[#e3e1d7] bg-[#faf9f4] px-3 py-2"><div className="flex items-center justify-between gap-2"><code className="truncate text-xs font-semibold text-[#203229]">{item.name}</code><code className="shrink-0 text-[10px] text-[#315d42]">{item.version}</code></div><p className="mt-1 truncate font-mono text-[9px] text-[#59665d]" title={`${item.manifest} · ${item.section}`}>{item.manifest} · {item.section}</p></div>)}</div> : <p className="text-sm text-[#59665d]">No direct dependency versions could be extracted.</p>}
        {deps.length > 18 && <p className="mt-2 text-right text-[10px] text-[#59665d]">Showing 18 of {number(deps.length)} parsed entries.</p>}
        <div className="mt-4 border-t border-[#e3e1d7] pt-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#59665d]">Dependency manifests</p><p className="mt-2 break-words font-mono text-[10px] text-[#45594c]">{manifests.length ? manifests.join(' · ') : 'No supported dependency manifest detected.'}</p></div>
      </Panel>
    </div>
  );
}

export function QuickFixesSection({ result }: { result: AnalysisResult }) {
  const checklist = result.quick_fix_checklist;
  return (
    <Panel title="Production readiness quick fixes" note={checklist?.note || 'Presence checks only; these are not a quality or safety certification.'}>
      <div className="mb-3 flex items-baseline justify-between gap-3"><p className="text-xs text-[#45594c]">Missing root files and delivery signals</p><span className="status-pill status-pill--present">{number(checklist?.completed ?? 0)} / {number(checklist?.total ?? 0)} present</span></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(checklist?.items ?? []).map((item: QuickFixItem) => <article key={item.id} className={`status-card status-card--${item.complete ? 'present' : 'missing'} rounded-xl border p-3`}>
          <div className="flex items-start gap-2.5"><input type="checkbox" checked={item.complete} readOnly aria-label={`${item.file_pattern}: ${item.status}`} className="mt-1 h-4 w-4 accent-[#47734f]" /><div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-mono text-xs font-semibold text-[#203229]">{item.file_pattern}</h4><span className={`status-pill status-pill--${item.complete ? 'present' : 'missing'}`}>{item.status}</span></div><p className="mt-2 text-xs leading-5 text-[#304239]">{item.instruction}</p><p className="mt-1 text-[10px] leading-4 text-[#59665d]">{item.evidence}</p></div></div>
        </article>)}
        {!checklist?.items?.length && <p className="text-sm text-[#59665d]">No checklist data was returned.</p>}
      </div>
    </Panel>
  );
}

export function HotspotsAndFixes({ result }: { result: AnalysisResult }) {
  const metrics = result.metrics;
  const ast = metrics?.ast;
  const maintenance = metrics?.maintenance_signals;
  const largeFiles = maintenance?.large_source_files_over_500_lines ?? [];
  const qualityComponents = result.scores?.quality?.components ?? result.scores?.overall_quality?.components ?? [];
  const otherScoreComponents = ['maintainability', 'scalability', 'architecture', 'production_readiness']
    .flatMap((key) => (result.scores?.[key]?.components ?? []).map((component) => ({ ...component, scorecard: key })));
  const issues = [
    ...(result.code_quality_analysis ?? []).map((item) => ({ title: item.type, severity: item.severity, description: item.description, action: item.suggestion })),
    ...(result.security_analysis ?? []).map((item) => ({ title: item.type, severity: item.severity, description: item.description, action: item.recommendation })),
    ...(result.performance_analysis ?? []).map((item) => ({ title: item.type, severity: item.impact, description: item.description, action: item.solution })),
  ];
  const recommendations = result.insights?.recommendations ?? result.improvement_suggestions ?? [];
  return (
    <div className="space-y-4">
      <HistoryTrends repositoryUrl={result.repository?.url} />
      <Panel title="Measured engineering signals" note={ast?.complexity_method || 'Metrics summarize the bounded static scan; runtime performance is not measured.'}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat label="Files" value={number(metrics?.files?.total)} />
          <Stat label="Source files" value={number(metrics?.files?.source)} />
          <Stat label="Source + test LOC" value={number(metrics?.lines?.source_and_tests)} />
          <Stat label="Functions" value={number(ast?.functions)} />
          <Stat label="Classes" value={number(ast?.classes)} />
          <Stat label="Avg. complexity" value={typeof ast?.average_cyclomatic_complexity === 'number' ? ast.average_cyclomatic_complexity.toFixed(2) : 'Not measured'} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Stat label="Highest complexity" value={number(ast?.maximum_cyclomatic_complexity)} />
          <Stat label="Test files" value={number(metrics?.tests?.files)} detail={metrics?.tests?.coverage_is_measured ? `${metrics.tests.coverage_percent}% measured coverage` : 'Coverage not measured'} />
          <Stat label="Dependencies" value={number(metrics?.dependencies?.count)} detail={`${number(metrics?.dependencies?.lockfiles?.length)} lockfiles`} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Large source files" note="Files over 500 lines are listed as review candidates, not proven defects.">
          {largeFiles.length ? <div className="space-y-2">{largeFiles.slice(0, 10).map((item) => <div key={item.path} className="flex items-center justify-between gap-3 rounded-lg border border-[#e3e1d7] bg-[#faf9f4] px-3 py-2.5"><code className="min-w-0 truncate text-xs text-[#304239]" title={item.path}>{item.path}</code><span className="status-pill status-pill--medium shrink-0 font-mono">{number(item.lines)} lines</span></div>)}</div> : <p className="text-sm text-[#59665d]">No scanned source file exceeded 500 lines.</p>}
        </Panel>
        <Panel title="Highest measured score factors" note="Weights and evidence explain how the dynamic static scores were formed.">
          {qualityComponents.length ? <div className="space-y-2">{qualityComponents.slice(0, 5).map((item) => <div key={item.name} className="rounded-lg border border-[#e3e1d7] bg-[#faf9f4] p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#304239]">{item.name}</p><span className={`font-mono text-xs ${tone(item.score)}`}>{item.score.toFixed(1)} · {(item.weight * 100).toFixed(0)}%</span></div><p className="mt-1 text-[10px] leading-5 text-[#59665d]">{item.evidence}</p></div>)}</div> : <p className="text-sm text-[#59665d]">No score components were returned.</p>}
          {!!otherScoreComponents.length && <details className="mt-3 rounded-lg border border-[#e3e1d7] bg-[#faf9f4] p-3"><summary className="cursor-pointer text-xs font-semibold text-[#304239]">View component evidence for other scorecards</summary><div className="mt-3 space-y-2">{otherScoreComponents.map((item, index) => <div key={`${item.scorecard}-${item.name}-${index}`} className="border-t border-[#e3e1d7] pt-2"><p className="text-[10px] font-semibold text-[#304239]">{item.scorecard} · {item.name} · {(item.weight * 100).toFixed(0)}%</p><p className="mt-1 text-[10px] leading-4 text-[#59665d]">{item.evidence}</p></div>)}</div></details>}
        </Panel>
      </div>

      {!!issues.length && <Panel title="Findings to review" note="Pattern-based findings are signals for manual review, not confirmed defects.">
        <div className="space-y-2">{issues.slice(0, 12).map((item, index) => <article key={`${item.title}-${index}`} className={`status-card status-card--${severityTone(item.severity)} rounded-xl border p-3`}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold text-[#304239]">{item.title}</h4><span className={`status-pill status-pill--${severityTone(item.severity)}`}>{item.severity}</span></div><p className="mt-2 text-xs leading-5 text-[#45594c]">{item.description}</p>{item.action && <p className="mt-1 text-xs leading-5 text-[#304239]">Next step: {item.action}</p>}</article>)}</div>
      </Panel>}
      {!!recommendations.length && <Panel title="Recommended next steps">
        <div className="grid gap-2 sm:grid-cols-2">{recommendations.slice(0, 8).map((item, index) => <article key={`${item.category}-${index}`} className="rounded-xl border border-[#e3e1d7] bg-[#faf9f4] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-[#315d42]">{item.category}</p><span className={`status-pill status-pill--${severityTone(item.priority)}`}>{item.priority}</span></div><p className="mt-2 text-xs leading-5 text-[#304239]">{item.suggestion}</p><p className="mt-1 text-[10px] leading-4 text-[#59665d]">{item.impact}</p></article>)}</div>
      </Panel>}
      {!!result.insights?.scan_warnings?.length && <Panel title="Scan limitations"><ul className="space-y-1 text-xs leading-5 text-[#604515]">{result.insights.scan_warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></Panel>}
    </div>
  );
}

function HowItWorks({ result }: { result: AnalysisResult }) {
  const steps = [
    ['Validate and fetch', 'The API accepts a public HTTPS GitHub repository URL, uses a shallow depth-1 clone, and requests owner, creation date, and visible contributors separately. GitHub metadata is best-effort.'],
    ['Build a bounded inventory', 'RepoLens indexes at most 12,000 paths, ignores generated/vendor directories, skips symlinks, and reads up to 24 MiB of text. It identifies file types, language counts, folder aggregates, manifests, tests, CI, Docker, and readiness artifacts.'],
    ['Read code structure', 'Python source is parsed with AST for declarations and complexity signals. JavaScript, TypeScript, Go, and Rust symbols/branches use syntax patterns. Source execution, dependency installation, and target-project tests are never performed.'],
    ['Keep documentation and code distinct', 'README or manifest purpose text is shown with provenance. A code-first synopsis uses paths, symbol names, entry-point candidates, and direct manifest declarations; it does not invent business purpose or prove runtime call flow.'],
    ['Calculate and explain scores', `The ${result.score_methodology?.version || 'static'} scorecards are weighted transformations of observed metrics and artifacts. Missing evidence is shown as unavailable or zero-contribution; an optional LLM narrative is separate and cannot change the measured scores.`],
    ['Render, share, and preview selectively', 'The API returns a structured JSON report. Saving explicitly stores a public-unlisted SQLite snapshot without source contents; PDF uses the browser print dialog. Selecting a file triggers a separate bounded text fetch with secret-shaped assignment redaction. The Findings section can separately load GitHub weekly commit activity and a small, caveated recent-patch complexity trend.'],
  ];
  return (
    <details open className="rounded-2xl border border-[#d9ddd2] bg-[#faf9f4] p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-semibold text-[#203229]">How RepoLens works — detailed data flow</summary>
      <p className="mt-2 text-xs leading-5 text-[#59665d]">This opens the full analysis pipeline, including the checks and safety boundaries behind the report.</p>
      <ol className="mt-4 space-y-2.5">{steps.map(([title, description], index) => <li key={title} className="flex gap-3 rounded-xl border border-[#e3e1d7] bg-[#fffefa] p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf3e9] text-[10px] font-bold text-[#315d42]">{index + 1}</span><div><h4 className="text-xs font-semibold text-[#203229]">{title}</h4><p className="mt-1 text-[10px] leading-5 text-[#45594c]">{description}</p></div></li>)}</ol>
      <p className="mt-3 text-[10px] leading-5 text-[#59665d]">Method note: {result.score_methodology?.method || 'The score method was not included in this snapshot.'} {result.score_methodology?.coverage_note || ''}</p>
    </details>
  );
}

export function HowItWorksSection({ result }: { result: AnalysisResult }) {
  return <HowItWorks result={result} />;
}
