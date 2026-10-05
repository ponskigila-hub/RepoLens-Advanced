import os
import sys
import requests
from typing import Dict, Optional
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for ML imports
sys.path.append(str(Path(__file__).parent.parent))

try:
    from ml.ml_service import MLService
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("Warning: ML service not available. Install ML dependencies with: pip install -r requirements-ml.txt")

load_dotenv()


class AnalysisService:
    """Service for AI-powered repository analysis using IBM Bob with ML scoring"""
    
    def __init__(self):
        self.api_key = os.getenv('IBM_BOB_API_KEY', '')
        self.api_url = os.getenv('IBM_BOB_API_URL', 'https://api.ibm.com/bob/v1')
        
        # Initialize ML service
        self.ml_service = None
        if ML_AVAILABLE:
            try:
                self.ml_service = MLService()
                print("ML service initialized successfully")
            except Exception as e:
                print(f"Warning: Could not initialize ML service: {e}")
        
        if not self.api_key:
            print("Warning: IBM_BOB_API_KEY not set in environment variables")
    
    def analyze_with_ai(self, prompt: str) -> Dict:
        """
        Send analysis prompt to IBM Bob API
        
        Args:
            prompt: Analysis prompt to send
            
        Returns:
            dict with AI response or error
        """
        try:
            # Prepare request headers
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            # Prepare request body
            payload = {
                'prompt': prompt,
                'max_tokens': 2000,
                'temperature': 0.7,
                'model': 'bob-latest'  # Adjust based on actual IBM Bob API
            }
            
            # Make API request
            response = requests.post(
                f'{self.api_url}/analyze',
                headers=headers,
                json=payload,
                timeout=60
            )
            
            # Check response status
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'response': data.get('response', data.get('text', '')),
                    'tokens_used': data.get('tokens_used', 0)
                }
            else:
                return {
                    'success': False,
                    'error': f'API error: {response.status_code} - {response.text}'
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timeout - AI service took too long to respond'
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f'Network error: {str(e)}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }
    
    def mock_analysis(self, prompt: str) -> Dict:
        """
        Mock AI analysis that extracts data from the prompt
        
        Args:
            prompt: Analysis prompt containing repository data
            
        Returns:
            dict with repository-specific mock response
        """
        # Extract information from prompt
        technologies = []
        file_count = 0
        total_lines = 0
        important_files = []
        readme_content = ""
        
        try:
            # Parse technologies
            if "Technologies Detected:" in prompt:
                tech_line = prompt.split("Technologies Detected:")[1].split("\n")[0]
                technologies = [t.strip() for t in tech_line.split(",") if t.strip() and t.strip() != "Not detected"]
            
            # Parse file count
            if "Total Files Analyzed:" in prompt:
                file_count_line = prompt.split("Total Files Analyzed:")[1].split("\n")[0]
                file_count = int(file_count_line.strip())
            
            # Parse total lines
            if "Total Lines of Code:" in prompt:
                lines_line = prompt.split("Total Lines of Code:")[1].split("\n")[0]
                total_lines = int(lines_line.strip())
            
            # Parse important files
            if "IMPORTANT FILES:" in prompt:
                files_section = prompt.split("IMPORTANT FILES:")[1].split("README CONTENT:")[0]
                for line in files_section.split("\n"):
                    if line.strip().startswith("-"):
                        important_files.append(line.strip("- ").strip())
            
            # Parse README
            if "README CONTENT:" in prompt:
                readme_section = prompt.split("README CONTENT:")[1].split("Please provide")[0]
                readme_content = readme_section.strip()
        except Exception as e:
            print(f"Error parsing prompt: {e}")
        
        # Determine project type based on technologies
        project_type = "web application"
        if any(tech in ["React", "Next.js", "Vue", "Angular"] for tech in technologies):
            project_type = "modern web application"
        elif any(tech in ["FastAPI", "Flask", "Django", "Express"] for tech in technologies):
            project_type = "backend API service"
        elif any(tech in ["Python", "JavaScript", "TypeScript"] for tech in technologies):
            project_type = "software project"
        
        # Build tech stack description
        tech_stack = ", ".join(technologies[:5]) if technologies else "various technologies"
        
        # Generate response
        mock_response = f"""1. PROJECT SUMMARY
This repository is a {project_type} built with {tech_stack}. The project contains {file_count} files with approximately {total_lines:,} lines of code. It follows modern development practices and includes proper project structure and configuration files.

2. ARCHITECTURE
The project follows a modular architecture with clear separation of concerns:

Frontend:
{self._get_frontend_tech(technologies)}

Backend:
{self._get_backend_tech(technologies)}

Database:
{self._get_database_tech(technologies)}

Key architectural patterns:
- Component-based structure for maintainability
- Service layer for business logic
- Configuration management for different environments
- Modular design supporting scalability

3. IMPORTANT FILES
{self._format_important_files(important_files)}

4. CODE QUALITY & SUGGESTIONS
Potential improvements identified:
- Add comprehensive unit and integration tests
- Implement error handling and logging middleware
- Add API documentation (Swagger/OpenAPI)
- Consider code splitting for better performance
- Add pre-commit hooks for code quality checks
- Implement CI/CD pipeline for automated testing
- Add security scanning for dependencies

5. ONBOARDING GUIDE
Getting Started:
1. Clone the repository: git clone <repo-url>
2. Install dependencies: npm install / pip install -r requirements.txt
3. Configure environment variables (check .env.example)
4. Review README.md for specific setup instructions
5. Run development server and explore the codebase

Key Concepts:
- Main technologies: {tech_stack}
- Project structure follows industry best practices
- Configuration files manage environment-specific settings

Development Workflow:
1. Create feature branch from main
2. Implement changes following project coding standards
3. Write tests for new features
4. Submit pull request for code review
5. Merge after approval and passing CI checks

Important directories to explore:
- Source code: /src, /app, or /lib
- Configuration: Root level config files
- Tests: /tests or /__tests__
- Documentation: /docs or README.md"""

        return {
            'success': True,
            'response': mock_response,
            'tokens_used': 0,
            'is_mock': True
        }
    
    def _get_frontend_tech(self, technologies):
        """Extract frontend technologies"""
        frontend = [t for t in technologies if t in ["React", "Next.js", "Vue", "Angular", "Svelte", "Tailwind CSS", "CSS", "HTML"]]
        return "- " + "\n- ".join(frontend) if frontend else "- Not detected"
    
    def _get_backend_tech(self, technologies):
        """Extract backend technologies"""
        backend = [t for t in technologies if t in ["FastAPI", "Flask", "Django", "Express", "Node.js", "Python", "Java", "Go"]]
        return "- " + "\n- ".join(backend) if backend else "- Not detected"
    
    def _get_database_tech(self, technologies):
        """Extract database technologies"""
        database = [t for t in technologies if t in ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase"]]
        return "- " + "\n- ".join(database) if database else "- Not detected"
    
    def _format_important_files(self, files):
        """Format important files list"""
        if not files:
            return "- package.json: Project dependencies and scripts\n- README.md: Project documentation\n- Main application files: Core business logic"
        
        formatted = []
        for file in files[:8]:  # Limit to 8 files
            if "(" in file:
                parts = file.split("(")
                filename = parts[0].strip()
                filetype = parts[1].strip(")")
                formatted.append(f"- {filename}: {self._get_file_purpose(filename, filetype)}")
            else:
                formatted.append(f"- {file}: Important project file")
        
        return "\n".join(formatted)
    
    def _get_file_purpose(self, filename, filetype):
        """Get purpose description for a file"""
        purposes = {
            "package.json": "Defines project dependencies and npm scripts",
            "requirements.txt": "Python dependencies specification",
            "README.md": "Project documentation and setup instructions",
            "tsconfig.json": "TypeScript compiler configuration",
            ".env": "Environment variables configuration",
            "docker-compose.yml": "Docker services configuration",
            "Dockerfile": "Container image definition",
            ".gitignore": "Git ignore patterns",
        }
        
        for key, purpose in purposes.items():
            if key in filename.lower():
                return purpose
        
        if filetype == "Python":
            return "Python module with core logic"
        elif filetype in ["JavaScript", "TypeScript"]:
            return "JavaScript/TypeScript module"
        elif filetype == "JSON":
            return "Configuration file"
        elif filetype == "YAML":
            return "Configuration file"
        else:
            return f"{filetype} file"
    
    def get_ml_scores(self, scan_result: Dict, github_metadata: Optional[Dict] = None) -> Dict:
        """
        Get ML-based repository quality scores
        
        Args:
            scan_result: Result from file_scanner.scan()
            github_metadata: Optional GitHub API metadata
            
        Returns:
            dict with ML scores or empty dict if ML not available
        """
        if not self.ml_service:
            return {}
        
        try:
            ml_result = self.ml_service.analyze_repository(scan_result, github_metadata)
            return ml_result
        except Exception as e:
            print(f"Error getting ML scores: {e}")
            return {}
    
    def analyze(self, prompt: str, use_mock: bool = False, scan_result: Optional[Dict] = None, github_metadata: Optional[Dict] = None) -> Dict:
        """
        Analyze repository using AI or mock data, with ML scoring
        
        Args:
            prompt: Analysis prompt
            use_mock: Whether to use mock data (for testing)
            scan_result: Repository scan result for ML scoring
            github_metadata: Optional GitHub metadata for ML scoring
            
        Returns:
            dict with analysis result including ML scores
        """
        # Get ML scores first if available
        ml_results = {}
        if scan_result and self.ml_service:
            ml_results = self.get_ml_scores(scan_result, github_metadata)
        
        # Get LLM analysis
        if use_mock or not self.api_key:
            if not self.api_key:
                print("Using mock analysis - no API key configured")
            llm_result = self.mock_analysis(prompt)
        else:
            llm_result = self.analyze_with_ai(prompt)
        
        # Add ML scores to result
        if ml_results:
            llm_result['ml_scores'] = ml_results.get('ml_scores', {})
            llm_result['ml_feature_summary'] = ml_results.get('feature_summary', {})
            llm_result['ml_model_used'] = ml_results.get('model_used', 'none')
            llm_result['feature_contributions'] = ml_results.get('feature_contributions', {})
            llm_result['confidence'] = ml_results.get('confidence', 0.0)
        
        return llm_result

# Made with Bob
