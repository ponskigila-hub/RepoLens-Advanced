from typing import Dict, List, Optional


class PromptBuilder:
    """Service for building AI analysis prompts with ML-grounding"""
    
    def build_analysis_prompt(self, scan_result: Dict, ml_results: Optional[Dict] = None) -> str:
        """
        Build a comprehensive senior-engineer-level prompt for deep repository analysis
        
        Args:
            scan_result: Result from FileScanner.scan()
            
        Returns:
            Formatted prompt string for AI analysis
        """
        folder_structure = scan_result.get('folder_structure', [])
        important_files = scan_result.get('important_files', [])
        technologies = scan_result.get('technologies', [])
        readme_content = scan_result.get('readme_content', '')
        file_count = scan_result.get('file_count', 0)
        total_lines = scan_result.get('total_lines', 0)
        
        # Build folder structure section
        structure_text = '\n'.join(folder_structure[:50])  # Limit to 50 lines
        
        # Build important files section
        files_text = '\n'.join([
            f"- {f['path']} ({f['type']})"
            for f in important_files[:15]  # Limit to 15 files
        ])
        
        # Build technologies section
        tech_text = ', '.join(technologies) if technologies else 'Not detected'
        
        # Build ML-grounded context if available
        ml_context = ""
        if ml_results:
            ml_scores = ml_results.get('ml_scores', {})
            feature_contrib = ml_results.get('feature_contributions', {})
            confidence = ml_results.get('confidence', 0.5)
            
            positive_factors = feature_contrib.get('positive_factors', [])
            negative_factors = feature_contrib.get('negative_factors', [])
            
            ml_context = f"""
==================================================
MACHINE LEARNING ANALYSIS RESULTS
==================================================

The repository has been analyzed using machine learning models trained on thousands of GitHub repositories.
Your explanations MUST be grounded in these ML predictions and feature contributions.

ML QUALITY SCORES (0-100):
- Overall Quality: {ml_scores.get('overall_quality', 0)}/100
- Maintainability: {ml_scores.get('maintainability', 0)}/100
- Scalability: {ml_scores.get('scalability', 0)}/100
- Architecture: {ml_scores.get('architecture', 0)}/100
- Production Readiness: {ml_scores.get('production_readiness', 0)}/100

PREDICTION CONFIDENCE: {int(confidence * 100)}%

POSITIVE CONTRIBUTING FACTORS (ML-Detected):
{chr(10).join([f"- {f['factor']}: {f['description']}" for f in positive_factors]) if positive_factors else "- None detected"}

NEGATIVE CONTRIBUTING FACTORS (ML-Detected):
{chr(10).join([f"- {f['factor']}: {f['description']}" for f in negative_factors]) if negative_factors else "- None detected"}

IMPORTANT: Your analysis must explain and justify these ML scores using the actual repository characteristics.
Do NOT contradict the ML predictions. Instead, provide engineering context for WHY these scores were predicted.
"""

        # Build the comprehensive senior-engineer prompt
        prompt = f"""You are an elite senior software engineer, code reviewer, software architect, and AI repository intelligence system.

Your task is to deeply inspect and understand this GitHub repository by analyzing the actual source code, architecture, and implementation patterns.

Behave like a highly experienced engineering lead performing:
- Architecture review
- Code audit
- Onboarding analysis
- Maintainability assessment
- Production readiness evaluation

{ml_context}

==================================================
REPOSITORY DATA
==================================================

STATISTICS:
- Total Files: {file_count}
- Total Lines of Code: {total_lines}
- Technologies Detected: {tech_text}

FOLDER STRUCTURE:
{structure_text}

IMPORTANT FILES DETECTED:
{files_text}

README CONTENT:
{readme_content if readme_content else 'No README found'}

ANALYSIS REQUIREMENTS (ML-GROUNDED)

Your analysis MUST be based on:
- **ML predictions and scores** (primary source of truth)
- **Feature contributions** (explain WHY ML predicted these scores)
- Real code inspection
- Actual implementation logic
- Folder organization patterns
- Code quality patterns
- Architecture decisions
- Naming conventions
- Dependency usage
- Security patterns
- Scalability practices

CRITICAL RULES:
1. Your scores MUST align with the ML predictions above
2. Explain the ML scores using actual repository characteristics
3. Reference the positive/negative factors detected by ML
4. DO NOT contradict ML predictions
5. DO NOT generate shallow summaries or generic statements
6. Ground every insight in measurable repository metrics

==================================================
REQUIRED OUTPUT SECTIONS
==================================================

1. PROJECT UNDERSTANDING
Analyze the actual codebase and explain:
- What this specific project does (based on code, not assumptions)
- What problem it solves (infer from implementation)
- Target users (based on features and UI/API design)
- Main application purpose (from entry points and core logic)
- Core business logic (identify key algorithms/workflows)
- Overall repository complexity (beginner/intermediate/advanced/enterprise)

2. TECHNOLOGY STACK ANALYSIS
Categorize detected technologies:
- Frontend: [List actual frontend tech found]
- Backend: [List actual backend tech found]
- Database: [List database tech if found]
- Deployment: [List deployment configs found]
- Testing: [List testing frameworks found]
- Other: [List other significant tools]

For each category, explain WHY these technologies were chosen based on the project type.

3. ARCHITECTURE ANALYSIS
Determine the actual architecture pattern:
- Pattern Type: (MVC, Microservices, Monolith, Component-Based, Layered, etc.)
- Frontend/Backend Communication: (REST API, GraphQL, WebSocket, etc.)
- State Management: (Redux, Context API, Vuex, etc.)
- Component Structure: (Atomic design, Feature-based, etc.)
- Folder Organization: (By feature, by layer, by domain, etc.)
- Scalability Structure: (Horizontal, Vertical, Modular, etc.)

Explain how components interact and data flows through the system.

4. IMPORTANT FILES ANALYSIS
Identify 5-10 most critical files and explain:
- File path and name
- Role and responsibilities
- Why it matters to the project
- Engineering significance
- Dependencies and relationships

Format: "- path/to/file.ext: [Detailed explanation of purpose and importance]"

5. ENGINEERING SCORES (1-10 scale)
Provide detailed scores with explanations:

Code Quality Score: X.X/10
Strengths:
- [Specific strength based on code inspection]
- [Another strength]
Weaknesses:
- [Specific weakness found]
- [Another weakness]
Explanation: [Why this score was given]

Architecture Score: X.X/10
Strengths: [List architectural strengths]
Weaknesses: [List architectural weaknesses]
Explanation: [Reasoning]

Scalability Score: X.X/10
Maintainability Score: X.X/10
Security Score: X.X/10
Performance Score: X.X/10
Developer Experience Score: X.X/10
Readability Score: X.X/10
Documentation Score: X.X/10
Production Readiness Score: X.X/10

Each score MUST include strengths, weaknesses, and explanation.

6. CODE QUALITY INSPECTION
Inspect for actual issues:
- Duplicated logic (identify specific patterns)
- Oversized files (list files >500 lines)
- Poor naming (give examples)
- Unnecessary complexity (identify areas)
- Bad architecture (explain anti-patterns)
- Technical debt (quantify if possible)
- Weak abstractions (provide examples)

Provide 5-7 specific, actionable code quality issues with severity levels.

7. SECURITY ANALYSIS
Detect actual security concerns:
- Exposed secrets or API keys
- Unsafe API usage patterns
- Missing input validation
- Insecure authentication patterns
- Missing environment variable handling
- Vulnerable dependencies
- CORS misconfigurations
- SQL injection risks

List 3-5 security issues with severity (High/Medium/Low) and recommendations.

8. PERFORMANCE ANALYSIS
Identify performance concerns:
- Bundle size issues
- Unoptimized database queries
- Missing caching strategies
- Large component re-renders
- Inefficient algorithms
- Memory leaks potential

List 3-5 performance issues with impact level and solutions.

9. IMPROVEMENT SUGGESTIONS
Provide practical engineering recommendations:
- Architecture improvements
- Performance optimizations
- Maintainability enhancements
- Security hardening
- Scalability improvements
- Developer onboarding improvements
- Testing strategy
- Production deployment readiness

Provide 5-7 prioritized suggestions with category, priority (High/Medium/Low), and expected impact.

10. DEVELOPER ONBOARDING GUIDE
Create a practical 5-step onboarding guide:
Step 1: [Setup instruction based on actual project structure]
Step 2: [Dependency installation based on detected package managers]
Step 3: [Environment configuration based on found config files]
Step 4: [Running the project based on scripts/commands found]
Step 5: [Understanding the codebase based on architecture]

11. FINAL ENGINEERING SUMMARY
Provide a senior-engineer assessment:
- Repository maturity level (Beginner/Intermediate/Production-Ready/Enterprise)
- Engineering quality rating
- Onboarding difficulty (Easy/Moderate/Complex)
- Scalability potential (Limited/Good/Excellent)
- Enterprise readiness (Not Ready/Partially Ready/Ready)
- Contributor friendliness (Low/Medium/High)
- Overall assessment (2-3 sentences)

Classify the repository:
- Beginner Project
- Intermediate SaaS App
- Production-Ready Startup
- Enterprise-Level Architecture
- Experimental Prototype
- Learning/Tutorial Project

==================================================
OUTPUT STYLE REQUIREMENTS
==================================================

Your output must:
- Feel professional and technical
- Be engineering-focused
- Avoid generic AI summaries
- Avoid vague statements
- Use clean sections and bullet points
- Provide concise, actionable insights
- Reference actual files and code patterns
- Include specific examples from the codebase

==================================================
FINAL GOAL
==================================================

Generate an analysis that genuinely helps developers:
- Understand the repository quickly
- Assess engineering quality accurately
- Identify real risks and issues
- Improve maintainability
- Understand architecture deeply
- Onboard new contributors effectively

Your analysis should feel like it came from a senior engineering lead who actually reviewed the code."""

        return prompt
    
    def build_quick_summary_prompt(self, scan_result: Dict) -> str:
        """
        Build a quick summary prompt (uses fewer tokens)
        
        Args:
            scan_result: Result from FileScanner.scan()
            
        Returns:
            Shorter prompt for quick analysis
        """
        technologies = scan_result.get('technologies', [])
        readme_content = scan_result.get('readme_content', '')
        important_files = scan_result.get('important_files', [])
        
        tech_text = ', '.join(technologies) if technologies else 'Not detected'
        files_text = ', '.join([f['name'] for f in important_files[:10]])
        
        prompt = f"""Analyze this repository quickly:

Technologies: {tech_text}
Key Files: {files_text}
README: {readme_content[:500] if readme_content else 'None'}

Provide:
1. What does this project do? (2-3 sentences)
2. Main architecture pattern
3. Top 3 important files and their purpose
4. 2-3 improvement suggestions

Be concise and direct."""

        return prompt
    
    def format_analysis_response(self, ai_response: str) -> Dict:
        """
        Parse and format AI response into structured data
        
        Args:
            ai_response: Raw response from AI
            
        Returns:
            Structured dictionary with analysis sections
        """
        # Initialize sections
        sections = {
            'summary': '',
            'architecture': '',
            'important_files': [],
            'suggestions': [],
            'onboarding': ''
        }
        
        try:
            # Split response by numbered sections
            lines = ai_response.split('\n')
            current_section = None
            current_content = []
            
            for line in lines:
                line_lower = line.lower().strip()
                
                # Detect section headers
                if 'project summary' in line_lower or line_lower.startswith('1.'):
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    current_section = 'summary'
                    current_content = []
                elif 'architecture' in line_lower or line_lower.startswith('2.'):
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    current_section = 'architecture'
                    current_content = []
                elif 'important files' in line_lower or line_lower.startswith('3.'):
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    current_section = 'important_files'
                    current_content = []
                elif 'code quality' in line_lower or 'suggestions' in line_lower or line_lower.startswith('4.'):
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    current_section = 'suggestions'
                    current_content = []
                elif 'onboarding' in line_lower or line_lower.startswith('5.'):
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    current_section = 'onboarding'
                    current_content = []
                else:
                    if current_section and line.strip():
                        current_content.append(line)
            
            # Add last section
            if current_section and current_content:
                sections[current_section] = '\n'.join(current_content).strip()
            
            # If parsing failed, put everything in summary
            if not any(sections.values()):
                sections['summary'] = ai_response
            
            # Convert important_files and suggestions to lists if they're strings
            if isinstance(sections['important_files'], str):
                file_lines = [
                    line.strip('- ').strip()
                    for line in sections['important_files'].split('\n')
                    if line.strip() and line.strip().startswith('-')
                ]
                # Convert to list of dicts with file and purpose
                sections['important_files'] = []
                for file_line in file_lines:
                    if ':' in file_line:
                        parts = file_line.split(':', 1)
                        sections['important_files'].append({
                            'file': parts[0].strip(),
                            'purpose': parts[1].strip()
                        })
                    else:
                        sections['important_files'].append({
                            'file': file_line,
                            'purpose': 'Important project file'
                        })
            
            if isinstance(sections['suggestions'], str):
                sections['suggestions'] = [
                    line.strip('- ').strip()
                    for line in sections['suggestions'].split('\n')
                    if line.strip() and (line.strip().startswith('-') or line.strip()[0].isdigit())
                ]
            
        except Exception as e:
            print(f"Error parsing AI response: {e}")
            # Fallback: return raw response in summary
            sections['summary'] = ai_response
        
        return sections

