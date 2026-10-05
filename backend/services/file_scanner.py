import os
from pathlib import Path
from typing import List, Dict, Set


class FileScanner:
    """Service for scanning repository files and structure"""
    
    # Directories to ignore
    IGNORE_DIRS = {
        'node_modules', '.git', '__pycache__', 'venv', 'env',
        'dist', 'build', '.next', '.nuxt', 'target', 'bin',
        'obj', 'out', '.vscode', '.idea', 'coverage', '.pytest_cache'
    }
    
    # File extensions to prioritize
    SOURCE_EXTENSIONS = {
        '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c',
        '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.cs', '.scala',
        '.html', '.css', '.scss', '.vue', '.svelte'
    }
    
    CONFIG_FILES = {
        'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod',
        'pom.xml', 'build.gradle', 'Gemfile', 'composer.json',
        'Dockerfile', 'docker-compose.yml', '.env.example',
        'tsconfig.json', 'webpack.config.js', 'vite.config.js'
    }
    
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
    
    def should_ignore(self, path: str) -> bool:
        """Check if path should be ignored"""
        path_parts = Path(path).parts
        return any(ignored in path_parts for ignored in self.IGNORE_DIRS)
    
    def get_file_extension(self, filename: str) -> str:
        """Get file extension"""
        return Path(filename).suffix.lower()
    
    def is_source_file(self, filename: str) -> bool:
        """Check if file is a source code file"""
        return self.get_file_extension(filename) in self.SOURCE_EXTENSIONS
    
    def is_config_file(self, filename: str) -> bool:
        """Check if file is a configuration file"""
        return filename in self.CONFIG_FILES
    
    def read_readme(self) -> str:
        """Read README file if exists"""
        readme_names = ['README.md', 'README.txt', 'README', 'readme.md']
        for readme_name in readme_names:
            readme_path = os.path.join(self.repo_path, readme_name)
            if os.path.exists(readme_path):
                try:
                    with open(readme_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        # Limit README to first 2000 characters
                        return content[:2000] if len(content) > 2000 else content
                except Exception as e:
                    print(f"Error reading README: {e}")
        return ""
    
    def detect_technologies(self, files: List[str]) -> List[str]:
        """Detect technologies used in the project"""
        technologies = set()
        
        for file in files:
            filename = os.path.basename(file)
            ext = self.get_file_extension(filename)
            
            # Language detection
            if ext in ['.py']:
                technologies.add('Python')
            elif ext in ['.js', '.jsx']:
                technologies.add('JavaScript')
            elif ext in ['.ts', '.tsx']:
                technologies.add('TypeScript')
            elif ext in ['.java']:
                technologies.add('Java')
            elif ext in ['.go']:
                technologies.add('Go')
            elif ext in ['.rs']:
                technologies.add('Rust')
            elif ext in ['.rb']:
                technologies.add('Ruby')
            elif ext in ['.php']:
                technologies.add('PHP')
            elif ext in ['.cpp', '.c', '.h']:
                technologies.add('C/C++')
            elif ext in ['.cs']:
                technologies.add('C#')
            
            # Framework detection
            if filename == 'package.json':
                technologies.add('Node.js')
            elif filename == 'requirements.txt':
                technologies.add('Python')
            elif filename == 'Cargo.toml':
                technologies.add('Rust')
            elif filename == 'go.mod':
                technologies.add('Go')
            elif filename == 'Gemfile':
                technologies.add('Ruby')
            elif filename == 'composer.json':
                technologies.add('PHP')
            elif filename == 'pom.xml':
                technologies.add('Maven')
            elif filename == 'build.gradle':
                technologies.add('Gradle')
            elif filename == 'Dockerfile':
                technologies.add('Docker')
        
        return sorted(list(technologies))
    
    def get_folder_structure(self, max_depth: int = 3) -> List[str]:
        """Get folder structure up to max_depth"""
        structure = []
        
        for root, dirs, files in os.walk(self.repo_path):
            # Calculate depth
            depth = root.replace(self.repo_path, '').count(os.sep)
            if depth >= max_depth:
                dirs[:] = []  # Don't go deeper
                continue
            
            # Filter out ignored directories
            dirs[:] = [d for d in dirs if d not in self.IGNORE_DIRS]
            
            # Add directory to structure
            indent = '  ' * depth
            folder_name = os.path.basename(root) or 'root'
            structure.append(f"{indent}{folder_name}/")
            
            # Add important files
            for file in sorted(files):
                if self.is_source_file(file) or self.is_config_file(file):
                    structure.append(f"{indent}  {file}")
        
        return structure[:100]  # Limit to 100 lines
    
    def get_important_files(self, max_files: int = 20) -> List[Dict[str, str]]:
        """Get list of important files with their paths"""
        important_files = []
        
        for root, dirs, files in os.walk(self.repo_path):
            # Skip ignored directories
            if self.should_ignore(root):
                continue
            
            dirs[:] = [d for d in dirs if d not in self.IGNORE_DIRS]
            
            for file in files:
                if len(important_files) >= max_files:
                    break
                
                if self.is_source_file(file) or self.is_config_file(file):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, self.repo_path)
                    
                    # Get file size
                    try:
                        size = os.path.getsize(file_path)
                        important_files.append({
                            'path': relative_path.replace('\\', '/'),
                            'name': file,
                            'size': size,
                            'type': 'config' if self.is_config_file(file) else 'source'
                        })
                    except Exception:
                        continue
            
            if len(important_files) >= max_files:
                break
        
        return important_files
    
    def count_lines_of_code(self, file_path: str) -> int:
        """Count lines of code in a file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return len(f.readlines())
        except Exception:
            return 0
    
    def scan(self) -> Dict:
        """
        Scan repository and return comprehensive analysis
        
        Returns:
            dict with folder structure, important files, technologies, etc.
        """
        try:
            folder_structure = self.get_folder_structure()
            important_files = self.get_important_files()
            readme_content = self.read_readme()
            
            # Get all files for technology detection
            all_files = [f['path'] for f in important_files]
            technologies = self.detect_technologies(all_files)
            
            # Count total files and lines
            total_files = len(important_files)
            total_lines = sum(
                self.count_lines_of_code(os.path.join(self.repo_path, f['path']))
                for f in important_files
            )
            
            return {
                "success": True,
                "folder_structure": folder_structure,
                "important_files": important_files,
                "technologies": technologies,
                "readme_content": readme_content,
                "file_count": total_files,
                "total_lines": total_lines
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error scanning repository: {str(e)}"
            }

# Made with Bob
