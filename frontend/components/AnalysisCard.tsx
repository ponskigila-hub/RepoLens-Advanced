'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';
import type { AnalysisResult, SavedReport } from '@/types/analysis';
import { AtAGlance, ArchitectureSection, GettingStartedSection, HotspotsAndFixes } from '@/components/ReportSections';

type Tab = 'glance' | 'architecture' | 'getting-started' | 'hotspots';
const tabs: Array<{ id: Tab; label: string; description: string }> = [
  { id: 'glance', label: 'At a Glance', description: 'Purpose, stack, and health' },
  { id: 'architecture', label: 'Architecture & Flow', description: 'Folders, entry points, and files' },
  { id: 'getting-started', label: 'Getting Started', description: 'Commands, versions, and config' },
  { id: 'hotspots', label: 'Hotspots & Fixes', description: 'Metrics, checklist, and findings' },
];
const formatNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat().format(value) : 'Not measured';

export default function AnalysisCard({ result, allowSave = true }: { result: AnalysisResult; allowSave?: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('glance');
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);
  const [shareLinks, setShareLinks] = useState<{ report: string; badge: string; markdown: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (!result.success) {
    return <div role="alert" className="rounded-2xl border border-[#e8c9bd] bg-[#f8ece7] p-5 text-sm text-[#833a32]">{result.error || 'Analysis could not be completed.'}</div>;
  }

  const repository = result.repository;
  const fullName = repository?.full_name || result.repo_info?.name || 'Repository';
  const fileTotal = result.file_breakdown?.total ?? result.metrics?.files?.total ?? result.files?.length ?? 0;

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

      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <nav aria-label="Report sections" role="tablist" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-0 rounded-xl border px-3 py-3 text-left transition ${activeTab === tab.id ? 'active-forest-gradient border-[#315d42] text-white shadow-sm' : 'border-[#d9ddd2] bg-[#faf9f4] text-[#304239] hover:border-[#9fbea1] hover:bg-[#f3f7f1]'}`}>
            <span className="block text-xs font-semibold">{tab.label}</span><span className={`mt-1 hidden text-[10px] leading-4 sm:block ${activeTab === tab.id ? 'text-white/80' : 'text-[#59665d]'}`}>{tab.description}</span>
          </button>)}
        </nav>
      </div>

      <div role="tabpanel" aria-label={tabs.find((tab) => tab.id === activeTab)?.label} className="min-w-0 p-4 sm:p-6">
        {activeTab === 'glance' && <AtAGlance result={result} />}
        {activeTab === 'architecture' && <ArchitectureSection result={result} />}
        {activeTab === 'getting-started' && <GettingStartedSection result={result} />}
        {activeTab === 'hotspots' && <HotspotsAndFixes result={result} />}
      </div>

      <footer className="border-t border-[#e3e1d7] px-5 py-3 text-[10px] leading-5 text-[#59665d] sm:px-7">
        Scoring: {result.score_methodology?.version || result.ml_scores?.model_used || 'static analysis'} · {result.score_methodology?.method || 'evidence-based repository signals'} · Source text is fetched only on request and is not included in saved snapshots.
      </footer>
    </section>
  );
}

function CopyField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return <div className="min-w-0"><label className="text-[10px] font-bold uppercase tracking-[.1em] text-[#59665d]">{label}</label><div className="mt-1 flex gap-2"><input readOnly value={value} className="min-w-0 flex-1 rounded-lg border border-[#d9ddd2] bg-[#fffefa] px-3 py-2 font-mono text-[10px] text-[#304239]"/><button type="button" onClick={onCopy} className="shrink-0 rounded-lg border border-[#c5d8c5] px-3 py-2 text-[10px] font-semibold text-[#315d42]">{copied ? 'Copied' : 'Copy'}</button></div></div>;
}