# Made with Bob

    def format_comprehensive_analysis(self, ai_response: str, scan_result: Dict, repo_name: str) -> Dict:
        """
        Format AI response into comprehensive structured analysis
        
        Args:
            ai_response: Raw response from AI
            scan_result: Repository scan data
            repo_name: Repository name
            
        Returns:
            Comprehensive structured analysis dictionary
        """
        # Check if repository is empty or has minimal content
        file_count = scan_result.get('file_count', 0)
        total_lines = scan_result.get('total_lines', 0)
        
        if file_count == 0 or total_lines < 10:
            return self._generate_empty_repo_response(repo_name, file_count, total_lines)
        
        technologies = scan_result.get('technologies', [])
        
        # Parse AI response to extract structured data
        parsed_data = self._parse_ai_response(ai_response)
        
        # Build comprehensive analysis with parsed data
        analysis = {
            'repository_overview': {
                'name': repo_name,
                'purpose': parsed_data.get('project_purpose', 'Software project providing specific functionality'),
                'problem_solved': parsed_data.get('problem_solved', 'Addresses specific domain challenges'),
                'application_type': parsed_data.get('application_type', self._detect_app_type(technologies)),
                'target_users': parsed_data.get('target_users', 'Developers and end users'),
                'domain': parsed_data.get('domain', 'Software Development')
            },
            'creator_information': {
                'owner': repo_name.split('/')[-1] if '/' in repo_name else 'Unknown',
                'maturity_level': parsed_data.get('maturity_level', 'Intermediate'),
                'coding_style': parsed_data.get('coding_style', 'Modern'),
                'open_source_ready': parsed_data.get('open_source_ready', True),
                'collaboration_ready': parsed_data.get('collaboration_ready', True)
            },
            'technology_stack': {
                'frontend': [t for t in technologies if t in ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Tailwind CSS', 'TypeScript']],
                'backend': [t for t in technologies if t in ['FastAPI', 'Flask', 'Django', 'Express', 'Node.js', 'Python']],
                'database': [t for t in technologies if t in ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite']],
                'deployment': [t for t in technologies if t in ['Docker', 'Kubernetes', 'Vercel', 'AWS', 'Nginx']],
                'testing': [t for t in technologies if t in ['Jest', 'Pytest', 'Mocha', 'Cypress', 'Testing Library']],
                'other': [t for t in technologies if t not in ['React', 'Next.js', 'Vue', 'Angular', 'FastAPI', 'Flask', 'Django', 'Express', 'PostgreSQL', 'MySQL', 'MongoDB', 'TypeScript', 'Python']]
            },
            'architecture_overview': {
                'pattern': parsed_data.get('architecture_pattern', self._detect_architecture_pattern(technologies)),
                'description': parsed_data.get('architecture_description', 'Modular architecture with clear separation of concerns'),
                'folder_structure': parsed_data.get('folder_structure', 'Organized by feature and layer'),
                'data_flow': parsed_data.get('data_flow', 'Unidirectional data flow'),
                'scalability': parsed_data.get('scalability', 'Designed for horizontal scaling')
            },
            'important_files': self._extract_important_files_enhanced(ai_response, scan_result),
            'onboarding_guide': self._extract_onboarding_steps_enhanced(ai_response),
            'code_quality_analysis': self._extract_code_quality_issues_enhanced(ai_response),
            'security_analysis': self._extract_security_issues_enhanced(ai_response),
            'performance_analysis': self._extract_performance_issues_enhanced(ai_response),
            'improvement_suggestions': self._extract_improvements_enhanced(ai_response),
            'final_summary': {
                'repository_quality_score': parsed_data.get('code_quality_score', 75),
                'architecture_quality_score': parsed_data.get('architecture_score', 80),
                'maintainability_score': parsed_data.get('maintainability_score', 70),
                'onboarding_difficulty': parsed_data.get('onboarding_difficulty', 'Moderate'),
                'scalability_level': parsed_data.get('scalability_level', 'Good'),
                'production_readiness': parsed_data.get('production_readiness', 'Ready with improvements'),
                'final_assessment': parsed_data.get('final_assessment', 'Well-structured project with good engineering practices')
            }
        }
        
        return analysis
    
    def _detect_app_type(self, technologies: List[str]) -> str:
        """Detect application type from technologies"""
        if any(t in technologies for t in ['React', 'Next.js', 'Vue', 'Angular']):
            return 'Web Application'
        elif any(t in technologies for t in ['FastAPI', 'Flask', 'Django', 'Express']):
            return 'API Service'
        return 'Software Application'
    
    def _detect_architecture_pattern(self, technologies: List[str]) -> str:
        """Detect architecture pattern"""
        if 'Next.js' in technologies or 'React' in technologies:
            return 'Component-Based Architecture'
        elif any(t in technologies for t in ['FastAPI', 'Flask', 'Django']):
            return 'MVC / Layered Architecture'
        return 'Modular Architecture'
    
    def _extract_important_files(self, ai_response: str, scan_result: Dict) -> List[Dict]:
        """Extract important files from AI response"""
        important_files = scan_result.get('important_files', [])[:8]
        result = []
        
        for file_info in important_files:
            result.append({
                'file': file_info.get('path', file_info.get('name', 'unknown')),
                'purpose': self._get_file_purpose_detailed(file_info.get('path', ''), file_info.get('type', '')),
                'importance': 'Critical for application functionality'
            })
        
        return result
    
    def _get_file_purpose_detailed(self, filename: str, filetype: str) -> str:
        """Get detailed purpose for a file"""
        purposes = {
            'package.json': 'Defines project dependencies, scripts, and metadata',
            'requirements.txt': 'Python dependencies and versions',
            'README.md': 'Project documentation, setup instructions, and overview',
            'tsconfig.json': 'TypeScript compiler configuration and options',
            '.env': 'Environment variables and configuration',
            'docker-compose.yml': 'Multi-container Docker application definition',
            'Dockerfile': 'Container image build instructions',
            'main.py': 'Application entry point and initialization',
            'app.py': 'Main application file',
            'index.tsx': 'Main React component entry point',
            'index.ts': 'Main TypeScript entry point',
        }
        
        for key, purpose in purposes.items():
            if key in filename.lower():
                return purpose
        
        if filetype == 'Python':
            return 'Python module containing business logic'
        elif filetype in ['JavaScript', 'TypeScript']:
            return 'JavaScript/TypeScript module'
        elif filetype == 'JSON':
            return 'Configuration or data file'
        return f'{filetype} source file'
    
    def _extract_onboarding_steps(self, ai_response: str) -> List[Dict]:
        """Extract onboarding steps"""
        return [
            {'step': 1, 'title': 'Clone Repository', 'description': 'Clone the repository to your local machine'},
            {'step': 2, 'title': 'Install Dependencies', 'description': 'Run npm install or pip install -r requirements.txt'},
            {'step': 3, 'title': 'Configure Environment', 'description': 'Set up environment variables in .env file'},
            {'step': 4, 'title': 'Run Development Server', 'description': 'Start the development server and explore'},
            {'step': 5, 'title': 'Read Documentation', 'description': 'Review README and code comments'}
        ]
    
    def _extract_code_quality_issues(self, ai_response: str) -> List[Dict]:
        """Extract code quality issues"""
        return [
            {'type': 'Testing', 'severity': 'Medium', 'description': 'Limited test coverage detected', 'suggestion': 'Add unit and integration tests'},
            {'type': 'Documentation', 'severity': 'Low', 'description': 'Some functions lack documentation', 'suggestion': 'Add docstrings and comments'},
            {'type': 'Code Organization', 'severity': 'Low', 'description': 'Some large files could be split', 'suggestion': 'Refactor into smaller modules'}
        ]
    
    def _extract_security_issues(self, ai_response: str) -> List[Dict]:
        """Extract security issues"""
        return [
            {'type': 'Environment Variables', 'severity': 'Medium', 'description': 'Ensure sensitive data is not committed', 'recommendation': 'Use .env files and .gitignore'},
            {'type': 'Dependencies', 'severity': 'Low', 'description': 'Keep dependencies updated', 'recommendation': 'Regular security audits'}
        ]
    
    def _extract_performance_issues(self, ai_response: str) -> List[Dict]:
        """Extract performance issues"""
        return [
            {'type': 'Bundle Size', 'impact': 'Medium', 'description': 'Consider code splitting', 'solution': 'Implement lazy loading'},
            {'type': 'Database Queries', 'impact': 'Low', 'description': 'Optimize query patterns', 'solution': 'Add indexes and caching'}
        ]
    
    def _extract_improvements(self, ai_response: str) -> List[Dict]:
        """Extract improvement suggestions"""
        return [
            {'category': 'Testing', 'priority': 'High', 'suggestion': 'Implement comprehensive test suite', 'impact': 'Improved reliability'},
            {'category': 'Documentation', 'priority': 'Medium', 'suggestion': 'Add API documentation', 'impact': 'Better developer experience'},
            {'category': 'Performance', 'priority': 'Medium', 'suggestion': 'Optimize bundle size', 'impact': 'Faster load times'},
            {'category': 'Security', 'priority': 'High', 'suggestion': 'Add security headers', 'impact': 'Enhanced security'},
            {'category': 'CI/CD', 'priority': 'Medium', 'suggestion': 'Set up automated deployment', 'impact': 'Faster releases'}
        ]
    
    def _generate_empty_repo_response(self, repo_name: str, file_count: int, total_lines: int) -> Dict:
        """
        Generate response for empty or minimal repositories
        
        Args:
            repo_name: Repository name
            file_count: Number of files found
            total_lines: Total lines of code
            
        Returns:
            Analysis indicating empty repository
        """
        return {
            'repository_overview': {
                'name': repo_name,
                'purpose': 'Empty or minimal repository',
                'problem_solved': 'This repository appears to be empty or newly created',
                'application_type': 'Empty Repository',
                'target_users': 'N/A',
                'domain': 'N/A'
            },
            'creator_information': {
                'owner': repo_name.split('/')[-1] if '/' in repo_name else 'Unknown',
                'maturity_level': 'New/Empty',
                'coding_style': 'N/A',
                'open_source_ready': False,
                'collaboration_ready': False
            },
            'technology_stack': {
                'frontend': [],
                'backend': [],
                'database': [],
                'deployment': [],
                'testing': [],
                'other': []
            },
            'architecture_overview': {
                'pattern': 'N/A',
                'description': 'No code structure detected - repository is empty or contains minimal files',
                'folder_structure': 'Empty or minimal structure',
                'data_flow': 'N/A',
                'scalability': 'N/A'
            },
            'important_files': [],
            'onboarding_guide': [
                {'step': 1, 'title': 'Repository Status', 'description': f'This repository contains {file_count} files with {total_lines} lines of code'},
                {'step': 2, 'title': 'Next Steps', 'description': 'Initialize the project by adding source code files'},
                {'step': 3, 'title': 'Add Documentation', 'description': 'Create a README.md file to describe the project'},
                {'step': 4, 'title': 'Set Up Structure', 'description': 'Organize code into appropriate folders'},
                {'step': 5, 'title': 'Add Configuration', 'description': 'Add package.json, requirements.txt, or other config files'}
            ],
            'code_quality_analysis': [
                {'type': 'Empty Repository', 'severity': 'High', 'description': 'Repository contains no or minimal code', 'suggestion': 'Add source code files to begin development'}
            ],
            'security_analysis': [
                {'type': 'No Code', 'severity': 'Low', 'description': 'No security concerns - repository is empty', 'recommendation': 'Follow security best practices when adding code'}
            ],
            'performance_analysis': [
                {'type': 'No Code', 'impact': 'None', 'description': 'No performance analysis possible for empty repository', 'solution': 'Add code to analyze performance'}
            ],
            'improvement_suggestions': [
                {'category': 'Project Setup', 'priority': 'High', 'suggestion': 'Initialize project with proper structure', 'impact': 'Foundation for development'},
                {'category': 'Documentation', 'priority': 'High', 'suggestion': 'Add README with project description', 'impact': 'Clear project purpose'},
                {'category': 'Configuration', 'priority': 'Medium', 'suggestion': 'Add necessary config files', 'impact': 'Proper development environment'}
            ],
            'final_summary': {
                'repository_quality_score': 0,
                'architecture_quality_score': 0,
                'maintainability_score': 0,
                'onboarding_difficulty': 'N/A - Empty Repository',
                'scalability_level': 'N/A',
                'production_readiness': 'Not Ready - Empty Repository',
                'final_assessment': f'This repository is empty or contains minimal content ({file_count} files, {total_lines} lines). Please add source code to perform a comprehensive analysis.'
            }
        }

    def _parse_ai_response(self, ai_response: str) -> Dict:
        """
        Parse AI response to extract structured data
        
        Args:
            ai_response: Raw AI response text
            
        Returns:
            Dictionary with parsed data
        """
        import re
        
        parsed = {}
        
        # Extract scores using regex
        score_patterns = {
            'code_quality_score': r'Code Quality Score:\s*(\d+\.?\d*)',
            'architecture_score': r'Architecture Score:\s*(\d+\.?\d*)',
            'scalability_score': r'Scalability Score:\s*(\d+\.?\d*)',
            'maintainability_score': r'Maintainability Score:\s*(\d+\.?\d*)',
            'security_score': r'Security Score:\s*(\d+\.?\d*)',
            'performance_score': r'Performance Score:\s*(\d+\.?\d*)',
        }
        
        for key, pattern in score_patterns.items():
            match = re.search(pattern, ai_response, re.IGNORECASE)
            if match:
                try:
                    parsed[key] = int(float(match.group(1)) * 10)  # Convert to 0-100 scale
                except:
                    parsed[key] = 75  # Default
        
        # Extract text sections
        if 'production-ready' in ai_response.lower():
            parsed['production_readiness'] = 'Production Ready'
        elif 'enterprise' in ai_response.lower():
            parsed['production_readiness'] = 'Enterprise Ready'
        else:
            parsed['production_readiness'] = 'Ready with improvements'
        
        # Extract maturity level
        if 'beginner' in ai_response.lower():
            parsed['maturity_level'] = 'Beginner'
        elif 'enterprise' in ai_response.lower():
            parsed['maturity_level'] = 'Enterprise'
        elif 'production' in ai_response.lower():
            parsed['maturity_level'] = 'Production-Ready'
        else:
            parsed['maturity_level'] = 'Intermediate'
        
        # Extract onboarding difficulty
        if 'easy' in ai_response.lower() or 'simple' in ai_response.lower():
            parsed['onboarding_difficulty'] = 'Easy'
        elif 'complex' in ai_response.lower() or 'difficult' in ai_response.lower():
            parsed['onboarding_difficulty'] = 'Complex'
        else:
            parsed['onboarding_difficulty'] = 'Moderate'
        
        return parsed
    
    def _extract_important_files_enhanced(self, ai_response: str, scan_result: Dict) -> List[Dict]:
        """
        Extract important files with enhanced parsing from AI response
        
        Args:
            ai_response: AI response text
            scan_result: Repository scan data
            
        Returns:
            List of important file dictionaries
        """
        import re
        
        result = []
        
        # Try to extract from AI response first
        file_section = re.search(r'IMPORTANT FILES.*?(?=\n\n|\d+\.)', ai_response, re.DOTALL | re.IGNORECASE)
        if file_section:
            lines = file_section.group(0).split('\n')
            for line in lines:
                if line.strip().startswith('-') and ':' in line:
                    parts = line.strip('- ').split(':', 1)
                    if len(parts) == 2:
                        result.append({
                            'file': parts[0].strip(),
                            'purpose': parts[1].strip(),
                            'importance': 'Critical for application functionality'
                        })
        
        # Fallback to scan result if no files extracted
        if not result:
            important_files = scan_result.get('important_files', [])[:8]
            for file_info in important_files:
                result.append({
                    'file': file_info.get('path', file_info.get('name', 'unknown')),
                    'purpose': self._get_file_purpose_detailed(file_info.get('path', ''), file_info.get('type', '')),
                    'importance': 'Critical for application functionality'
                })
        
        return result[:10]  # Limit to 10 files
    
    def _extract_onboarding_steps_enhanced(self, ai_response: str) -> List[Dict]:
        """
        Extract onboarding steps with enhanced parsing
        
        Args:
            ai_response: AI response text
            
        Returns:
            List of onboarding step dictionaries
        """
        import re
        
        steps = []
        
        # Try to extract from AI response
        onboarding_section = re.search(r'ONBOARDING.*?(?=\n\n\d+\.|\Z)', ai_response, re.DOTALL | re.IGNORECASE)
        if onboarding_section:
            lines = onboarding_section.group(0).split('\n')
            step_num = 1
            for line in lines:
                if line.strip() and (line.strip().startswith('Step') or line.strip()[0].isdigit()):
                    # Extract step title and description
                    parts = re.split(r'[:.-]', line, 1)
                    if len(parts) == 2:
                        steps.append({
                            'step': step_num,
                            'title': parts[0].strip().replace(f'Step {step_num}', '').strip(),
                            'description': parts[1].strip()
                        })
                        step_num += 1
        
        # Fallback to default steps
        if not steps:
            steps = [
                {'step': 1, 'title': 'Clone Repository', 'description': 'Clone the repository to your local machine'},
                {'step': 2, 'title': 'Install Dependencies', 'description': 'Install required dependencies using package manager'},
                {'step': 3, 'title': 'Configure Environment', 'description': 'Set up environment variables and configuration'},
                {'step': 4, 'title': 'Run Development Server', 'description': 'Start the development server and explore'},
                {'step': 5, 'title': 'Read Documentation', 'description': 'Review README and code comments'}
            ]
        
        return steps[:7]  # Limit to 7 steps
    
    def _extract_code_quality_issues_enhanced(self, ai_response: str) -> List[Dict]:
        """
        Extract code quality issues with enhanced parsing
        
        Args:
            ai_response: AI response text
            
        Returns:
            List of code quality issue dictionaries
        """
        import re
        
        issues = []
        
        # Try to extract from AI response
        quality_section = re.search(r'CODE QUALITY.*?(?=\n\n\d+\.|\Z)', ai_response, re.DOTALL | re.IGNORECASE)
        if quality_section:
            lines = quality_section.group(0).split('\n')
            for line in lines:
                if line.strip().startswith('-') or (line.strip() and line.strip()[0].isdigit()):
                    # Determine severity
                    severity = 'Medium'
                    if 'critical' in line.lower() or 'high' in line.lower():
                        severity = 'High'
                    elif 'low' in line.lower() or 'minor' in line.lower():
                        severity = 'Low'
                    
                    issues.append({
                        'type': 'Code Quality',
                        'severity': severity,
                        'description': line.strip('- ').strip(),
                        'suggestion': 'Review and refactor as needed'
                    })
        
        # Fallback to default issues
        if not issues:
            issues = [
                {'type': 'Testing', 'severity': 'Medium', 'description': 'Limited test coverage detected', 'suggestion': 'Add unit and integration tests'},
                {'type': 'Documentation', 'severity': 'Low', 'description': 'Some functions lack documentation', 'suggestion': 'Add docstrings and comments'},
                {'type': 'Code Organization', 'severity': 'Low', 'description': 'Some large files could be split', 'suggestion': 'Refactor into smaller modules'}
            ]
        
        return issues[:7]  # Limit to 7 issues
    
    def _extract_security_issues_enhanced(self, ai_response: str) -> List[Dict]:
        """
        Extract security issues with enhanced parsing
        
        Args:
            ai_response: AI response text
            
        Returns:
            List of security issue dictionaries
        """
        import re
        
        issues = []
        
        # Try to extract from AI response
        security_section = re.search(r'SECURITY.*?(?=\n\n\d+\.|\Z)', ai_response, re.DOTALL | re.IGNORECASE)
        if security_section:
            lines = security_section.group(0).split('\n')
            for line in lines:
                if line.strip().startswith('-') or (line.strip() and line.strip()[0].isdigit()):
                    # Determine severity
                    severity = 'Medium'
                    if 'critical' in line.lower() or 'high' in line.lower() or 'exposed' in line.lower():
                        severity = 'High'
                    elif 'low' in line.lower() or 'minor' in line.lower():
                        severity = 'Low'
                    
                    issues.append({
                        'type': 'Security',
                        'severity': severity,
                        'description': line.strip('- ').strip(),
                        'recommendation': 'Follow security best practices'
                    })
        
        # Fallback to default issues
        if not issues:
            issues = [
                {'type': 'Environment Variables', 'severity': 'Medium', 'description': 'Ensure sensitive data is not committed', 'recommendation': 'Use .env files and .gitignore'},
                {'type': 'Dependencies', 'severity': 'Low', 'description': 'Keep dependencies updated', 'recommendation': 'Regular security audits'}
            ]
        
        return issues[:5]  # Limit to 5 issues
    
    def _extract_performance_issues_enhanced(self, ai_response: str) -> List[Dict]:
        """
        Extract performance issues with enhanced parsing
        
        Args:
            ai_response: AI response text
            
        Returns:
            List of performance issue dictionaries
        """
        import re
        
        issues = []
        
        # Try to extract from AI response
        performance_section = re.search(r'PERFORMANCE.*?(?=\n\n\d+\.|\Z)', ai_response, re.DOTALL | re.IGNORECASE)
        if performance_section:
            lines = performance_section.group(0).split('\n')
            for line in lines:
                if line.strip().startswith('-') or (line.strip() and line.strip()[0].isdigit()):
                    # Determine impact
                    impact = 'Medium'
                    if 'high' in line.lower() or 'significant' in line.lower():
                        impact = 'High'
                    elif 'low' in line.lower() or 'minor' in line.lower():
                        impact = 'Low'
                    
                    issues.append({
                        'type': 'Performance',
                        'impact': impact,
                        'description': line.strip('- ').strip(),
                        'solution': 'Optimize as recommended'
                    })
        
        # Fallback to default issues
        if not issues:
            issues = [
                {'type': 'Bundle Size', 'impact': 'Medium', 'description': 'Consider code splitting', 'solution': 'Implement lazy loading'},
                {'type': 'Database Queries', 'impact': 'Low', 'description': 'Optimize query patterns', 'solution': 'Add indexes and caching'}
            ]
        
        return issues[:5]  # Limit to 5 issues
    
    def _extract_improvements_enhanced(self, ai_response: str) -> List[Dict]:
        """
        Extract improvement suggestions with enhanced parsing
        
        Args:
            ai_response: AI response text
            
        Returns:
            List of improvement suggestion dictionaries
        """
        import re
        
        suggestions = []
        
        # Try to extract from AI response
        improvement_section = re.search(r'IMPROVEMENT.*?(?=\n\n\d+\.|\Z)', ai_response, re.DOTALL | re.IGNORECASE)
        if improvement_section:
            lines = improvement_section.group(0).split('\n')
            for line in lines:
                if line.strip().startswith('-') or (line.strip() and line.strip()[0].isdigit()):
                    # Determine priority
                    priority = 'Medium'
                    if 'high' in line.lower() or 'critical' in line.lower():
                        priority = 'High'
                    elif 'low' in line.lower():
                        priority = 'Low'
                    
                    suggestions.append({
                        'category': 'General',
                        'priority': priority,
                        'suggestion': line.strip('- ').strip(),
                        'impact': 'Improved quality'
                    })
        
        # Fallback to default suggestions
        if not suggestions:
            suggestions = [
                {'category': 'Testing', 'priority': 'High', 'suggestion': 'Implement comprehensive test suite', 'impact': 'Improved reliability'},
                {'category': 'Documentation', 'priority': 'Medium', 'suggestion': 'Add API documentation', 'impact': 'Better developer experience'},
                {'category': 'Performance', 'priority': 'Medium', 'suggestion': 'Optimize bundle size', 'impact': 'Faster load times'},
                {'category': 'Security', 'priority': 'High', 'suggestion': 'Add security headers', 'impact': 'Enhanced security'},
                {'category': 'CI/CD', 'priority': 'Medium', 'suggestion': 'Set up automated deployment', 'impact': 'Faster releases'}
            ]
        
        return suggestions[:7]  # Limit to 7 suggestions
