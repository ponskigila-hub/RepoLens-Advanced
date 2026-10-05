import pandas as pd
import numpy as np
from typing import Dict, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Engineer features for repository quality prediction"""
    
    def __init__(self):
        self.feature_names = []
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Engineer additional features from repository metadata
        
        Args:
            df: DataFrame with preprocessed repository data
            
        Returns:
            DataFrame with engineered features
        """
        logger.info("Engineering features...")
        
        df = df.copy()
        
        # Popularity metrics
        df['popularity_score'] = self._calculate_popularity_score(df)
        df['engagement_ratio'] = self._calculate_engagement_ratio(df)
        df['fork_ratio'] = self._calculate_fork_ratio(df)
        
        # Activity metrics
        df['activity_score'] = self._calculate_activity_score(df)
        df['maintenance_score'] = self._calculate_maintenance_score(df)
        
        # Quality indicators
        df['has_license'] = df['License'].apply(lambda x: x != 'No License' if pd.notna(x) else False)
        df['documentation_score'] = self._calculate_documentation_score(df)
        
        # Maturity metrics
        df['maturity_score'] = self._calculate_maturity_score(df)
        
        # Size metrics (normalized)
        df['size_normalized'] = np.log1p(df['Size'])
        
        # Issue management
        df['issue_ratio'] = df['Issues'] / (df['Stars'] + 1)
        
        logger.info(f"Engineered {len(df.columns)} total features")
        
        return df
    
    def _calculate_popularity_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate popularity score based on stars, forks, and watchers"""
        stars_norm = np.log1p(df['Stars'])
        forks_norm = np.log1p(df['Forks'])
        watchers_norm = np.log1p(df['Watchers'])
        
        # Weighted combination
        popularity = (
            stars_norm * 0.5 +
            forks_norm * 0.3 +
            watchers_norm * 0.2
        )
        
        # Normalize to 0-100
        if popularity.max() > 0:
            popularity = (popularity / popularity.max()) * 100
        
        return popularity
    
    def _calculate_engagement_ratio(self, df: pd.DataFrame) -> pd.Series:
        """Calculate engagement ratio (forks + watchers) / stars"""
        engagement = (df['Forks'] + df['Watchers']) / (df['Stars'] + 1)
        return np.clip(engagement, 0, 10)  # Cap at 10
    
    def _calculate_fork_ratio(self, df: pd.DataFrame) -> pd.Series:
        """Calculate fork to star ratio"""
        fork_ratio = df['Forks'] / (df['Stars'] + 1)
        return np.clip(fork_ratio, 0, 1)
    
    def _calculate_activity_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate activity score based on recent updates"""
        # More recent updates = higher score
        days_since_update = df['days_since_update'].fillna(365)
        
        # Exponential decay: score decreases as days increase
        activity = 100 * np.exp(-days_since_update / 180)  # Half-life of 180 days
        
        return activity
    
    def _calculate_maintenance_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate maintenance score"""
        # Factors: not archived, has issues enabled, recent updates
        maintenance = 0
        
        if 'Is Archived' in df.columns:
            maintenance += (~df['Is Archived']).astype(int) * 30
        
        if 'Has Issues' in df.columns:
            maintenance += df['Has Issues'].astype(int) * 20
        
        # Recent update bonus
        days_since_update = df['days_since_update'].fillna(365)
        update_bonus = np.clip(50 * (1 - days_since_update / 365), 0, 50)
        maintenance += update_bonus
        
        return maintenance
    
    def _calculate_documentation_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate documentation quality score"""
        score = 0
        
        # Has description
        if 'has_description' in df.columns:
            score += df['has_description'].astype(int) * 30
        
        # Description length (longer is better, up to a point)
        if 'description_length' in df.columns:
            desc_score = np.clip(df['description_length'] / 200 * 20, 0, 20)
            score += desc_score
        
        # Has wiki
        if 'Has Wiki' in df.columns:
            score += df['Has Wiki'].astype(int) * 20
        
        # Has pages (documentation site)
        if 'Has Pages' in df.columns:
            score += df['Has Pages'].astype(int) * 30
        
        return score
    
    def _calculate_maturity_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate repository maturity score"""
        # Based on age and activity
        age_days = df['repo_age_days'].fillna(0)
        
        # Maturity increases with age, but plateaus
        # Optimal maturity around 1-3 years
        maturity = 100 * (1 - np.exp(-age_days / 365))
        
        # Penalty for very old repos without recent updates
        days_since_update = df['days_since_update'].fillna(365)
        staleness_penalty = np.clip(days_since_update / 365 * 30, 0, 30)
        
        maturity = np.clip(maturity - staleness_penalty, 0, 100)
        
        return maturity
    
    def get_ml_features(self, df: pd.DataFrame) -> List[str]:
        """Get list of features to use for ML model"""
        base_features = [
            'Stars', 'Forks', 'Issues', 'Watchers', 'Size',
            'Has Issues', 'Has Projects', 'Has Downloads',
            'Has Wiki', 'Has Pages', 'Has Discussions',
            'Is Fork', 'Is Archived', 'Is Template',
            'has_description', 'description_length', 'topic_count',
            'repo_age_days', 'days_since_update'
        ]
        
        engineered_features = [
            'popularity_score', 'engagement_ratio', 'fork_ratio',
            'activity_score', 'maintenance_score', 'has_license',
            'documentation_score', 'maturity_score', 'size_normalized',
            'issue_ratio'
        ]
        
        # Filter to only include features that exist in the dataframe
        available_features = [f for f in base_features + engineered_features if f in df.columns]
        
        self.feature_names = available_features
        return available_features
    
    def prepare_features_for_prediction(self, repo_data: Dict) -> pd.DataFrame:
        """
        Prepare features from a single repository for prediction
        
        Args:
            repo_data: Dictionary with repository metadata
            
        Returns:
            DataFrame with single row of features
        """
        # Create DataFrame from repo data
        df = pd.DataFrame([repo_data])
        
        # Engineer features
        df = self.engineer_features(df)
        
        # Get ML features
        feature_cols = self.get_ml_features(df)
        
        # Fill any missing features with 0
        for col in feature_cols:
            if col not in df.columns:
                df[col] = 0
        
        return df[feature_cols]


# Made with Bob