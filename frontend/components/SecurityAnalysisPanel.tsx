import React from 'react';
import { AnalysisResult } from '@/types/analysis';

interface SecurityAnalysisPanelProps {
  result: AnalysisResult;
}

const SecurityAnalysisPanel: React.FC<SecurityAnalysisPanelProps> = ({ result }) => {
  const securityIssues = result.security_analysis;
  
  if (!securityIssues || securityIssues.length === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-950/30 via-green-950/30 to-teal-950/30 backdrop-blur-xl rounded-2xl p-8 border border-emerald-500/20 shadow-2xl">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛡️</div>
          <h3 className="text-2xl font-bold text-emerald-400 mb-2">All Clear!</h3>
          <p className="text-gray-400">No security issues detected in this repository</p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string): string => {
    const lower = severity.toLowerCase();
    if (lower.includes('critical') || lower.includes('high')) {
      return 'bg-rose-500/20 border-rose-500/30 text-rose-300';
    }
    if (lower.includes('medium') || lower.includes('moderate')) {
      return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
    }
    return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
  };

  const getSeverityIcon = (severity: string): string => {
    const lower = severity.toLowerCase();
    if (lower.includes('critical') || lower.includes('high')) return '🚨';
    if (lower.includes('medium') || lower.includes('moderate')) return '⚠️';
    return 'ℹ️';
  };

  const criticalCount = securityIssues.filter(i => 
    i.severity.toLowerCase().includes('critical') || i.severity.toLowerCase().includes('high')
  ).length;

  const mediumCount = securityIssues.filter(i => 
    i.severity.toLowerCase().includes('medium') || i.severity.toLowerCase().includes('moderate')
  ).length;

  const lowCount = securityIssues.length - criticalCount - mediumCount;

  return (
    <div className="bg-gradient-to-br from-rose-950/30 via-red-950/30 to-orange-950/30 backdrop-blur-xl rounded-2xl p-8 border border-rose-500/20 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="text-4xl">🔒</span>
          <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
            Security Analysis
          </span>
        </h2>
        <p className="text-gray-400 text-sm">Potential security vulnerabilities and recommendations</p>
      </div>

      {/* Security Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-rose-950/50 rounded-xl p-5 border border-rose-500/30 text-center">
          <div className="text-4xl font-black text-rose-400">{criticalCount}</div>
          <div className="text-sm text-gray-400 mt-1">Critical Issues</div>
        </div>
        <div className="bg-amber-950/50 rounded-xl p-5 border border-amber-500/30 text-center">
          <div className="text-4xl font-black text-amber-400">{mediumCount}</div>
          <div className="text-sm text-gray-400 mt-1">Medium Issues</div>
        </div>
        <div className="bg-blue-950/50 rounded-xl p-5 border border-blue-500/30 text-center">
          <div className="text-4xl font-black text-blue-400">{lowCount}</div>
          <div className="text-sm text-gray-400 mt-1">Low Priority</div>
        </div>
      </div>

      {/* Security Issues List */}
      <div className="space-y-4">
        {securityIssues.map((issue, index) => (
          <div
            key={index}
            className="bg-black/30 rounded-xl p-6 border border-gray-800/50 hover:border-rose-500/30 transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Severity Icon */}
              <div className="text-4xl flex-shrink-0">
                {getSeverityIcon(issue.severity)}
              </div>

              {/* Issue Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{issue.type}</h3>
                      <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{issue.description}</p>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-gradient-to-r from-emerald-950/30 to-green-950/30 rounded-lg p-4 border border-emerald-500/20">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 text-lg">💡</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-emerald-300 mb-1">Recommendation</h4>
                      <p className="text-gray-300 text-sm">{issue.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security Best Practices */}
      <div className="mt-8 bg-gradient-to-r from-rose-950/50 to-orange-950/50 rounded-xl p-6 border border-rose-500/20">
        <div className="flex items-start gap-4">
          <span className="text-3xl">🛡️</span>
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Security Best Practices</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>Always validate and sanitize user inputs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>Keep dependencies up to date and scan for vulnerabilities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>Use environment variables for sensitive data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>Implement proper authentication and authorization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>Enable HTTPS and secure communication protocols</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAnalysisPanel;

// Made with Bob