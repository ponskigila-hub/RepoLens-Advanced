import React from 'react';
import { AnalysisResult } from '@/types/analysis';

interface EngineeringSummaryProps {
  result: AnalysisResult;
}

const EngineeringSummary: React.FC<EngineeringSummaryProps> = ({ result }) => {
  const creator = result.creator_information;
  const finalSummary = result.final_summary;
  
  if (!creator || !finalSummary) return null;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-rose-400';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/20 border-amber-500/30';
    if (score >= 40) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-rose-500/20 border-rose-500/30';
  };

  return (
    <div className="bg-gradient-to-br from-purple-950/30 via-pink-950/30 to-rose-950/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="text-4xl">⚙️</span>
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Engineering Analysis
          </span>
        </h2>
        <p className="text-gray-400 text-sm">Code quality and maintainability insights</p>
      </div>

      {/* Quality Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Repository Quality */}
        <div className={`rounded-xl p-5 border ${getScoreBg(finalSummary.repository_quality_score)}`}>
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Repository Quality</div>
            <div className={`text-4xl font-black ${getScoreColor(finalSummary.repository_quality_score)}`}>
              {finalSummary.repository_quality_score}
            </div>
            <div className="text-xs text-gray-500 mt-1">out of 100</div>
          </div>
        </div>

        {/* Architecture Quality */}
        <div className={`rounded-xl p-5 border ${getScoreBg(finalSummary.architecture_quality_score)}`}>
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Architecture Quality</div>
            <div className={`text-4xl font-black ${getScoreColor(finalSummary.architecture_quality_score)}`}>
              {finalSummary.architecture_quality_score}
            </div>
            <div className="text-xs text-gray-500 mt-1">out of 100</div>
          </div>
        </div>

        {/* Maintainability */}
        <div className={`rounded-xl p-5 border ${getScoreBg(finalSummary.maintainability_score)}`}>
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Maintainability</div>
            <div className={`text-4xl font-black ${getScoreColor(finalSummary.maintainability_score)}`}>
              {finalSummary.maintainability_score}
            </div>
            <div className="text-xs text-gray-500 mt-1">out of 100</div>
          </div>
        </div>
      </div>

      {/* Engineering Insights */}
      <div className="space-y-4 mb-8">
        {/* Maturity Level */}
        <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎓</span>
              <div>
                <div className="text-sm text-gray-400">Engineering Maturity</div>
                <div className="text-lg font-bold text-white">{creator.maturity_level}</div>
              </div>
            </div>
            <div className="px-4 py-2 bg-purple-500/20 rounded-full border border-purple-400/30">
              <span className="text-purple-300 text-sm font-semibold">{creator.coding_style}</span>
            </div>
          </div>
        </div>

        {/* Collaboration Readiness */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{creator.open_source_ready ? '✅' : '⚠️'}</span>
              <div>
                <div className="text-sm text-gray-400">Open Source Ready</div>
                <div className="text-base font-bold text-white">
                  {creator.open_source_ready ? 'Yes' : 'Needs Work'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{creator.collaboration_ready ? '✅' : '⚠️'}</span>
              <div>
                <div className="text-sm text-gray-400">Collaboration Ready</div>
                <div className="text-base font-bold text-white">
                  {creator.collaboration_ready ? 'Yes' : 'Needs Work'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Production Readiness Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Onboarding Difficulty */}
        <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50 text-center">
          <div className="text-2xl mb-2">📚</div>
          <div className="text-sm text-gray-400 mb-1">Onboarding</div>
          <div className="text-base font-bold text-white">{finalSummary.onboarding_difficulty}</div>
        </div>

        {/* Scalability */}
        <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50 text-center">
          <div className="text-2xl mb-2">📈</div>
          <div className="text-sm text-gray-400 mb-1">Scalability</div>
          <div className="text-base font-bold text-white">{finalSummary.scalability_level}</div>
        </div>

        {/* Production Readiness */}
        <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50 text-center">
          <div className="text-2xl mb-2">🚀</div>
          <div className="text-sm text-gray-400 mb-1">Production</div>
          <div className="text-base font-bold text-white">{finalSummary.production_readiness}</div>
        </div>
      </div>

      {/* Final Assessment */}
      <div className="mt-8 bg-gradient-to-r from-purple-950/50 to-pink-950/50 rounded-xl p-6 border border-purple-500/20">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💬</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-3">AI Assessment</h3>
            <p className="text-gray-300 leading-relaxed">{finalSummary.final_assessment}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineeringSummary;

// Made with Bob