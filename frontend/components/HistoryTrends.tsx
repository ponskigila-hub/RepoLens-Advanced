'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiService } from '@/services/api';
import type { RepositoryHistory } from '@/types/analysis';

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);
const formatDate = (value: string | null) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
};

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#d9ddd2] bg-[#fffefa] p-4 shadow-sm sm:p-5">
    <div className="mb-3"><h4 className="text-sm font-semibold text-[#203229]">{title}</h4><p className="mt-1 text-[11px] leading-5 text-[#59665d]">{note}</p></div>
    {children}
  </section>;
}

function monthlyBuckets(history: RepositoryHistory) {
  const now = new Date();
  const currentMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const months = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1));
    return { key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`, label: new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(start), commits: 0 };
  });
  const indexByMonth = new Map(months.map((month, index) => [month.key, index]));

  if (history.activity_status === 'available' && history.weekly_activity.length) {
    for (const week of history.weekly_activity) {
      const date = new Date(`${week.week_start}T00:00:00Z`);
      if (Number.isNaN(date.getTime()) || date.getTime() > currentMonth + 32 * 24 * 60 * 60 * 1000) continue;
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const index = indexByMonth.get(key);
      if (index !== undefined) months[index].commits += week.commits;
    }
    return { months, complete: true, label: 'GitHub weekly activity, grouped by the week-start month' };
  }

  const sampled = new Map<string, number>();
  for (const commit of history.recent_commits) {
    if (!commit.date) continue;
    const date = new Date(commit.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    sampled.set(key, (sampled.get(key) ?? 0) + 1);
  }
  for (const [key, count] of sampled) {
    const index = indexByMonth.get(key);
    if (index !== undefined) months[index].commits = count;
  }
  return { months, complete: false, label: 'Sample only: commits in the recent API page, not full monthly totals' };
}

type LegendKind = 'bar' | 'positive' | 'negative' | 'line' | 'baseline';
function ChartLegend({ items }: { items: Array<{ kind: LegendKind; label: string }> }) {
  return <div role="group" aria-label="Chart legend" className="chart-legend">
    {items.map((item) => <span key={`${item.kind}-${item.label}`} className="chart-legend-item"><span className={`chart-legend-key chart-legend-key--${item.kind}`} aria-hidden="true"/><span>{item.label}</span></span>)}
  </div>;
}

function ActivityChart({ history }: { history: RepositoryHistory }) {
  const activity = useMemo(() => monthlyBuckets(history), [history]);
  const hasData = activity.months.some((item) => item.commits > 0);
  const max = Math.max(1, ...activity.months.map((item) => item.commits));
  const plot = { left: 36, top: 16, right: 604, bottom: 174 };
  const step = (plot.right - plot.left) / activity.months.length;
  const barWidth = step * 0.58;
  const y = (value: number) => plot.bottom - (value / max) * (plot.bottom - plot.top);
  const total = activity.months.reduce((sum, item) => sum + item.commits, 0);

  return <Panel title="Commit history" note={activity.label}>
    {hasData ? <>
      <div className="mb-2 flex items-center justify-between text-[10px] text-[#59665d]"><span>Commits per month</span><span>{formatNumber(total)} in displayed period</span></div>
      <svg viewBox="0 0 620 220" className="h-auto w-full" role="img" aria-label={`Bar chart of ${activity.complete ? 'GitHub weekly commit activity grouped by month' : 'sampled recent commits grouped by month'}`}>
        {[0, 0.5, 1].map((ratio) => {
          const value = Math.round(max * ratio);
          const yy = y(value);
          return <g key={ratio}><line x1={plot.left} y1={yy} x2={plot.right} y2={yy} stroke="var(--chart-grid)" strokeDasharray="3 4"/><text x={plot.left - 7} y={yy + 4} textAnchor="end" fill="var(--chart-text)" fontSize="10">{value}</text></g>;
        })}
        {activity.months.map((month, index) => {
          const x = plot.left + index * step + (step - barWidth) / 2;
          const height = (month.commits / max) * (plot.bottom - plot.top);
          return <g key={month.key}>
            <rect x={x} y={plot.bottom - height} width={barWidth} height={Math.max(0, height)} rx="4" fill="var(--chart-fill)"><title>{month.label}: {month.commits} {activity.complete ? 'commits' : 'sampled commits'}</title></rect>
            {(index % 2 === 0 || index === activity.months.length - 1) && <text x={x + barWidth / 2} y="196" textAnchor="middle" fill="var(--chart-text)" fontSize="10">{month.label}</text>}
          </g>;
        })}
      </svg>
      <ChartLegend items={[{ kind: 'bar', label: activity.complete ? 'GitHub weekly commits grouped by month' : 'Recent commits returned by the API' }]} />
      {!activity.complete && <p className="mt-1 text-[10px] leading-4 text-[#735017]">GitHub weekly totals are not ready or unavailable; bars count only the recent commits returned by the API.</p>}
    </> : <p className="rounded-xl border border-dashed border-[#d9ddd2] bg-[#faf9f4] px-3 py-5 text-center text-xs leading-5 text-[#59665d]">No commit activity was returned for this repository or recent sample.</p>}
  </Panel>;
}

function ComplexityChart({ history }: { history: RepositoryHistory }) {
  const points = history.complexity_trend;
  const values = points.map((item) => item.net_decision_points);
  const timestamps = points.map((item) => Date.parse(item.date));
  const validTimestamps = timestamps.filter(Number.isFinite);
  const firstTimestamp = Math.min(...validTimestamps);
  const lastTimestamp = Math.max(...validTimestamps);
  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  if (min === max) { min -= 1; max += 1; }
  const plot = { left: 44, top: 18, right: 602, bottom: 174 };
  const x = (index: number) => {
    if (points.length <= 1) return (plot.left + plot.right) / 2;
    const timestamp = timestamps[index];
    if (!Number.isFinite(timestamp) || !Number.isFinite(firstTimestamp) || firstTimestamp === lastTimestamp) {
      return plot.left + (index / (points.length - 1)) * (plot.right - plot.left);
    }
    return plot.left + ((timestamp - firstTimestamp) / (lastTimestamp - firstTimestamp)) * (plot.right - plot.left);
  };
  const y = (value: number) => plot.bottom - ((value - min) / (max - min)) * (plot.bottom - plot.top);
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.net_decision_points)}`).join(' ');
  const zeroY = y(0);

  return <Panel title={points.length > 1 ? 'Complexity trend' : 'Complexity change'} note="Net decision-point changes per sampled commit—not total repository cyclomatic complexity.">
    {points.length ? <>
      <div className="mb-2 flex items-center justify-between text-[10px] text-[#59665d]"><span>Net branch-point changes</span><span>{points.length} of up to {history.complexity_sample_limit} patches</span></div>
      <svg viewBox="0 0 620 220" className="h-auto w-full" role="img" aria-label="Line chart of net branch decision point changes for sampled commits">
        {[0, 0.5, 1].map((ratio) => {
          const value = max - ratio * (max - min);
          const yy = y(value);
          return <g key={ratio}><line x1={plot.left} y1={yy} x2={plot.right} y2={yy} stroke="var(--chart-grid)" strokeDasharray="3 4"/><text x={plot.left - 8} y={yy + 4} textAnchor="end" fill="var(--chart-text)" fontSize="10">{Math.round(value)}</text></g>;
        })}
        <line x1={plot.left} y1={zeroY} x2={plot.right} y2={zeroY} stroke="var(--chart-zero)" strokeDasharray="4 4"/>
        {points.length > 1 && <path d={path} fill="none" stroke="var(--chart-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
        {points.map((point, index) => <g key={`${point.sha}-${index}`}>
          <circle cx={x(index)} cy={y(point.net_decision_points)} r="5" fill={point.net_decision_points > 0 ? 'var(--chart-positive)' : point.net_decision_points < 0 ? 'var(--chart-negative)' : 'var(--chart-neutral)'} stroke="var(--panel-bg)" strokeWidth="2"><title>{`${point.sha} · ${formatDate(point.date)} · net branch-token change ${point.net_decision_points >= 0 ? '+' : ''}${point.net_decision_points} · patch coverage ${point.patch_coverage_percent}% · ${point.message}`}</title></circle>
          {(index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2)) && <text x={x(index)} y="196" textAnchor="middle" fill="var(--chart-text)" fontSize="9">{point.sha}</text>}
        </g>)}
      </svg>
      <ChartLegend items={[{ kind: 'positive', label: 'Increase (+)' }, { kind: 'negative', label: 'Decrease (−)' }, ...(points.length > 1 ? [{ kind: 'line' as const, label: 'Sample order (visual connector)' }] : []), { kind: 'baseline', label: 'Zero-change baseline' }]} />
      <p className="mt-1 text-[10px] leading-4 text-[#59665d]">{points.length === 1 ? 'Only one supported source patch was available in the sampled window; this is one measured commit change, not a trend line.' : 'Each point is one sampled commit. Positive values mean more branch-like tokens in added lines than removed lines.'} Tooltip includes patch coverage.</p>
    </> : <p className="rounded-xl border border-dashed border-[#d9ddd2] bg-[#faf9f4] px-3 py-5 text-center text-xs leading-5 text-[#59665d]">No supported source patches were available to estimate a complexity-change trend.</p>}
  </Panel>;
}

