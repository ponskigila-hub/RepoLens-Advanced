'use client';

import { useState } from 'react';
import RepoInput from '@/components/RepoInput';
import AnalysisCard from '@/components/AnalysisCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AnalysisResult } from '@/types/analysis';

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (url: string, useMock: boolean) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_url: url,
          use_mock: useMock,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Analysis failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            {/* Logo/Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/50">
              <span className="text-4xl">🔍</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              RepoLens AI
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-gray-300 mb-2">
              AI-Powered Repository Intelligence Platform
            </p>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Transform any GitHub repository into comprehensive developer insights, architecture analysis, and onboarding documentation in seconds.
            </p>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <FeatureBadge icon="🏗️" text="Architecture Analysis" />
              <FeatureBadge icon="🔒" text="Security Insights" />
              <FeatureBadge icon="⚡" text="Performance Review" />
              <FeatureBadge icon="🚀" text="Onboarding Guide" />
            </div>
          </div>

          {/* Input Section */}
          <div className="max-w-4xl mx-auto mb-12">
            <RepoInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
          </div>

          {/* Loading State */}
          {isAnalyzing && (
            <div className="max-w-4xl mx-auto">
              <LoadingSpinner />
            </div>
          )}

          {/* Error State */}
          {error && !isAnalyzing && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">❌</span>
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 mb-2">Analysis Failed</h3>
                    <p className="text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !isAnalyzing && (
            <div className="max-w-7xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-bold text-gray-100 mb-2">
                  📊 Analysis Complete
                </h2>
                <p className="text-gray-400">
                  Here's your comprehensive repository intelligence report
                </p>
              </div>
              <AnalysisCard result={result} />
            </div>
          )}

          {/* Empty State */}
          {!result && !isAnalyzing && !error && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-12 backdrop-blur-sm text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-gray-200 mb-3">
                  Ready to Analyze
                </h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Enter a GitHub repository URL above to get started with AI-powered analysis
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
                  <InfoCard
                    icon="📋"
                    title="Deep Analysis"
                    description="Comprehensive repository overview and purpose"
                  />
                  <InfoCard
                    icon="🛠️"
                    title="Tech Stack"
                    description="Automatic technology detection and categorization"
                  />
                  <InfoCard
                    icon="💡"
                    title="Insights"
                    description="Actionable suggestions and best practices"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 mt-12 border-t border-gray-800">
          <div className="text-center text-gray-500 text-sm">
            <p>Built with ❤️ using Next.js, FastAPI, and AI</p>
            <p className="mt-2">Made with Bob 🤖</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Helper Components
function FeatureBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-full backdrop-blur-sm hover:border-blue-500/50 transition-colors">
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-gray-300">{text}</span>
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg hover:border-blue-500/30 transition-colors">
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="font-semibold text-gray-200 mb-1">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

// Made with Bob
