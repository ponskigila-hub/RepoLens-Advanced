export interface AnalysisRequest {
  github_url: string;
  include_llm?: boolean;
  use_mock?: boolean;
}

export interface ScoreComponent {
  name: string;
  score: number;
  weight: number;
  evidence: string;
}

export interface DynamicScore {
  score: number;
  components: ScoreComponent[];
}

export interface RepositoryFile {
  path: string;
  name?: string;
  extension?: string;
  category: string;
  size_bytes?: number;
  lines?: number;
  language?: string;
}

export interface RepositoryFolder {
  path: string;
  file_count: number;
  source_files: number;
  lines: number;
  size_bytes: number;
}

export interface ImprovementSuggestion {
  category: string;
  priority: string;
  suggestion: string;
  impact: string;
}

export interface QuickFixItem {
  id: string;
  file_pattern: string;
  complete: boolean;
  status: 'present' | 'missing';
  evidence: string;
  instruction: string;
  production_readiness_component: string;
}

export interface QuickFixChecklist {
  completed: number;
  total: number;
  items: QuickFixItem[];
  note: string;
}

export interface AnalysisMetrics {
  files?: { total?: number; source?: number; tests?: number; scanned_source?: number };
  lines?: { source_and_tests?: number; source?: number; tests?: number; comments?: number; comment_to_source_ratio?: number };
  ast?: {
    python_files_parsed?: number;
    syntax_error_files?: number;
    functions?: number;
    classes?: number;
    imports?: number;
    average_cyclomatic_complexity?: number | null;
    maximum_cyclomatic_complexity?: number | null;
    complexity_method?: string;
  };
  tests?: { files?: number; coverage_percent?: number | null; coverage_is_measured?: boolean };
  dependencies?: { count?: number; names?: string[]; manifests?: string[]; lockfiles?: string[] };
  artifacts?: {
    has_readme?: boolean;
    has_license?: boolean;
    has_github_workflow?: boolean;
    has_dockerfile?: boolean;
    has_gitignore?: boolean;
    has_root_readme?: boolean;
    has_root_license?: boolean;
    has_root_dockerfile?: boolean;
    has_root_gitignore?: boolean;
    has_tests?: boolean;
    has_ci?: boolean;
    has_docker?: boolean;
    has_env_example?: boolean;
    has_coverage_report?: boolean;
    has_security_workflow?: boolean;
    github_workflows?: string[];
    checklist_paths?: Record<string, string[]>;
  };
  language_breakdown?: Record<string, number>;
  maintenance_signals?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AnalysisResult {
  success: boolean;
  error?: string;
  schema_version?: string;
  repository?: { owner: string; name: string; full_name: string; url: string; clone_depth: number };
  repo_info?: { name: string; technologies: string[]; file_count: number; total_lines: number; is_mock?: boolean; ml_model_used?: string };
  metrics?: AnalysisMetrics;
  scores?: Record<string, DynamicScore>;
  score_methodology?: { version?: string; method?: string; score_range?: number[]; not_used?: string[]; coverage_note?: string };
  file_breakdown?: { total?: number; by_category?: Record<string, number>; by_language?: Record<string, number>; by_extension?: Record<string, number>; sample_limit?: number };
  files?: RepositoryFile[];
  folder_breakdown?: RepositoryFolder[];
  insights?: {
    summary?: string;
    strengths?: string[];
    risks?: string[];
    recommendations?: ImprovementSuggestion[];
    score_snapshot?: Record<string, number>;
    scan_warnings?: string[];
    llm?: { status?: string; provider?: string | null; model?: string | null; text?: string | null; error?: string | null };
  };
  quick_fix_checklist?: QuickFixChecklist;
  ml_scores?: {
    overall_quality: number;
    maintainability: number;
    scalability: number;
    architecture: number;
    production_readiness: number;
    confidence?: number;
    model_used?: string;
    feature_contributions?: {
      positive_factors: Array<{ factor: string; impact: string; description: string }>;
      negative_factors: Array<{ factor: string; impact: string; description: string }>;
      top_contributing_features: Array<{ name: string; score: number; weight?: number }>;
    };
  };
  repository_overview?: {
    name?: string;
    purpose?: string;
    problem_solved?: string;
    application_type?: string;
    target_users?: string;
    domain?: string;
    summary_source?: string;
    summary_confidence?: 'high' | 'medium' | 'low';
    evidence?: string[];
  };
  architecture_overview?: { pattern?: string; description?: string; folder_structure?: string; data_flow?: string; scalability?: string };
  architecture_analysis?: {
    architecture_type?: string;
    architecture_explanation?: string;
    design_patterns?: string[];
    folder_structure?: { key_directories?: string[]; structure_explanation?: string };
    [key: string]: unknown;
  };
  improvement_suggestions?: ImprovementSuggestion[];
}

export interface SavedReport {
  id: string;
  repository: { owner: string; name: string; full_name: string };
  quality_score: number;
  created_at: string;
  report_url: string;
  badge_url: string;
  visibility: 'public_unlisted';
}

export interface PublicReport extends SavedReport {
  result: AnalysisResult;
}
