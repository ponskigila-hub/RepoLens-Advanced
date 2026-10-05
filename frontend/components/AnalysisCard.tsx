import { AnalysisResult } from '@/types/analysis';
import MLScoresCard from './MLScoresCard';
import FeatureContributionCard from './FeatureContributionCard';
import RepositorySummary from './RepositorySummary';
import EngineeringSummary from './EngineeringSummary';
import ArchitectureVisualization from './ArchitectureVisualization';
import TechnologyStack from './TechnologyStack';
import ImportantFilesExplorer from './ImportantFilesExplorer';
import SecurityAnalysisPanel from './SecurityAnalysisPanel';
import OnboardingGuide from './OnboardingGuide';
import ImprovementSuggestions from './ImprovementSuggestions';

interface AnalysisCardProps {
  result: AnalysisResult;
}

export default function AnalysisCard({ result }: AnalysisCardProps) {
  if (!result.success) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">❌ Analysis Failed</h3>
        <p className="text-red-300">{result.error || 'An unknown error occurred'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ML Scores Section - Featured at Top */}
      {result.ml_scores && (
        <MLScoresCard
          scores={result.ml_scores}
          modelUsed={result.repo_info?.ml_model_used}
        />
      )}

      {/* Feature Contribution Analysis - ML Explainability */}
      {result.ml_scores?.feature_contributions && result.ml_scores?.confidence && (
        <FeatureContributionCard
          contributions={result.ml_scores.feature_contributions}
          confidence={result.ml_scores.confidence}
        />
      )}

      {/* Repository Summary - AI-Generated Overview */}
      {result.repository_overview && (
        <RepositorySummary result={result} />
      )}

      {/* Engineering Summary Dashboard */}
      {result.creator_information && result.final_summary && (
        <EngineeringSummary result={result} />
      )}

      {/* Technology Stack Visualization */}
      {result.technology_stack && (
        <TechnologyStack result={result} />
      )}

      {/* Architecture Visualization */}
      {result.architecture_analysis && (
        <ArchitectureVisualization result={result} />
      )}

      {/* Important Files Explorer */}
      {result.important_files && result.important_files.length > 0 && (
        <ImportantFilesExplorer result={result} />
      )}

      {/* Security Analysis Panel */}
      <SecurityAnalysisPanel result={result} />

      {/* Developer Onboarding Guide */}
      {result.onboarding_guide && result.onboarding_guide.length > 0 && (
        <OnboardingGuide result={result} />
      )}

      {/* AI Improvement Suggestions */}
      {result.improvement_suggestions && result.improvement_suggestions.length > 0 && (
        <ImprovementSuggestions result={result} />
      )}

      {/* Repository Info Banner - Compact Stats */}
      {result.repo_info && (
        <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">📦</span>
              <div>
                <div className="text-gray-400 text-xs">Repository</div>
                <div className="font-semibold text-gray-200">{result.repo_info.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📄</span>
              <div>
                <div className="text-gray-400 text-xs">Files</div>
                <div className="text-gray-200">{result.repo_info.file_count}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <div>
                <div className="text-gray-400 text-xs">Lines</div>
                <div className="text-gray-200">{result.repo_info.total_lines.toLocaleString()}</div>
              </div>
            </div>
            {result.repo_info.is_mock && (
              <span className="px-3 py-1 bg-yellow-900/30 text-yellow-300 rounded-full text-xs font-medium">
                🧪 Mock Data
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function ScoreCard({ title, score, icon }: { title: string; score: number; icon: string }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    if (score >= 60) return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    return 'from-red-500/20 to-pink-500/20 border-red-500/30';
  };

  const getTextColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-gradient-to-br ${getColor(score)} border rounded-xl p-6 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className={`text-3xl font-bold ${getTextColor(score)}`}>{score}</span>
      </div>
      <div className="text-gray-300 text-sm font-medium">{title}</div>
      <div className="mt-3 bg-gray-900/50 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function SectionCard({ title, children, collapsible = false }: { title: string; children: React.ReactNode; collapsible?: boolean }) {
  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
      <h3 className="text-xl font-bold text-gray-100 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <span className="text-gray-400 text-sm font-medium min-w-[140px]">{label}:</span>
      <span className={`${highlight ? 'text-blue-400 font-semibold' : 'text-gray-200'} text-sm flex-1`}>{value}</span>
    </div>
  );
}

function TechCategory({ title, techs, color }: { title: string; techs: string[]; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    pink: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-300 mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {techs.map((tech, index) => (
          <span key={index} className={`px-3 py-1 rounded-full text-sm font-medium border ${colorMap[color]}`}>
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}

function IssueCard({ type, severity, description, action, icon }: {
  type: string;
  severity: string;
  description: string;
  action: string;
  icon: string;
}) {
  const getSeverityColor = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes('high') || s.includes('critical')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (s.includes('medium') || s.includes('moderate')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-green-500/20 text-green-300 border-green-500/30';
  };

  return (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-200">{type}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(severity)}`}>
              {severity}
            </span>
          </div>
          <p className="text-gray-300 text-sm mb-2">{description}</p>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-400">→</span>
            <span className="text-gray-400">{action}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
