import os
import shutil
from git import Repo, GitCommandError
from urllib.parse import urlparse
import uuid


class RepoCloner:
    """Service for cloning GitHub repositories"""
    
    def __init__(self, temp_dir: str = "temp_repos"):
        self.temp_dir = temp_dir
        os.makedirs(temp_dir, exist_ok=True)
    
    def validate_github_url(self, url: str) -> bool:
        """Validate if the URL is a valid GitHub repository URL"""
        try:
            parsed = urlparse(url)
            return (
                parsed.scheme in ['http', 'https'] and
                'github.com' in parsed.netloc and
                len(parsed.path.strip('/').split('/')) >= 2
            )
        except Exception:
            return False
    
    def get_repo_name(self, url: str) -> str:
        """Extract repository name from GitHub URL"""
        parsed = urlparse(url)
        path_parts = parsed.path.strip('/').split('/')

        if len(path_parts) >= 2:
            unique_id = str(uuid.uuid4())[:8]
            return f"{path_parts[0]}_{path_parts[1]}_{unique_id}"

        return "unknown_repo"
    
    def cleanup_existing_repo(self, repo_path: str) -> None:
        """Remove existing repository if it exists"""
        if os.path.exists(repo_path):
            try:
                shutil.rmtree(repo_path)
            except Exception as e:
                print(f"Warning: Could not remove existing repo: {e}")
    
    def clone_repository(self, github_url: str) -> dict:
        """
        Clone a GitHub repository to temporary directory
        
        Args:
            github_url: GitHub repository URL
            
        Returns:
            dict with status and local_path or error message
        """
        try:
            # Validate URL
            if not self.validate_github_url(github_url):
                return {
                    "success": False,
                    "error": "Invalid GitHub URL format"
                }
            
            # Get repository name and create local path
            repo_name = self.get_repo_name(github_url)
            local_path = os.path.join(self.temp_dir, repo_name)
            
            # Cleanup existing repository
            self.cleanup_existing_repo(local_path)
            
            # Clone repository
            print(f"Cloning repository: {github_url}")
            Repo.clone_from(github_url, local_path, depth=1)
            
            return {
                "success": True,
                "local_path": local_path,
                "repo_name": repo_name
            }
            
        except GitCommandError as e:
            return {
                "success": False,
                "error": f"Git error: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def cleanup_repo(self, local_path: str) -> bool:
        """Clean up cloned repository"""
        try:
            if os.path.exists(local_path):
                shutil.rmtree(local_path)
            return True
        except Exception as e:
            print(f"Error cleaning up repo: {e}")
            return False

# Made with Bob
