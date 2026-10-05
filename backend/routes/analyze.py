from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.repo_cloner import RepoCloner
from services.file_scanner import FileScanner
from services.prompt_builder import PromptBuilder
from services.analysis_service import AnalysisService
from utils.cleanup import CleanupManager

router = APIRouter()

# Initialize services
repo_cloner = RepoCloner()
prompt_builder = PromptBuilder()
analysis_service = AnalysisService()
cleanup_manager = CleanupManager()


class AnalyzeRequest(BaseModel):
    github_url: str
    use_mock: Optional[bool] = False


class RepositoryOverview(BaseModel):
    name: str
    purpose: str
    problem_solved: str
    application_type: str
    target_users: str
    domain: str


class CreatorInfo(BaseModel):
    owner: str
    maturity_level: str
    coding_style: str
    open_source_ready: bool
    collaboration_ready: bool


class TechnologyStack(BaseModel):
    frontend: List[str]
    backend: List[str]
    database: List[str]
    deployment: List[str]
    testing: List[str]
    other: List[str]


class ArchitectureOverview(BaseModel):
    pattern: str
    description: str
    folder_structure: str
    data_flow: str
    scalability: str


class ImportantFile(BaseModel):
    file: str
    purpose: str
    importance: str


class OnboardingStep(BaseModel):
    step: int
    title: str
    description: str


class CodeQualityIssue(BaseModel):
    type: str
    severity: str
    description: str
    suggestion: str


class SecurityIssue(BaseModel):
    type: str
    severity: str
    description: str
    recommendation: str


class PerformanceIssue(BaseModel):
    type: str
    impact: str
    description: str
    solution: str


class ImprovementSuggestion(BaseModel):
    category: str
    priority: str
    suggestion: str
    impact: str


class MLScores(BaseModel):
    overall_quality: float
    maintainability: float
    scalability: float
    architecture: float
    production_readiness: float


class FinalSummary(BaseModel):
    repository_quality_score: int
    architecture_quality_score: int
    maintainability_score: int
    onboarding_difficulty: str
    scalability_level: str
    production_readiness: str
    final_assessment: str


class AnalyzeResponse(BaseModel):
    success: bool
    repository_overview: Optional[RepositoryOverview] = None
    creator_information: Optional[CreatorInfo] = None
    technology_stack: Optional[TechnologyStack] = None
    architecture_overview: Optional[ArchitectureOverview] = None
    important_files: Optional[List[ImportantFile]] = None
    onboarding_guide: Optional[List[OnboardingStep]] = None
    code_quality_analysis: Optional[List[CodeQualityIssue]] = None
    security_analysis: Optional[List[SecurityIssue]] = None
    performance_analysis: Optional[List[PerformanceIssue]] = None
    improvement_suggestions: Optional[List[ImprovementSuggestion]] = None
    final_summary: Optional[FinalSummary] = None
    ml_scores: Optional[MLScores] = None
    error: Optional[str] = None
    repo_info: Optional[Dict] = None


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_repository(request: AnalyzeRequest):
    """
    Analyze a GitHub repository and return AI-powered insights
    
    Args:
        request: AnalyzeRequest with github_url and optional use_mock flag
        
    Returns:
        AnalyzeResponse with analysis results or error
    """
    local_path = None
    
    try:
        # Step 1: Clone repository
        print(f"Step 1: Cloning repository: {request.github_url}")
        clone_result = repo_cloner.clone_repository(request.github_url)
        
        if not clone_result['success']:
            raise HTTPException(
                status_code=400,
                detail=clone_result['error']
            )
        
        local_path = clone_result['local_path']
        repo_name = clone_result['repo_name']
        
        # Step 2: Scan repository files
        print(f"Step 2: Scanning repository files")
        file_scanner = FileScanner(local_path)
        scan_result = file_scanner.scan()
        
        if not scan_result['success']:
            raise HTTPException(
                status_code=500,
                detail=scan_result['error']
            )
        
        # Step 3: Get ML predictions first
        print(f"Step 3: Getting ML predictions")
        ml_results = analysis_service.get_ml_scores(scan_result)
        
        # Step 4: Build AI prompt with ML results
        print(f"Step 4: Building analysis prompt with ML context")
        prompt = prompt_builder.build_analysis_prompt(scan_result, ml_results)
        
        # Step 5: Get AI analysis
        print(f"Step 5: Getting AI analysis")
        ai_result = analysis_service.analyze(
            prompt,
            use_mock=bool(request.use_mock),
            scan_result=scan_result
        )
        
        if not ai_result['success']:
            raise HTTPException(
                status_code=500,
                detail=ai_result['error']
            )
        
        # Step 6: Format response
        print(f"Step 6: Formatting response")
        formatted_analysis = prompt_builder.format_comprehensive_analysis(
            ai_result['response'],
            scan_result,
            repo_name
        )
        
        # Prepare repository info
        repo_info = {
            'name': repo_name,
            'technologies': scan_result.get('technologies', []),
            'file_count': scan_result.get('file_count', 0),
            'total_lines': scan_result.get('total_lines', 0),
            'is_mock': ai_result.get('is_mock', False),
            'ml_model_used': ai_result.get('ml_model_used', 'none')
        }
        
        # Extract ML scores
        ml_scores_data = ai_result.get('ml_scores', {})
        ml_scores = None
        if ml_scores_data:
            ml_scores = MLScores(
                overall_quality=ml_scores_data.get('overall_quality', 0.0),
                maintainability=ml_scores_data.get('maintainability', 0.0),
                scalability=ml_scores_data.get('scalability', 0.0),
                architecture=ml_scores_data.get('architecture', 0.0),
                production_readiness=ml_scores_data.get('production_readiness', 0.0)
            )
        
        # Step 7: Cleanup
        print(f"Step 7: Cleaning up temporary files")
        if local_path:
            repo_cloner.cleanup_repo(local_path)
        
        return AnalyzeResponse(
            success=True,
            repository_overview=formatted_analysis.get('repository_overview'),
            creator_information=formatted_analysis.get('creator_information'),
            technology_stack=formatted_analysis.get('technology_stack'),
            architecture_overview=formatted_analysis.get('architecture_overview'),
            important_files=formatted_analysis.get('important_files'),
            onboarding_guide=formatted_analysis.get('onboarding_guide'),
            code_quality_analysis=formatted_analysis.get('code_quality_analysis'),
            security_analysis=formatted_analysis.get('security_analysis'),
            performance_analysis=formatted_analysis.get('performance_analysis'),
            improvement_suggestions=formatted_analysis.get('improvement_suggestions'),
            final_summary=formatted_analysis.get('final_summary'),
            ml_scores=ml_scores,
            repo_info=repo_info
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        if local_path:
            repo_cloner.cleanup_repo(local_path)
        raise
        
    except Exception as e:
        # Cleanup on error
        if local_path:
            repo_cloner.cleanup_repo(local_path)
        
        print(f"Error during analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "RepoLens AI Backend"
    }


@router.post("/cleanup")
async def cleanup_temp_repos():
    """Cleanup old temporary repositories"""
    try:
        cleaned = cleanup_manager.cleanup_old_repos(max_age_hours=24)
        return {
            "success": True,
            "cleaned_count": len(cleaned),
            "cleaned_repos": cleaned
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cleanup error: {str(e)}"
        )

# Made with Bob
