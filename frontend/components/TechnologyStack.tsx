import React from 'react';
import { AnalysisResult } from '@/types/analysis';

interface TechnologyStackProps {
  result: AnalysisResult;
}

const TechnologyStack: React.FC<TechnologyStackProps> = ({ result }) => {
  const techStack = result.technology_stack;
  
  if (!techStack) return null;

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'frontend': '🎨',
      'backend': '⚙️',
      'database': '🗄️',
      'deployment': '🚀',
      'testing': '🧪',
      'other': '🔧',
    };
    return icons[category] || '📦';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'frontend': 'from-pink-500/20 to-purple-500/20 border-pink-500/30',
      'backend': 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
      'database': 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      'deployment': 'from-orange-500/20 to-red-500/20 border-orange-500/30',
      'testing': 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
      'other': 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
    };
    return colors[category] || 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
  };

  const categories = [
    { key: 'frontend', label: 'Frontend', items: techStack.frontend },
    { key: 'backend', label: 'Backend', items: techStack.backend },
    { key: 'database', label: 'Database', items: techStack.database },
    { key: 'deployment', label: 'Deployment', items: techStack.deployment },
    { key: 'testing', label: 'Testing', items: techStack.testing },
    { key: 'other', label: 'Other Tools', items: techStack.other },
  ];

  return (
    <div className="bg-gradient-to-br from-cyan-950/30 via-blue-950/30 to-indigo-950/30 backdrop-blur-xl rounded-2xl p-8 border border-cyan-500/20 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="text-4xl">🛠️</span>
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Technology Stack
          </span>
        </h2>
        <p className="text-gray-400 text-sm">Tools, frameworks, and technologies used</p>
      </div>

      {/* Technology Categories */}
      <div className="space-y-6">
        {categories.map((category) => (
          category.items.length > 0 && (
            <div key={category.key} className={`bg-gradient-to-r ${getCategoryColor(category.key)} rounded-xl p-6 border`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{getCategoryIcon(category.key)}</span>
                <h3 className="text-xl font-bold text-white">{category.label}</h3>
                <span className="ml-auto bg-white/10 px-3 py-1 rounded-full text-sm text-gray-300">
                  {category.items.length} {category.items.length === 1 ? 'tool' : 'tools'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.items.map((tech, index) => (
                  <div
                    key={index}
                    className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-black/50 hover:scale-105 transition-all"
                  >
                    {tech}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Tech Stack Summary */}
      <div className="mt-8 bg-black/30 rounded-xl p-6 border border-gray-800/50">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-black text-cyan-400">
              {categories.reduce((sum, cat) => sum + cat.items.length, 0)}
            </div>
            <div className="text-sm text-gray-400 mt-1">Total Technologies</div>
          </div>
          <div>
            <div className="text-3xl font-black text-blue-400">
              {categories.filter(cat => cat.items.length > 0).length}
            </div>
            <div className="text-sm text-gray-400 mt-1">Categories Used</div>
          </div>
          <div>
            <div className="text-3xl font-black text-indigo-400">
              {techStack.frontend.length + techStack.backend.length}
            </div>
            <div className="text-sm text-gray-400 mt-1">Core Stack</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnologyStack;

// Made with Bob