import os
import shutil
import time
from pathlib import Path
from typing import List


class CleanupManager:
    """Manager for cleaning up temporary repository clones"""
    
    def __init__(self, temp_dir: str = "backend/temp_repos"):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def cleanup_old_repos(self, max_age_hours: int = 24) -> List[str]:
        """
        Clean up temporary repositories older than max_age_hours
        
        Args:
            max_age_hours: Maximum age in hours before cleanup
            
        Returns:
            List of cleaned repository paths
        """
        cleaned = []
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        try:
            for item in self.temp_dir.iterdir():
                if item.is_dir():
                    # Get directory age
                    dir_age = current_time - item.stat().st_mtime
                    
                    if dir_age > max_age_seconds:
                        try:
                            shutil.rmtree(item)
                            cleaned.append(str(item))
                            print(f"Cleaned up old repository: {item.name}")
                        except Exception as e:
                            print(f"Error cleaning up {item.name}: {e}")
        
        except Exception as e:
            print(f"Error during cleanup: {e}")
        
        return cleaned
    
    def cleanup_all(self) -> int:
        """
        Clean up all temporary repositories
        
        Returns:
            Number of repositories cleaned
        """
        count = 0
        try:
            for item in self.temp_dir.iterdir():
                if item.is_dir():
                    try:
                        shutil.rmtree(item)
                        count += 1
                    except Exception as e:
                        print(f"Error cleaning up {item.name}: {e}")
        except Exception as e:
            print(f"Error during cleanup: {e}")
        
        return count


# Made with Bob
