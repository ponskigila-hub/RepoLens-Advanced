'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AnalysisCard from '@/components/AnalysisCard';
import RepoLensMark from '@/components/RepoLensMark';
import ThemeToggle from '@/components/ThemeToggle';
import { apiService } from '@/services/api';
import type { PublicReport } from '@/types/analysis';

export default function PublicReportPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;
  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiService.getReport(reportId).then((value) => {
      if (active) setReport(value);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'The report could not be loaded.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reportId]);

  return <main className="min-h-screen bg-[#f4f1e8] px-4 py-6 text-[#203229] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-[1440px]">
      <header className="print-hide mb-6 flex flex-wrap items-center justify-between gap-4">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#203229]"><RepoLensMark className="h-9 w-9" /> RepoLens <span className="text-[#47734f]">AI</span></a>
        <div className="flex flex-wrap items-center gap-2"><ThemeToggle /><a href="/" className="rounded-lg border border-[#d8ddd2] bg-[#fffefa] px-3 py-2 text-xs font-medium text-[#45594c] hover:border-[#9fbea1]">Analyze another repository</a></div>
      </header>
      <div className="mb-5 rounded-2xl border border-[#d8ddd2] bg-[#fffefa] p-4 text-xs leading-5 text-[#59665d] print-hide">
        <strong className="text-[#304239]">Public, unlisted report.</strong> Anyone with this link can view this saved analysis snapshot. It contains repository metadata and static metrics, not repository source contents.
        {report && <span className="mt-1 block">{report.repository.full_name} · saved {new Date(report.created_at).toLocaleString()}</span>}
      </div>
      {loading && <div role="status" className="rounded-2xl border border-[#e1e2d9] bg-[#fffefa] p-8 text-sm text-[#59665d]">Loading saved report…</div>}
      {error && !loading && <div role="alert" className="rounded-2xl border border-[#e8c9bd] bg-[#fffefa] p-8 text-sm text-[#833a32]"><h1 className="font-semibold">Report unavailable</h1><p className="mt-2">{error}</p><a className="mt-4 inline-block font-medium text-[#47734f] underline" href="/">Return to RepoLens</a></div>}
      {report && !loading && <AnalysisCard result={report.result} allowSave={false} />}
    </div>
  </main>;
}
