import React from 'react';
import { MLScores } from '@/types/analysis';

interface MLScoresCardProps {
  scores: MLScores;
  modelUsed?: string;
}

const MLScoresCard: React.FC<MLScoresCardProps> = ({ scores, modelUsed = 'ml' }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-rose-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/20';
    if (score >= 40) return 'bg-orange-500/20';
    return 'bg-rose-500/20';
  };

  const getScoreGradient = (score: number): string => {
    if (score >= 80) return 'from-emerald-500 via-emerald-600 to-green-600';
    if (score >= 60) return 'from-amber-500 via-yellow-500 to-yellow-600';
    if (score >= 40) return 'from-orange-500 via-orange-600 to-red-500';
    return 'from-rose-500 via-red-500 to-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getScoreBadge = (score: number): string => {
    if (score >= 80) return '🏆';
    if (score >= 60) return '✨';
    if (score >= 40) return '⚡';
    return '🔧';
  };

  const scoreItems = [
    {
      label: 'Overall Quality',
      score: scores.overall_quality,
      icon: '⭐',
      description: 'Comprehensive repository quality assessment'
    },
    {
      label: 'Maintainability',
      score: scores.maintainability,
      icon: '🔧',
      description: 'Code maintainability and update frequency'
    },
    {
      label: 'Scalability',
      score: scores.scalability,
      icon: '📈',
      description: 'Architecture scalability potential'
    },
    {
      label: 'Architecture',
      score: scores.architecture,
      icon: '🏗️',
      description: 'Code structure and design patterns'
    },
    {
      label: 'Production Readiness',
      score: scores.production_readiness,
      icon: '🚀',
      description: 'Deployment and production readiness'
    }
  ];

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-gray-800/50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">🤖</span>
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ML Quality Scores
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-2 ml-1">
            Data-driven repository intelligence powered by machine learning
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900/80 px-4 py-2 rounded-full border border-gray-700/50 backdrop-blur-sm">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${modelUsed === 'ml' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
          <span className="text-xs text-gray-300 uppercase tracking-wider font-semibold">
            {modelUsed === 'ml' ? 'ML Model' : modelUsed === 'heuristic' ? 'Smart Analysis' : 'Fallback'}
          </span>
        </div>
      </div>

      {/* Overall Score - Featured */}
      <div className="mb-8 bg-gradient-to-br from-purple-950/50 via-blue-950/50 to-indigo-950/50 rounded-2xl p-6 border border-purple-500/20 backdrop-blur-sm relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 animate-pulse"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{scoreItems[0].icon}</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{scoreItems[0].label}</h3>
                <p className="text-sm text-gray-400">{scoreItems[0].description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{getScoreBadge(scoreItems[0].score)}</span>
                <div className={`text-5xl font-black ${getScoreColor(scoreItems[0].score)}`}>
                  {scoreItems[0].score.toFixed(1)}
                </div>
              </div>
              <div className={`text-sm font-semibold ${getScoreColor(scoreItems[0].score)} px-3 py-1 rounded-full ${getScoreBgColor(scoreItems[0].score)}`}>
                {getScoreLabel(scoreItems[0].score)}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-900/50 rounded-full h-4 overflow-hidden border border-gray-800/50">
            <div
              className={`h-full bg-gradient-to-r ${getScoreGradient(scoreItems[0].score)} transition-all duration-1000 ease-out shadow-lg`}
              style={{ width: `${scoreItems[0].score}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Other Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scoreItems.slice(1).map((item, index) => (
          <div
            key={index}
            className="bg-gray-950/50 backdrop-blur-sm rounded-xl p-5 border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">{item.label}</h4>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-900/50 rounded-full h-3 overflow-hidden border border-gray-800/50">
                  <div
                    className={`h-full bg-gradient-to-r ${getScoreGradient(item.score)} transition-all duration-1000 ease-out shadow-md`}
                    style={{ width: `${item.score}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getScoreBadge(item.score)}</span>
                <div className={`text-2xl font-black ${getScoreColor(item.score)} min-w-[55px] text-right`}>
                  {item.score.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-gray-800/50">
        <div className="flex flex-wrap gap-5 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-md shadow-sm"></div>
            <span className="text-gray-400 font-medium">Excellent (80-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-md shadow-sm"></div>
            <span className="text-gray-400 font-medium">Good (60-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-md shadow-sm"></div>
            <span className="text-gray-400 font-medium">Fair (40-59)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-rose-500 to-red-600 rounded-md shadow-sm"></div>
            <span className="text-gray-400 font-medium">Needs Work (below 40)</span>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-950/30 to-indigo-950/30 rounded-xl border border-blue-500/20 backdrop-blur-sm">
        <p className="text-sm text-blue-300/90 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <span className="leading-relaxed">
            These scores are generated using {modelUsed === 'ml' ? 'machine learning models trained on thousands of GitHub repositories' : 'intelligent heuristics based on repository characteristics'}.
            They provide objective, data-driven insights into repository quality and engineering practices.
          </span>
        </p>
      </div>
    </div>
  );
};

export default MLScoresCard;

// Made with Bob