import React from 'react';
import { AnalysisResult } from '@/types/analysis';

interface ArchitectureVisualizationProps {
  result: AnalysisResult;
}

const ArchitectureVisualization: React.FC<ArchitectureVisualizationProps> = ({ result }) => {
  const architecture = result.architecture_analysis;
  
  if (!architecture) return null;

  const getPatternColor = (pattern: string): string => {
    const colors: Record<string, string> = {
      'MVC': 'bg-blue-500/20 border-blue-400/30 text-blue-300',
      'MVVM': 'bg-purple-500/20 border-purple-400/30 text-purple-300',
      'Microservices': 'bg-green-500/20 border-green-400/30 text-green-300',
      'Monolithic': 'bg-orange-500/20 border-orange-400/30 text-orange-300',
      'Layered': 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300',
      'Component-Based': 'bg-pink-500/20 border-pink-400/30 text-pink-300',
      'Event-Driven': 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300',
    };
    return colors[pattern] || 'bg-gray-500/20 border-gray-400/30 text-gray-300';
  };

  return (
    <div className="bg-gradient-to-br from-blue-950/30 via-indigo-950/30 to-purple-950/30 backdrop-blur-xl rounded-2xl p-8 border border-blue-500/20 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="text-4xl">🏗️</span>
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Architecture Analysis
          </span>
        </h2>
        <p className="text-gray-400 text-sm">System design patterns and structure</p>
      </div>

      {/* Architecture Type */}
      <div className="mb-8">
        <div className="bg-black/30 rounded-xl p-6 border border-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Architecture Type</div>
              <div className="text-2xl font-bold text-white">{architecture.architecture_type}</div>
            </div>
            <div className="text-5xl">🎯</div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{architecture.architecture_explanation}</p>
        </div>
      </div>

      {/* Design Patterns */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🎨</span>
          Design Patterns Detected
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {architecture.design_patterns.map((pattern, index) => (
            <div
              key={index}
              className={`rounded-xl px-4 py-3 border ${getPatternColor(pattern)} font-semibold text-center transition-all hover:scale-105`}
            >
              {pattern}
            </div>
          ))}
        </div>
      </div>

      {/* Folder Structure */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📁</span>
          Folder Structure
        </h3>
        <div className="bg-black/30 rounded-xl p-6 border border-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Structure Quality */}
            <div>
              <div className="text-sm text-gray-400 mb-2">Structure Quality</div>
              <div className="text-lg font-bold text-white mb-3">{architecture.folder_structure.structure_quality}</div>
              <div className="space-y-2">
                {architecture.folder_structure.key_directories.slice(0, 5).map((dir, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-blue-400">📂</span>
                    <span className="text-gray-300 font-mono">{dir}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Organization */}
            <div>
              <div className="text-sm text-gray-400 mb-2">Organization</div>
              <div className="text-lg font-bold text-white mb-3">{architecture.folder_structure.organization_level}</div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {architecture.folder_structure.structure_explanation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Code Organization */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📦</span>
          Code Organization
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Modularity */}
          <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50 text-center">
            <div className="text-3xl mb-2">🧩</div>
            <div className="text-sm text-gray-400 mb-1">Modularity</div>
            <div className="text-lg font-bold text-white">{architecture.code_organization.modularity_level}</div>
          </div>

          {/* Separation of Concerns */}
          <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-sm text-gray-400 mb-1">Separation</div>
            <div className="text-lg font-bold text-white">{architecture.code_organization.separation_of_concerns}</div>
          </div>

          {/* Reusability */}
          <div className="bg-black/30 rounded-xl p-5 border border-gray-800/50 text-center">
            <div className="text-3xl mb-2">♻️</div>
            <div className="text-sm text-gray-400 mb-1">Reusability</div>
            <div className="text-lg font-bold text-white">{architecture.code_organization.reusability_score}</div>
          </div>
        </div>
      </div>

      {/* Scalability Assessment */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📈</span>
          Scalability Assessment
        </h3>
        <div className="bg-gradient-to-r from-blue-950/50 to-purple-950/50 rounded-xl p-6 border border-blue-500/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-2">Horizontal Scalability</div>
              <div className="text-lg font-bold text-white mb-2">{architecture.scalability.horizontal_scalability}</div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${architecture.scalability.horizontal_scalability === 'High' ? 90 : architecture.scalability.horizontal_scalability === 'Medium' ? 60 : 30}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-2">Vertical Scalability</div>
              <div className="text-lg font-bold text-white mb-2">{architecture.scalability.vertical_scalability}</div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                  style={{ width: `${architecture.scalability.vertical_scalability === 'High' ? 90 : architecture.scalability.vertical_scalability === 'Medium' ? 60 : 30}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-300 text-sm leading-relaxed">{architecture.scalability.scalability_notes}</p>
          </div>
        </div>
      </div>

      {/* Architecture Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-emerald-950/30 rounded-xl p-6 border border-emerald-500/20">
          <h4 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
            <span>✅</span>
            Strengths
          </h4>
          <ul className="space-y-2">
            {architecture.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-emerald-400 mt-1">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-rose-950/30 rounded-xl p-6 border border-rose-500/20">
          <h4 className="text-lg font-bold text-rose-300 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            Areas for Improvement
          </h4>
          <ul className="space-y-2">
            {architecture.weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-rose-400 mt-1">•</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureVisualization;

// Made with Bob