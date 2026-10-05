export interface AnalysisRequest {
  github_url: string;
  use_mock?: boolean;
}

export interface RepositoryOverview {
  name: string;
  purpose: string;
  problem_solved: string;
  application_type: string;
  target_users: string;
  domain: string;
}

export interface CreatorInfo {
  owner: string;
  maturity_level: string;
  coding_style: string;
  open_source_ready: boolean;
  collaboration_ready: boolean;
}

export interface TechnologyStack {
  frontend: string[];
  backend: string[];
  database: string[];
  deployment: string[];
  testing: string[];
  other: string[];
}

export interface ArchitectureOverview {
  pattern: string;
  description: string;
  folder_structure: string;
  data_flow: string;
  scalability: string;
}

export interface FolderStructure {
  structure_quality: string;
  organization_level: string;
  key_directories: string[];
  structure_explanation: string;
}

export interface CodeOrganization {
  modularity_level: string;
  separation_of_concerns: string;
  reusability_score: string;
}

export interface ScalabilityAnalysis {
  horizontal_scalability: string;
  vertical_scalability: string;
  scalability_notes: string;
}

export interface ArchitectureAnalysis {
  architecture_type: string;
  architecture_explanation: string;
  design_patterns: string[];
  folder_structure: FolderStructure;
  code_organization: CodeOrganization;
  scalability: ScalabilityAnalysis;
  strengths: string[];
  weaknesses: string[];
}

export interface ImportantFile {
  file: string;
  purpose: string;
  importance: string;
}

export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
}

export interface CodeQualityIssue {
  type: string;
  severity: string;
  description: string;
  suggestion: string;
}

export interface SecurityIssue {
  type: string;
  severity: string;
  description: string;
  recommendation: string;
}

export interface PerformanceIssue {
  type: string;
  impact: string;
  description: string;
  solution: string;
}

export interface ImprovementSuggestion {
  category: string;
  priority: string;
  suggestion: string;
  impact: string;
}

export interface MLScores {
  overall_quality: number;
  maintainability: number;
  scalability: number;
  architecture: number;
  production_readiness: number;
  feature_contributions?: {
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
  };
  confidence?: number;
  model_used?: string;
}

export interface FinalSummary {
  repository_quality_score: number;
  architecture_quality_score: number;
  maintainability_score: number;
  onboarding_difficulty: string;
  scalability_level: string;
  production_readiness: string;
  final_assessment: string;
}

export interface RepoInfo {
  name: string;
  technologies: string[];
  file_count: number;
  total_lines: number;
  is_mock?: boolean;
  ml_model_used?: string;
}

export interface AnalysisResult {
  success: boolean;
  repository_overview?: RepositoryOverview;
  creator_information?: CreatorInfo;
  technology_stack?: TechnologyStack;
  architecture_overview?: ArchitectureOverview;
  architecture_analysis?: ArchitectureAnalysis;
  important_files?: ImportantFile[];
  onboarding_guide?: OnboardingStep[];
  code_quality_analysis?: CodeQualityIssue[];
  security_analysis?: SecurityIssue[];
  performance_analysis?: PerformanceIssue[];
  improvement_suggestions?: ImprovementSuggestion[];
  final_summary?: FinalSummary;
  ml_scores?: MLScores;
  error?: string;
  repo_info?: RepoInfo;
}

export interface AnalysisState {
  isLoading: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

// Made with Bob