export default function HistoryTrends({ repositoryUrl }: { repositoryUrl?: string }) {
  const [history, setHistory] = useState<RepositoryHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!repositoryUrl) {
      setLoading(false);
      setError('The repository URL is unavailable in this report.');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    apiService.getRepositoryHistory(repositoryUrl, controller.signal)
      .then((data) => setHistory(data))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Repository history could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [repositoryUrl, retry]);

  return <section className="space-y-4" aria-labelledby="history-trends-heading">
    <div className="rounded-2xl border border-[#cbd9cb] border-l-4 border-l-[#315d42] bg-[#fffefa] p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#59665d]">Repository history</p><h3 id="history-trends-heading" className="mt-1 text-lg font-semibold text-[#203229]">Complexity and commit trends</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-[#45594c]">Loaded only when this section is opened. Activity comes from GitHub; the complexity line is a clearly labeled source-patch estimate.</p></div>
        {history?.status && <span className="rounded-full border border-[#d9ddd2] bg-[#f6f8f2] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#315d42]">History {history.status}</span>}
      </div>
    </div>

    {loading && <div role="status" className="rounded-2xl border border-[#d9ddd2] bg-[#fffefa] p-5 text-sm text-[#45594c]">Loading GitHub commit history…</div>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8c9bd] bg-[#f8ece7] p-3 text-xs text-[#833a32]"><span>{error}</span><button type="button" onClick={() => setRetry((value) => value + 1)} className="rounded-lg border border-[#d8a896] px-3 py-1.5 font-semibold hover:bg-[#f4dfd7]">Retry</button></div>}
    {!loading && history && <>
      <div className="grid gap-4 xl:grid-cols-2"><ActivityChart history={history}/><ComplexityChart history={history}/></div>
      <p className="rounded-xl border border-[#e3e1d7] bg-[#faf9f4] px-3 py-2.5 text-[10px] leading-5 text-[#59665d]">{history.activity_note} {history.complexity_note} {history.note}</p>
      {!!history.recent_commits.length && <details className="rounded-2xl border border-[#d9ddd2] bg-[#fffefa] p-4 sm:p-5"><summary className="cursor-pointer text-xs font-semibold text-[#203229]">Recent commits ({history.recent_commits.length})</summary><div className="mt-3 space-y-2">{history.recent_commits.map((commit) => <a key={commit.sha} href={commit.url} target="_blank" rel="noreferrer" className="flex flex-col gap-1 rounded-xl border border-[#e3e1d7] bg-[#faf9f4] px-3 py-2.5 transition hover:border-[#9fbea1] sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0"><span className="mr-2 font-mono text-[10px] text-[#315d42]">{commit.short_sha}</span><span className="text-xs text-[#304239]">{commit.message}</span></span><span className="shrink-0 text-[10px] text-[#59665d]">{formatDate(commit.date)}{commit.additions !== null && commit.deletions !== null ? ` · +${formatNumber(commit.additions)} / −${formatNumber(commit.deletions)}` : ''}</span></a>)}</div></details>}
    </>}
  </section>;
}
