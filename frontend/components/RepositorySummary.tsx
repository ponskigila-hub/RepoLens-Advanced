import React from 'react';
import { AnalysisResult } from '@/types/analysis';

interface RepositorySummaryProps {
  result: AnalysisResult;
}

const RepositorySummary: React.FC<RepositorySummaryProps> = ({ result }) => {
  const overview = result.repository_overview;
  
  if (!overview) return null;

  return (
    <div className="bg-gradient-to-br from-blue-950/30 via-purple-950/30 to-indigo-950/30 backdrop-blur-xl rounded-2xl p-8 border border-blue-500/20 shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <span className="text-4xl">📊</span>
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Repository Intelligence
            </span>
          </h2>
          <p className="text-gray-400 text-sm">AI-powered repository understanding</p>
        </div>
        <div className="px-4 py-2 bg-blue-500/20 rounded-full border border-blue-400/30">
          <span className="text-blue-300 text-sm font-semibold">{overview.application_type}</span>
        </div>
      </div>

      {/* Main Summary */}
      <div className="space-y-6">
        {/* Purpose */}
        <div className="bg-black/30 rounded-xl p-6 border border-gray-800/50">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎯</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Project Purpose</h3>
              <p className="text-gray-300 leading-relaxed">{overview.purpose}</p>
            </div>
          </div>
        </div>

        {/* Problem Solved */}
        <div className="bg-black/30 rounded-xl p-6 border border-gray-800/50">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Problem Solved</h3>
              <p className="text-gray-300 leading-relaxed">{overview.problem_solved}</p>
            </div>
          </div>
        </div>

        {/* Target Users & Domain */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-xl p-6 border border-gray-800/50">
            <div className="flex items-start gap-3">
              <div className="text-2xl">👥</div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-2">Target Users</h3>
                <p className="text-gray-300 text-sm">{overview.target_users}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-black/30 rounded-xl p-6 border border-gray-800/50">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🏢</div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-2">Domain</h3>
                <p className="text-gray-300 text-sm">{overview.domain}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Repository Name Badge */}
        <div className="flex items-center justify-center pt-4">
          <div className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-400/30">
            <span className="text-blue-300 font-semibold text-lg">{overview.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepositorySummary;

// Made with Bob