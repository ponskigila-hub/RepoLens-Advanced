import React from 'react';
import { AnalysisResult } from '@/types/analysis';

interface ImportantFilesExplorerProps {
  result: AnalysisResult;
}

const ImportantFilesExplorer: React.FC<ImportantFilesExplorerProps> = ({ result }) => {
  const files = result.important_files;
  
  if (!files || files.length === 0) return null;

  const getImportanceColor = (importance: string): string => {
    const lower = importance.toLowerCase();
    if (lower.includes('critical') || lower.includes('high')) {
      return 'bg-rose-500/20 border-rose-500/30 text-rose-300';
    }
    if (lower.includes('medium') || lower.includes('moderate')) {
      return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
    }
    return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
  };

  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      'ts': '📘',
      'tsx': '⚛️',
      'js': '📜',
      'jsx': '⚛️',
      'py': '🐍',
      'json': '📋',
      'md': '📝',
      'yml': '⚙️',
      'yaml': '⚙️',
      'env': '🔐',
      'config': '⚙️',
      'lock': '🔒',
      'css': '🎨',
      'html': '🌐',
      'sql': '🗄️',
      'sh': '💻',
      'dockerfile': '🐳',
    };
    return icons[ext || ''] || '📄';
  };

  return (
    <div className="bg-gradient-to-br from-violet-950/30 via-purple-950/30 to-fuchsia-950/30 backdrop-blur-xl rounded-2xl p-8 border border-violet-500/20 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="text-4xl">📂</span>
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Important Files
          </span>
        </h2>
        <p className="text-gray-400 text-sm">Key files to understand this repository</p>
      </div>

      {/* Files Grid */}
      <div className="space-y-4">
        {files.map((file, index) => (
          <div
            key={index}
            className="bg-black/30 rounded-xl p-6 border border-gray-800/50 hover:border-violet-500/30 transition-all group"
          >
            <div className="flex items-start gap-4">
              {/* File Icon */}
              <div className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">
                {getFileIcon(file.file)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 font-mono truncate">
                      {file.file}
                    </h3>
                    <p className="text-gray-400 text-sm">{file.purpose}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${getImportanceColor(file.importance)}`}>
                    {file.importance}
                  </div>
                </div>

                {/* File Path Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  {file.file.split('/').map((part, i, arr) => (
                    <React.Fragment key={i}>
                      <span className={i === arr.length - 1 ? 'text-violet-400 font-semibold' : ''}>
                        {part}
                      </span>
                      {i < arr.length - 1 && <span className="text-gray-700">/</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-rose-950/30 rounded-xl p-5 border border-rose-500/20 text-center">
          <div className="text-3xl font-black text-rose-400">
            {files.filter(f => f.importance.toLowerCase().includes('critical') || f.importance.toLowerCase().includes('high')).length}
          </div>
          <div className="text-sm text-gray-400 mt-1">Critical Files</div>
        </div>
        <div className="bg-amber-950/30 rounded-xl p-5 border border-amber-500/20 text-center">
          <div className="text-3xl font-black text-amber-400">
            {files.filter(f => f.importance.toLowerCase().includes('medium') || f.importance.toLowerCase().includes('moderate')).length}
          </div>
          <div className="text-sm text-gray-400 mt-1">Medium Priority</div>
        </div>
        <div className="bg-violet-950/30 rounded-xl p-5 border border-violet-500/20 text-center">
          <div className="text-3xl font-black text-violet-400">
            {files.length}
          </div>
          <div className="text-sm text-gray-400 mt-1">Total Files</div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-6 bg-gradient-to-r from-violet-950/50 to-fuchsia-950/50 rounded-xl p-5 border border-violet-500/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="text-sm font-bold text-white mb-2">Quick Start Tip</h4>
            <p className="text-gray-300 text-sm">
              Start by reviewing the critical files first. They contain the core logic and architecture decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportantFilesExplorer;

// Made with Bob