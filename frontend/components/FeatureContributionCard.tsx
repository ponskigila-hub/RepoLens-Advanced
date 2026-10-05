import React from 'react';

interface FeatureContribution {
  positive_factors: Array<{
    factor: string;
    impact: string;
    description: string;
  }>;
  negative_factors: Array<{
    factor: string;
    impact: string;
    description: string;
  }>;
  top_contributing_features: Array<{
    name: string;
    score: number;
  }>;
}

interface FeatureContributionCardProps {
  contributions: FeatureContribution;
  confidence: number;
}

const FeatureContributionCard: React.FC<FeatureContributionCardProps> = ({ contributions, confidence }) => {
  const getImpactColor = (impact: string): string => {
    const lower = impact.toLowerCase();
    if (lower === 'critical' || lower === 'high' || lower === 'needs_attention') return 'text-rose-400 bg-rose-500/20 border-rose-500/30';
    if (lower === 'medium') return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
  };

  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.8) return 'text-emerald-400';
    if (conf >= 0.6) return 'text-amber-400';
    return 'text-orange-400';
  };

  const getConfidenceLabel = (conf: number): string => {
    if (conf >= 0.8) return 'High Coverage';
    if (conf >= 0.6) return 'Medium Coverage';
    return 'Limited Coverage';
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950/30 via-purple-950/30 to-pink-950/30 backdrop-blur-xl rounded-2xl p-8 border border-indigo-500/20 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="text-4xl">🔍</span>
          <span className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
            Score Evidence
          </span>
        </h2>
        <p className="text-gray-400 text-sm">Measured factors from static repository analysis</p>
      </div>

      {/* Evidence Coverage */}
      <div className="mb-8 bg-black/30 rounded-xl p-6 border border-gray-800/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Evidence Coverage</h3>
            <p className="text-gray-400 text-sm">Based on successfully scanned source files</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${getConfidenceColor(confidence)}`}>
              {Math.round(confidence * 100)}%
            </div>
            <div className="text-sm text-gray-400 mt-1">{getConfidenceLabel(confidence)}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              confidence >= 0.8 ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
              confidence >= 0.6 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
              'bg-gradient-to-r from-orange-500 to-red-500'
            }`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Top Contributing Features */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📊</span>
          Top Contributing Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contributions.top_contributing_features.map((feature, index) => (
            <div key={index} className="bg-black/30 rounded-xl p-5 border border-gray-800/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 font-semibold">{feature.name}</span>
                <span className={`text-lg font-bold ${
                  feature.score >= 70 ? 'text-emerald-400' :
                  feature.score >= 50 ? 'text-amber-400' :
                  'text-orange-400'
                }`}>
                  {Math.round(feature.score)}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    feature.score >= 70 ? 'bg-emerald-500' :
                    feature.score >= 50 ? 'bg-amber-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${feature.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Positive Factors */}
      {contributions.positive_factors.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
            <span>✅</span>
            Positive Contributing Factors
          </h3>
          <div className="space-y-3">
            {contributions.positive_factors.map((factor, index) => (
              <div
                key={index}
                className="bg-emerald-950/30 rounded-xl p-5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">✨</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-emerald-300">{factor.factor}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getImpactColor(factor.impact)}`}>
                        {factor.impact === 'needs_attention' ? 'Needs attention' : `${factor.impact} signal`}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{factor.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negative Factors */}
      {contributions.negative_factors.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-rose-400 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            Negative Contributing Factors
          </h3>
          <div className="space-y-3">
            {contributions.negative_factors.map((factor, index) => (
              <div
                key={index}
                className="bg-rose-950/30 rounded-xl p-5 border border-rose-500/20 hover:border-rose-500/40 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">⚡</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-rose-300">{factor.factor}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getImpactColor(factor.impact)}`}>
                        {factor.impact === 'needs_attention' ? 'Needs attention' : `${factor.impact} signal`}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{factor.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explainability Note */}
      <div className="bg-gradient-to-r from-indigo-950/50 to-purple-950/50 rounded-xl p-6 border border-indigo-500/20">
        <div className="flex items-start gap-4">
          <span className="text-3xl">💡</span>
          <div>
            <h3 className="text-lg font-bold text-white mb-3">How Scores Are Calculated</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              Scores are calculated locally from repository files and observed engineering artifacts. They are not trained-model predictions and do not use stars, forks, or repository age.
            </p>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-1">•</span><span><strong>Code complexity</strong> — Python AST branch counts and documented syntax estimates for other languages</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-1">•</span><span><strong>Tests and coverage</strong> — detected test files and measured coverage reports when present</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-1">•</span><span><strong>Structure and dependencies</strong> — source layout, modularity, dependency manifests, and lockfiles</span></li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-1">•</span><span><strong>Delivery readiness</strong> — observed CI, Docker, license, and security workflow files</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureContributionCard;

// Made with Bob