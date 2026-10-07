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

export interface FilePreview {
  path: string;
  content: string;
  size_bytes: number;
  redacted_values: number;
  note: string;
}

export interface ProjectGuide {
  features: Array<{ text: string; source: string }>;
  feature_source?: string | null;
  feature_note?: string;
  commands: Array<{ title: string; command: string; source: string; declared_command?: string }>;
  scripts: Array<{ name: string; command: string; declared_command: string; source: string }>;
  environment_variables: Array<{ name: string; source: string }>;
  language_versions: Array<{ name: string; version: string; source: string }>;
  direct_dependencies: Array<{ name: string; version: string; manifest: string; section: string }>;
  environment_note?: string;
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
  maintenance_signals?: {
    large_source_files_over_500_lines?: Array<{ path: string; lines: number }>;
    todo_markers?: number;
    todo_samples?: Array<{ path: string; line: number; marker: string }>;
    credential_literal_candidates?: Array<{ path: string; line: number; reason: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface FrameworkSignal {
  name: string;
  role: string;
  packages: string[];
  evidence: Array<{ manifest: string; section: string }>;
}

export interface FrameworkDetection {
  status: 'detected' | 'not_detected' | 'unavailable';
  manifests: string[];
  parsed_manifests: string[];
  note: string;
}

export interface CodeSymbol {
  path: string;
  line: number;
  kind: 'function' | 'class';
  name: string;
}

export interface CodeOverview {
  status: 'available' | 'unavailable';
  summary: string | null;
  source_files: number;
  test_files: number;
  languages: Array<{ name: string; files: number }>;
  frameworks: string[];
  directory_roles: Array<{ path: string; role: string; source_files: number; file_count: number }>;
  entrypoint_candidates: string[];
  symbols: {
    status: 'available' | 'unavailable';
    count: number;
    parsed_files: number;
    sample_limit: number;
    truncated: boolean;
    items: CodeSymbol[];
    method: string;
  };
  readme_framework_crosscheck: {
    status: 'compared' | 'no_recognized_framework_names' | 'unavailable';
    items: Array<{
      name: string;
      readme_mentions: boolean;
      manifest_declared: boolean;
      status: 'mentioned_and_declared' | 'readme_only' | 'manifest_only';
    }>;
    note: string;
  };
  limitations: string;
}

export interface GitHubMetadata {
  status: 'available' | 'partial' | 'unavailable';
  created_at: string | null;
  owner: {
    login: string;
    type: string | null;
    html_url: string;
    avatar_url: string | null;
  } | null;
  contributors: Array<{
    login: string;
    contributions: number | null;
    html_url: string;
    avatar_url: string | null;
  }>;
  contributors_status: 'available' | 'none_reported' | 'unavailable';
  contributors_truncated: boolean;
  contributors_limit: number;
  source: string;
  note: string;
}

export interface AnalysisResult {
  success: boolean;
  error?: string;
  schema_version?: string;
  repository?: { owner: string; name: string; full_name: string; url: string; clone_depth: number };
  repo_info?: { name: string; technologies: string[]; file_count: number; total_lines: number; is_mock?: boolean; ml_model_used?: string };
  technology_stack?: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    deployment?: string[];
    testing?: string[];
    other?: string[];
    frameworks?: FrameworkSignal[];
    framework_detection?: FrameworkDetection;
  };
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
  project_guide?: ProjectGuide;
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
    purpose?: string | null;
    purpose_status?: 'documented' | 'unavailable';
    purpose_note?: string;
    problem_solved?: string | null;
    application_type?: string | null;
    application_type_status?: 'inferred_from_declared_frameworks' | 'unavailable';
    application_type_note?: string;
    target_users?: string | null;
    domain?: string | null;
    summary_source?: string;
    summary_confidence?: 'high' | 'medium' | 'low' | null;
    evidence?: string[];
  };
  code_overview?: CodeOverview;
  github_metadata?: GitHubMetadata;
  architecture_overview?: { pattern?: string; description?: string; folder_structure?: string; data_flow?: string; scalability?: string };
  architecture_analysis?: {
    architecture_type?: string;
    architecture_explanation?: string;
    design_patterns?: string[];
    folder_structure?: { key_directories?: string[]; structure_explanation?: string };
    [key: string]: unknown;
  };
  improvement_suggestions?: ImprovementSuggestion[];
  code_quality_analysis?: Array<{ type: string; severity: string; description: string; suggestion?: string }>;
  security_analysis?: Array<{ type: string; severity: string; description: string; recommendation?: string }>;
  performance_analysis?: Array<{ type: string; impact: string; description: string; solution?: string }>;
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

export interface RepositoryHistory {
  status: 'available' | 'partial' | 'unavailable';
  source: string;
  activity_status: 'available' | 'pending' | 'unavailable';
  weekly_activity: Array<{ week_start: string; commits: number }>;
  activity_note: string;
  recent_commits: Array<{
    sha: string;
    short_sha: string;
    date: string | null;
    message: string;
    url: string;
    additions: number | null;
    deletions: number | null;
    changed_files: number | null;
    complexity_change: {
      added_decision_points: number;
      removed_decision_points: number;
      net_decision_points: number;
      source_files_changed: number;
      source_files_with_patch: number;
      patch_coverage_percent: number;
    } | null;
  }>;
  complexity_trend: Array<{
    sha: string;
    date: string;
    message: string;
    net_decision_points: number;
    patch_coverage_percent: number;
  }>;
  complexity_note: string;
  commit_limit: number;
  complexity_sample_limit: number;
  note: string;
}

export interface PublicReport extends SavedReport {
  result: AnalysisResult;
}
