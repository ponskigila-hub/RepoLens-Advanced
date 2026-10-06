'use client';

import { useMemo, useState } from 'react';
import { apiService } from '@/services/api';
import type { FilePreview, RepositoryFile } from '@/types/analysis';
import TechLogo from '@/components/TechLogo';

const PAGE_SIZE = 50;
const PREVIEW_LIMIT = 256 * 1024;
const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

function canRequestPreview(file: RepositoryFile) {
  const name = file.path.split('/').pop()?.toLowerCase() || '';
  const envFile = name === '.env' || (name.startsWith('.env.') && !['.env.example', '.env.sample'].includes(name));
  const keyFile = /\.(pem|key|p12|pfx|p7b|p7c|jks|keystore|mobileprovision)$/.test(name) || /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/.test(file.path.toLowerCase());
  return !envFile && !keyFile && file.category !== 'binary' && (file.size_bytes ?? 0) <= PREVIEW_LIMIT;
}

export default function RepositoryFiles({
  repositoryUrl,
  files,
  totalFiles,
  sampleLimit,
  warnings = [],
}: {
  repositoryUrl?: string;
  files: RepositoryFile[];
  totalFiles: number;
  sampleLimit?: number;
  warnings?: string[];
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<FilePreview | null>(null);
  const [previewCache, setPreviewCache] = useState<Record<string, FilePreview>>({});
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const categories = useMemo(() => ['all', ...Array.from(new Set(files.map((file) => file.category).filter(Boolean))).sort()], [files]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((file) => {
      const matchesCategory = category === 'all' || file.category === category;
      const matchesQuery = !needle || `${file.path} ${file.language ?? ''} ${file.extension ?? ''}`.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [files, category, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageFiles = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const selectFile = async (file: RepositoryFile) => {
    setPreviewError(null);
    const cached = previewCache[file.path];
    if (cached) {
      setSelected(cached);
      return;
    }
    if (!repositoryUrl) {
      setPreviewError('The repository URL is not available in this report.');
      return;
    }
    if (!canRequestPreview(file)) {
      setPreviewError('This file is too large or is treated as sensitive and cannot be previewed.');
      return;
    }
    setLoadingPath(file.path);
    try {
      const preview = await apiService.getFilePreview(repositoryUrl, file.path);
      setPreviewCache((current) => ({ ...current, [file.path]: preview }));
      setSelected(preview);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Could not load this file preview.');
    } finally {
      setLoadingPath(null);
    }
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  const changeCategory = (value: string) => {
    setCategory(value);
    setPage(0);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#d9ddd2] bg-[#fffefa] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#59665d]">Repository file index</p>
          <h3 className="mt-1 text-lg font-semibold text-[#203229]">{formatNumber(totalFiles)} scanned paths</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#45594c]">
            Search the full returned inventory. Generated/vendor folders and repository metadata are excluded by the bounded scanner; source text loads only when you select a file.
          </p>
        </div>
        <label className="block sm:w-72">
          <span className="sr-only">Search repository paths</span>
          <input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Search path, language, or extension"
            className="w-full rounded-lg border border-[#d9ddd2] bg-[#fffefa] px-3 py-2.5 text-sm text-[#203229] outline-none placeholder:text-[#59665d] focus:border-[#47734f]"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter files by category">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeCategory(item)}
            aria-pressed={category === item}
            className={`rounded-lg px-3 py-1.5 text-xs capitalize transition ${category === item ? 'bg-[#edf3e9] font-semibold text-[#315d42] ring-1 ring-[#47734f]/30' : 'border border-[#d9ddd2] bg-[#fffefa] text-[#45594c] hover:border-[#9fbea1]'}`}
          >
            {item === 'all' ? 'All files' : item}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#d9ddd2] bg-[#fffefa]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-left text-sm">
            <thead className="bg-[#f1efe7] text-[10px] uppercase tracking-[.1em] text-[#45594c]">
              <tr>
                <th className="px-4 py-3 font-semibold">Path</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Language</th>
                <th className="px-4 py-3 text-right font-semibold">Lines</th>
                <th className="px-4 py-3 text-right font-semibold">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e1d7]">
              {pageFiles.map((file) => {
                const enabled = canRequestPreview(file);
                return (
                  <tr key={file.path} className="transition hover:bg-[#f7f8f3]">
                    <td className="max-w-[360px] px-4 py-3 font-mono text-xs text-[#304239]">
                      <span className="block truncate" title={file.path}>{file.path}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[#f1efe7] px-2 py-1 text-[10px] capitalize text-[#45594c]">{file.category || 'other'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#45594c]">
                      {file.language ? <span className="inline-flex items-center gap-2"><TechLogo name={file.language} small />{file.language}</span> : <span className="font-mono text-[10px]">{file.extension || '—'}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#45594c]">{file.lines == null ? '—' : formatNumber(file.lines)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={!enabled || loadingPath === file.path}
                        onClick={() => void selectFile(file)}
                        className="rounded-md border border-[#c5d8c5] bg-[#f6f8f2] px-2.5 py-1.5 text-[10px] font-semibold text-[#315d42] hover:bg-[#edf3e9] disabled:cursor-not-allowed disabled:opacity-45"
                        title={!enabled ? 'Large or sensitive files are not available for preview' : `Load ${file.path} on demand`}
                      >
                        {loadingPath === file.path ? 'Loading…' : selected?.path === file.path || previewCache[file.path] ? 'View again' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!pageFiles.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#59665d]">No scanned files match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e1d7] px-4 py-3 text-xs text-[#45594c]">
          <span>Showing {filtered.length ? formatNumber(safePage * PAGE_SIZE + 1) : '0'}–{formatNumber(Math.min((safePage + 1) * PAGE_SIZE, filtered.length))} of {formatNumber(filtered.length)} matching paths</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-md border border-[#d9ddd2] px-2.5 py-1.5 font-medium disabled:opacity-40">Previous</button>
            <span>Page {safePage + 1} of {pageCount}</span>
            <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} className="rounded-md border border-[#d9ddd2] px-2.5 py-1.5 font-medium disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {(totalFiles > files.length || (sampleLimit != null && totalFiles > sampleLimit)) && (
        <p className="text-xs leading-5 text-[#735017]">The repository exceeded the scanner's path cap of {formatNumber(sampleLimit ?? files.length)} files; only the bounded scan is indexed.</p>
      )}
      {!!warnings.length && <ul className="space-y-1 text-xs leading-5 text-[#735017]">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}

      {previewError && <p role="alert" className="rounded-xl border border-[#e8c9bd] bg-[#f8ece7] px-4 py-3 text-xs text-[#833a32]">{previewError}</p>}
      {selected && (
        <section className="overflow-hidden rounded-2xl border border-[#d9ddd2] bg-[#fffefa]" aria-label={`File preview: ${selected.path}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e3e1d7] bg-[#f7f8f3] px-4 py-3">
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#59665d]">On-demand text preview</p><p className="mt-1 truncate font-mono text-xs font-semibold text-[#203229]">{selected.path}</p></div>
            <button type="button" onClick={() => setSelected(null)} className="rounded-md border border-[#d9ddd2] bg-[#fffefa] px-2.5 py-1.5 text-xs text-[#45594c]">Close</button>
          </div>
          <pre className="max-h-[640px] overflow-auto bg-[#111a15] p-4 text-xs leading-5 text-[#e5eee7] sm:p-5"><code>{selected.content}</code></pre>
          <p className="border-t border-[#e3e1d7] px-4 py-3 text-[10px] leading-5 text-[#59665d]">{selected.note}{selected.redacted_values > 0 ? ` ${selected.redacted_values} value(s) redacted.` : ''}</p>
        </section>
      )}
    </section>
  );
}
