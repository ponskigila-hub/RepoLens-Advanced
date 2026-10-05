'use client';

import { useState } from 'react';

interface RepoInputProps {
  onAnalyze: (url: string, useMock: boolean) => void;
  isLoading: boolean;
}

export default function RepoInput({ onAnalyze, isLoading }: RepoInputProps) {
  const [url, setUrl] = useState('');
  const [useMock, setUseMock] = useState(false);
  const [error, setError] = useState('');

  const validateGitHubUrl = (url: string): boolean => {
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return githubPattern.test(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    if (!validateGitHubUrl(url)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo)');
      return;
    }

    onAnalyze(url, useMock);
  };

  const exampleRepos = [
    'https://github.com/vercel/next.js',
    'https://github.com/facebook/react',
    'https://github.com/microsoft/vscode',
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
          <label htmlFor="github-url" className="block text-sm font-medium text-gray-300 mb-3">
            🔗 GitHub Repository URL
          </label>
          <input
            id="github-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/username/repository"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </p>
          )}
          
          {/* Mock Data Toggle */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="use-mock"
              checked={useMock}
              onChange={(e) => setUseMock(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="use-mock" className="text-sm text-gray-400 cursor-pointer">
              🧪 Use mock data (for testing without API key)
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Analyze Repository
            </>
          )}
        </button>
      </form>

      <div className="mt-6">
        <p className="text-sm text-gray-400 mb-2">Try these examples:</p>
        <div className="flex flex-wrap gap-2">
          {exampleRepos.map((repo) => (
            <button
              key={repo}
              onClick={() => setUrl(repo)}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {repo.replace('https://github.com/', '')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Made with Bob
