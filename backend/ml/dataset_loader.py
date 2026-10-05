import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatasetLoader:
    """Load and preprocess GitHub repository dataset from Kaggle"""
    
    def __init__(self, dataset_path: str = "data/repositories.csv"):
        # Get the project root directory (parent of backend)
        current_file = Path(__file__)
        backend_dir = current_file.parent.parent  # backend/ml/dataset_loader.py -> backend
        project_root = backend_dir.parent  # backend -> project root
        
        # Resolve the dataset path relative to project root
        if not Path(dataset_path).is_absolute():
            self.dataset_path = project_root / dataset_path
        else:
            self.dataset_path = Path(dataset_path)
        
        self.df = None
        
    def load_dataset(self, max_repos: int = 5000) -> pd.DataFrame:
        """
        Load GitHub repository dataset
        
        Args:
            max_repos: Maximum number of repositories to load (for performance)
            
        Returns:
            DataFrame with repository data
        """
        try:
            logger.info(f"Loading dataset from {self.dataset_path}")
            
            # Load CSV
            df = pd.read_csv(self.dataset_path)
            logger.info(f"Loaded {len(df)} repositories")
            
            # Sample if too large
            if len(df) > max_repos:
                logger.info(f"Sampling {max_repos} repositories from {len(df)}")
                df = df.sample(n=max_repos, random_state=42)
            
            self.df = df
            return df
            
        except Exception as e:
            logger.error(f"Error loading dataset: {e}")
            raise
    
    def preprocess_dataset(self) -> pd.DataFrame:
        """
        Preprocess and clean the dataset
        
        Returns:
            Cleaned DataFrame
        """
        if self.df is None:
            raise ValueError("Dataset not loaded. Call load_dataset() first.")
        
        df = self.df.copy()
        
        logger.info("Preprocessing dataset...")
        
        # Convert date columns
        date_columns = ['Created At', 'Updated At']
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
        
        # Calculate repository age in days
        if 'Created At' in df.columns:
            # Use timezone-naive timestamp to avoid tz-aware/tz-naive comparison issues
            now = pd.Timestamp.now().tz_localize(None)
            df['repo_age_days'] = (now - df['Created At'].dt.tz_localize(None)).dt.days
        
        # Calculate days since last update
        if 'Updated At' in df.columns:
            now = pd.Timestamp.now().tz_localize(None)
            df['days_since_update'] = (now - df['Updated At'].dt.tz_localize(None)).dt.days
        
        # Fill missing numeric values
        numeric_columns = ['Stars', 'Forks', 'Issues', 'Watchers', 'Size']
        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].fillna(0)
        
        # Fill missing boolean values
        boolean_columns = ['Has Issues', 'Has Projects', 'Has Downloads', 
                          'Has Wiki', 'Has Pages', 'Has Discussions',
                          'Is Fork', 'Is Archived', 'Is Template']
        for col in boolean_columns:
            if col in df.columns:
                df[col] = df[col].fillna(False)
        
        # Fill missing string values
        if 'Language' in df.columns:
            df['Language'] = df['Language'].fillna('Unknown')
        
        if 'License' in df.columns:
            df['License'] = df['License'].fillna('No License')
        
        if 'Description' in df.columns:
            df['Description'] = df['Description'].fillna('')
            df['has_description'] = df['Description'].str.len() > 0
            df['description_length'] = df['Description'].str.len()
        
        # Parse topics
        if 'Topics' in df.columns:
            df['Topics'] = df['Topics'].fillna('[]')
            df['topic_count'] = df['Topics'].apply(self._count_topics)
        
        # Remove rows with critical missing values
        df = df.dropna(subset=['Stars', 'Forks'])
        
        logger.info(f"Preprocessed dataset: {len(df)} repositories")
        
        self.df = df
        return df
    
    def _count_topics(self, topics_str: str) -> int:
        """Count number of topics in the topics string"""
        try:
            # Topics are in format "['topic1', 'topic2']"
            if not topics_str or topics_str == '[]':
                return 0
            # Count commas + 1
            return topics_str.count(',') + 1
        except:
            return 0
    
    def get_feature_columns(self) -> list:
        """Get list of feature columns for ML"""
        return [
            'Stars', 'Forks', 'Issues', 'Watchers', 'Size',
            'repo_age_days', 'days_since_update',
            'Has Issues', 'Has Projects', 'Has Downloads',
            'Has Wiki', 'Has Pages', 'Has Discussions',
            'Is Fork', 'Is Archived', 'Is Template',
            'has_description', 'description_length', 'topic_count'
        ]
    
    def get_statistics(self) -> Dict:
        """Get dataset statistics"""
        if self.df is None:
            raise ValueError("Dataset not loaded")
        
        stats = {
            'total_repos': len(self.df),
            'languages': self.df['Language'].nunique() if 'Language' in self.df.columns else 0,
            'avg_stars': float(self.df['Stars'].mean()) if 'Stars' in self.df.columns else 0,
            'avg_forks': float(self.df['Forks'].mean()) if 'Forks' in self.df.columns else 0,
            'median_stars': float(self.df['Stars'].median()) if 'Stars' in self.df.columns else 0,
            'median_forks': float(self.df['Forks'].median()) if 'Forks' in self.df.columns else 0
        }
        return stats


# Made with Bob