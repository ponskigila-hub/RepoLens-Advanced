'use client';

import { useState } from 'react';

interface RepoInputProps {
  onAnalyze: (url: string, includeLlm: boolean) => void;
  isLoading: boolean;
}

export default function RepoInput({ onAnalyze, isLoading }: RepoInputProps) {
  const [url, setUrl] = useState('');
  const [includeLlm, setIncludeLlm] = useState(false);
  const [error, setError] = useState('');

  const validateGitHubUrl = (value: string) => /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\.git)?\/?$/.test(value.trim());

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = url.trim();
    setError('');
    if (!trimmed) {
      setError('Enter the public GitHub repository URL to begin.');
      return;
    }
    if (!validateGitHubUrl(trimmed)) {
      setError('Use a public repository URL in the form https://github.com/owner/repository.');
      return;
    }
    onAnalyze(trimmed.replace(/\/$/, ''), includeLlm);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" aria-label="Analyze a GitHub repository">
      <label htmlFor="github-url" className="mb-3 block text-sm font-medium text-slate-200">
        Public GitHub repository URL
      </label>
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#080c20]/90 p-3 shadow-[0_22px_70px_rgba(0,0,0,.35)] backdrop-blur sm:flex-row sm:items-center sm:p-2">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-2 sm:px-3">
          <svg className="h-5 w-5 shrink-0 text-teal-300" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 19c-4.2 1.4-4.2-2.1-5.9-2.1M15 21v-3.5a3 3 0 0 0-.8-2.1c2.7-.3 5.5-1.3 5.5-6A4.7 4.7 0 0 0 18.4 6a4.3 4.3 0 0 0-.1-3.1S17.2 2.6 15 4.1a12 12 0 0 0-6 0C6.8 2.6 5.7 2.9 5.7 2.9A4.3 4.3 0 0 0 5.6 6 4.7 4.7 0 0 0 4.3 9.4c0 4.7 2.8 5.7 5.5 6A3 3 0 0 0 9 17.5V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            id="github-url"
            name="github-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
            aria-describedby={error ? 'repo-url-error' : 'repo-url-help'}
            aria-invalid={Boolean(error)}
            disabled={isLoading}
            className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-0 disabled:opacity-60 sm:text-base"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 px-5 text-sm font-bold text-[#06111c] shadow-lg shadow-cyan-500/15 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 disabled:cursor-wait disabled:opacity-60 sm:min-w-44"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/25 border-t-slate-900" aria-hidden="true" />
              Scanning…
            </>
          ) : (
            <>
              Analyze repository
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </>
          )}
        </button>
      </div>
      <div className="mt-3 flex flex-col justify-between gap-3 text-xs text-slate-400 sm:flex-row sm:items-center">
        <p id="repo-url-help">Public repositories only. RepoLens never executes the repository code.</p>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2.5 rounded-lg border border-white/8 px-2.5 py-2 transition hover:border-teal-300/30 hover:text-slate-200">
          <input
            type="checkbox"
            checked={includeLlm}
            onChange={(event) => setIncludeLlm(event.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-teal-300 focus:ring-teal-300 focus:ring-offset-slate-950"
          />
          <span>Include optional AI narrative</span>
        </label>
      </div>
      {error && <p id="repo-url-error" role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
    </form>
  );
}
