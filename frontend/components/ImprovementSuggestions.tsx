import React from 'react';
import { AnalysisResult } from '@/types/analysis';

interface ImprovementSuggestionsProps {
  result: AnalysisResult;
}

const ImprovementSuggestions: React.FC<ImprovementSuggestionsProps> = ({ result }) => {
  const suggestions = result.improvement_suggestions;
  
  if (!suggestions || suggestions.length === 0) return null;

  const getPriorityColor = (priority: string): string => {
    const lower = priority.toLowerCase();
    if (lower.includes('high') || lower.includes('critical')) {
      return 'bg-rose-500/20 border-rose-500/30 text-rose-300';
    }
    if (lower.includes('medium') || lower.includes('moderate')) {
      return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
    }
    return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
  };

  const getCategoryIcon = (category: string): string => {
    const lower = category.toLowerCase();
    if (lower.includes('performance')) return '⚡';
    if (lower.includes('security')) return '🔒';
    if (lower.includes('code quality') || lower.includes('quality')) return '✨';
    if (lower.includes('architecture')) return '🏗️';
    if (lower.includes('documentation')) return '📝';
    if (lower.includes('testing')) return '🧪';
    if (lower.includes('deployment')) return '🚀';
    return '💡';
  };

  const getCategoryColor = (category: string): string => {
    const lower = category.toLowerCase();
    if (lower.includes('performance')) return 'from-yellow-950/50 to-amber-950/50 border-yellow-500/20';
    if (lower.includes('security')) return 'from-rose-950/50 to-red-950/50 border-rose-500/20';
    if (lower.includes('code quality') || lower.includes('quality')) return 'from-purple-950/50 to-pink-950/50 border-purple-500/20';
    if (lower.includes('architecture')) return 'from-blue-950/50 to-indigo-950/50 border-blue-500/20';
    if (lower.includes('documentation')) return 'from-green-950/50 to-emerald-950/50 border-green-500/20';
    if (lower.includes('testing')) return 'from-cyan-950/50 to-teal-950/50 border-cyan-500/20';
    if (lower.includes('deployment')) return 'from-orange-950/50 to-red-950/50 border-orange-500/20';
    return 'from-gray-950/50 to-slate-950/50 border-gray-500/20';
  };

  // Group suggestions by category
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.category]) {
      acc[suggestion.category] = [];
    }
    acc[suggestion.category].push(suggestion);
    return acc;
  }, {} as Record<string, typeof suggestions>);

  const highPriorityCount = suggestions.filter(s => 
    s.priority.toLowerCase().includes('high') || s.priority.toLowerCase().includes('critical')
  ).length;

  return (
    <div className="bg-gradient-to-br from-purple-950/30 via-fuchsia-950/30 to-pink-950/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="text-4xl">💡</span>
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI Improvement Suggestions
          </span>
        </h2>
        <p className="text-gray-400 text-sm">Actionable recommendations to enhance your repository</p>
      </div>

      {/* Priority Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-rose-950/50 rounded-xl p-5 border border-rose-500/30 text-center">
          <div className="text-4xl font-black text-rose-400">{highPriorityCount}</div>
          <div className="text-sm text-gray-400 mt-1">High Priority</div>
        </div>
        <div className="bg-purple-950/50 rounded-xl p-5 border border-purple-500/30 text-center">
          <div className="text-4xl font-black text-purple-400">{Object.keys(groupedSuggestions).length}</div>
          <div className="text-sm text-gray-400 mt-1">Categories</div>
        </div>
        <div className="bg-pink-950/50 rounded-xl p-5 border border-pink-500/30 text-center">
          <div className="text-4xl font-black text-pink-400">{suggestions.length}</div>
          <div className="text-sm text-gray-400 mt-1">Total Suggestions</div>
        </div>
      </div>

      {/* Suggestions by Category */}
      <div className="space-y-6">
        {Object.entries(groupedSuggestions).map(([category, categorySuggestions]) => (
          <div key={category} className={`bg-gradient-to-r ${getCategoryColor(category)} rounded-xl p-6 border`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{getCategoryIcon(category)}</span>
              <h3 className="text-xl font-bold text-white">{category}</h3>
              <span className="ml-auto bg-white/10 px-3 py-1 rounded-full text-sm text-gray-300">
                {categorySuggestions.length} {categorySuggestions.length === 1 ? 'suggestion' : 'suggestions'}
              </span>
            </div>

            <div className="space-y-3">
              {categorySuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="bg-black/30 rounded-lg p-4 border border-gray-800/50 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="text-gray-300 flex-1">{suggestion.suggestion}</p>
                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${getPriorityColor(suggestion.priority)}`}>
                      {suggestion.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-400">📊</span>
                    <span className="text-gray-400">Impact:</span>
                    <span className="text-emerald-300 font-semibold">{suggestion.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Plan */}
      <div className="mt-8 bg-gradient-to-r from-purple-950/50 to-pink-950/50 rounded-xl p-6 border border-purple-500/20">
        <div className="flex items-start gap-4">
          <span className="text-3xl">🎯</span>
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Recommended Action Plan</h3>
            <ol className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">1.</span>
                <span>Address all high-priority suggestions first</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">2.</span>
                <span>Focus on security and performance improvements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">3.</span>
                <span>Enhance documentation and testing coverage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">4.</span>
                <span>Refactor code quality issues incrementally</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">5.</span>
                <span>Review and implement architectural improvements</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovementSuggestions;

// Made with Bob