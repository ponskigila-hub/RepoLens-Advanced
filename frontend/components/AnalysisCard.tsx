'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';
import type { AnalysisResult, SavedReport } from '@/types/analysis';
import { AtAGlance, ArchitectureSection, FilesSection, HowItWorksSection, HotspotsAndFixes, QuickFixesSection, StackSection } from '@/components/ReportSections';

type Tab = 'overview' | 'code-map' | 'stack' | 'files' | 'quick-fixes' | 'findings' | 'how-it-works';
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'code-map', label: 'Code map' },
  { id: 'stack', label: 'Stack' },
  { id: 'files', label: 'Files' },
  { id: 'quick-fixes', label: 'Quick fixes' },
  { id: 'findings', label: 'Findings' },
  { id: 'how-it-works', label: 'How it works' },
];
const formatNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat().format(value) : 'Not measured';

export default function AnalysisCard({ result, allowSave = true }: { result: AnalysisResult; allowSave?: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);
  const [shareLinks, setShareLinks] = useState<{ report: string; badge: string; markdown: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

  if (!result.success) {
    return <div role="alert" className="rounded-2xl border border-[#e8c9bd] bg-[#f8ece7] p-5 text-sm text-[#833a32]">{result.error || 'Analysis could not be completed.'}</div>;
  }

  const repository = result.repository;
  const fullName = repository?.full_name || result.repo_info?.name || 'Repository';
  const fileTotal = result.file_breakdown?.total ?? result.metrics?.files?.total ?? result.files?.length ?? 0;

  const toggleLanguage = (language: string) => {
    setSelectedLanguages((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language]);
  };
  const toggleDependencies = (packages: string[]) => {
    const unique = [...new Set(packages.filter(Boolean))];
    setSelectedDependencies((current) => unique.every((name) => current.includes(name))
      ? current.filter((name) => !unique.includes(name))
      : [...new Set([...current, ...unique])]);
  };

  const saveAndShare = async () => {
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
    <section id="analysis-report" className="analysis-report surface-paper-gradient overflow-hidden rounded-[24px] border border-[#d9ddd2] bg-[#fffefa] shadow-[0_24px_72px_rgba(32,50,41,.11)]">
      <header className="flex flex-col gap-4 border-b border-[#e3e1d7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#315d42]">Repository report</p>
          <h2 className="mt-1 truncate text-xl font-semibold text-[#203229] sm:text-2xl">{fullName}</h2>
          <p className="mt-1 text-xs text-[#59665d]">{formatNumber(fileTotal)} scanned paths · depth-{formatNumber(repository?.clone_depth)} snapshot · code not executed</p>
        </div>
        <div className="print-hide flex flex-wrap items-center gap-2">
          {repository?.url && <a href={repository.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d9ddd2] bg-[#fffefa] px-3 py-2 text-xs font-medium text-[#45594c] transition hover:border-[#9fbea1]">Open on GitHub ↗</a>}
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-[#d9ddd2] bg-[#fffefa] px-3 py-2 text-xs font-semibold text-[#304239] transition hover:border-[#9fbea1]">Save PDF</button>
          {allowSave && <button type="button" disabled={saving || !!savedReport} onClick={() => void saveAndShare()} className="rounded-lg bg-[#315d42] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#274c35] disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving…' : savedReport ? 'Saved & shared' : 'Save & share'}</button>}
        </div>
      </header>

      {shareLinks && savedReport && <div className="print-hide border-b border-[#e3e1d7] bg-[#f6f8f2] px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-[#203229]">Shareable snapshot saved</h3><p className="mt-1 text-xs text-[#45594c]">Public, unlisted link. The saved report contains metrics and paths, not source contents.</p></div><span className="text-[10px] text-[#59665d]">{new Date(savedReport.created_at).toLocaleString()}</span></div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <CopyField label="Report link" value={shareLinks.report} copied={copied === 'report'} onCopy={() => void copyValue('report', shareLinks.report)} />
          <CopyField label="README badge Markdown" value={shareLinks.markdown} copied={copied === 'badge'} onCopy={() => void copyValue('badge', shareLinks.markdown)} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3"><img src={shareLinks.badge} alt={`RepoLens score badge for ${fullName}`} width="250" height="32"/><a href={shareLinks.report} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#315d42] underline underline-offset-2">Open saved report ↗</a></div>
        {shareError && <p role="alert" className="mt-2 text-xs text-[#833a32]">{shareError}</p>}
      </div>}
      {shareError && !shareLinks && <p role="alert" className="print-hide border-b border-[#e8c9bd] bg-[#f8ece7] px-5 py-3 text-xs text-[#833a32]">{shareError}</p>}

      <div className="grid gap-4 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:grid-cols-[10.5rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="min-w-0 lg:pt-1">
          <p className="mb-2 hidden px-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#59665d] lg:block">Report sections</p>
          <nav aria-label="Report sections" role="tablist" className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`report-nav-button flex min-h-11 shrink-0 items-center rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition lg:w-full ${activeTab === tab.id ? 'report-nav-active' : 'report-nav-idle'}`}>
              <span>{tab.label}</span>
            </button>)}
          </nav>
          <div className="surface-paper-gradient mt-4 hidden rounded-xl border border-[#d9ddd2] p-3 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#304239]">Scan scope</p>
            <p className="mt-1 text-[10px] leading-4 text-[#59665d]">Depth-{formatNumber(repository?.clone_depth)} snapshot. Repository code is inspected statically and never executed.</p>
          </div>
        </aside>

        <div key={activeTab} role="tabpanel" aria-label={tabs.find((tab) => tab.id === activeTab)?.label} className="report-panel-enter min-w-0">
          {activeTab === 'overview' && <AtAGlance result={result} />}
          {activeTab === 'code-map' && <ArchitectureSection result={result} selectedLanguages={selectedLanguages} onToggleLanguage={toggleLanguage} onViewFiles={() => setActiveTab('files')} />}
          {activeTab === 'stack' && <StackSection result={result} selectedLanguages={selectedLanguages} onToggleLanguage={toggleLanguage} selectedDependencies={selectedDependencies} onToggleDependencies={toggleDependencies} onViewFiles={() => setActiveTab('files')} />}
          {activeTab === 'files' && <FilesSection result={result} selectedLanguages={selectedLanguages} selectedDependencies={selectedDependencies} onToggleLanguage={toggleLanguage} onToggleDependency={(dependency) => toggleDependencies([dependency])} />}
          {activeTab === 'quick-fixes' && <QuickFixesSection result={result} />}
          {activeTab === 'findings' && <HotspotsAndFixes result={result} />}
          {activeTab === 'how-it-works' && <HowItWorksSection result={result} />}
        </div>
      </div>

      <footer className="border-t border-[#e3e1d7] px-5 py-3 text-[10px] leading-5 text-[#59665d] sm:px-7">
        Scoring: {result.score_methodology?.version || result.ml_scores?.model_used || 'static analysis'} · {result.score_methodology?.method || 'evidence-based repository signals'} · Source text is fetched only on request and is not included in saved snapshots.
      </footer>
    </section>
  );
}

function CopyField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return <div className="min-w-0"><label className="text-[10px] font-bold uppercase tracking-[.1em] text-[#59665d]">{label}</label><div className="mt-1 flex gap-2"><input readOnly value={value} className="min-w-0 flex-1 rounded-lg border border-[#d9ddd2] bg-[#fffefa] px-3 py-2 font-mono text-[10px] text-[#304239]"/><button type="button" onClick={onCopy} aria-live="polite" className={`copy-feedback-button relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-lg border px-3 py-2 text-[10px] font-semibold ${copied ? 'copy-feedback-button--success' : ''}`}><span className="copy-feedback-icon" aria-hidden="true">{copied ? '✓' : '⧉'}</span><span>{copied ? 'Copied!' : 'Copy'}</span></button></div></div>;
}
