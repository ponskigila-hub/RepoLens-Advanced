import pandas as pd
import numpy as np
from typing import Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LabelGenerator:
    """Generate quality labels for repository training data"""
    
    def __init__(self):
        self.weights = {
            'popularity': 0.20,
            'maintainability': 0.25,
            'documentation': 0.15,
            'architecture': 0.20,
            'activity': 0.10,
            'security': 0.10
        }
    
    def generate_labels(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate quality score labels for repositories
        
        Args:
            df: DataFrame with engineered features
            
        Returns:
            DataFrame with quality score labels
        """
        logger.info("Generating quality labels...")
        
        df = df.copy()
        
        # Calculate component scores
        df['popularity_component'] = self._calculate_popularity_component(df)
        df['maintainability_component'] = self._calculate_maintainability_component(df)
        df['documentation_component'] = self._calculate_documentation_component(df)
        df['architecture_component'] = self._calculate_architecture_component(df)
        df['activity_component'] = self._calculate_activity_component(df)
        df['security_component'] = self._calculate_security_component(df)
        
        # Calculate overall quality score (0-100)
        df['overall_quality_score'] = (
            df['popularity_component'] * self.weights['popularity'] +
            df['maintainability_component'] * self.weights['maintainability'] +
            df['documentation_component'] * self.weights['documentation'] +
            df['architecture_component'] * self.weights['architecture'] +
            df['activity_component'] * self.weights['activity'] +
            df['security_component'] * self.weights['security']
        )
        
        # Clip to 0-100 range
        df['overall_quality_score'] = np.clip(df['overall_quality_score'], 0, 100)
        
        # Generate individual scores for prediction targets
        df['maintainability_score'] = np.clip(df['maintainability_component'], 0, 100)
        df['scalability_score'] = self._calculate_scalability_score(df)
        df['architecture_score'] = np.clip(df['architecture_component'], 0, 100)
        df['production_readiness_score'] = self._calculate_production_readiness(df)
        
        logger.info(f"Generated labels for {len(df)} repositories")
        logger.info(f"Average quality score: {df['overall_quality_score'].mean():.2f}")
        
        return df
    
    def _calculate_popularity_component(self, df: pd.DataFrame) -> pd.Series:
        """Calculate popularity component (0-100)"""
        if 'popularity_score' in df.columns:
            return df['popularity_score']
        
        # Fallback calculation
        stars_norm = np.log1p(df['Stars'])
        forks_norm = np.log1p(df['Forks'])
        
        popularity = (stars_norm * 0.6 + forks_norm * 0.4)
        
        if popularity.max() > 0:
            popularity = (popularity / popularity.max()) * 100
        
        return popularity
    
    def _calculate_maintainability_component(self, df: pd.DataFrame) -> pd.Series:
        """Calculate maintainability component (0-100)"""
        score = pd.Series(0, index=df.index)
        
        # Recent updates (30 points)
        if 'activity_score' in df.columns:
            score += df['activity_score'] * 0.3
        
        # Not archived (20 points)
        if 'Is Archived' in df.columns:
            score += (~df['Is Archived']).astype(int) * 20
        
        # Has issues enabled (15 points)
        if 'Has Issues' in df.columns:
            score += df['Has Issues'].astype(int) * 15
        
        # Low issue ratio (20 points)
        if 'issue_ratio' in df.columns:
            issue_score = np.clip(20 * (1 - df['issue_ratio']), 0, 20)
            score += issue_score
        
        # Has license (15 points)
        if 'has_license' in df.columns:
            score += df['has_license'].astype(int) * 15
        
        return np.clip(score, 0, 100)
    
    def _calculate_documentation_component(self, df: pd.DataFrame) -> pd.Series:
        """Calculate documentation component (0-100)"""
        if 'documentation_score' in df.columns:
            return df['documentation_score']
        
        score = pd.Series(0, index=df.index)
        
        # Has description (25 points)
        if 'has_description' in df.columns:
            score += df['has_description'].astype(int) * 25
        
        # Has wiki (25 points)
        if 'Has Wiki' in df.columns:
            score += df['Has Wiki'].astype(int) * 25
        
        # Has pages (30 points)
        if 'Has Pages' in df.columns:
            score += df['Has Pages'].astype(int) * 30
        
        # Has topics (20 points)
        if 'topic_count' in df.columns:
            topic_score = np.clip(df['topic_count'] / 5 * 20, 0, 20)
            score += topic_score
        
        return np.clip(score, 0, 100)
    
    def _calculate_architecture_component(self, df: pd.DataFrame) -> pd.Series:
        """Calculate architecture component (0-100)"""
        score = pd.Series(50, index=df.index)  # Base score
        
        # Maturity bonus (30 points)
        if 'maturity_score' in df.columns:
            score += df['maturity_score'] * 0.3
        
        # Engagement ratio (good fork/star ratio indicates good architecture) (20 points)
        if 'engagement_ratio' in df.columns:
            engagement_score = np.clip(df['engagement_ratio'] * 10, 0, 20)
            score += engagement_score
        
        # Not a fork (original work) (10 points)
        if 'Is Fork' in df.columns:
            score += (~df['Is Fork']).astype(int) * 10
        
        # Has projects (project management) (10 points)
        if 'Has Projects' in df.columns:
            score += df['Has Projects'].astype(int) * 10
        
        return np.clip(score, 0, 100)
    
    def _calculate_activity_component(self, df: pd.DataFrame) -> pd.Series:
        """Calculate activity component (0-100)"""
        if 'activity_score' in df.columns:
            return df['activity_score']
        
        # Fallback: based on days since update
        days_since_update = df['days_since_update'].fillna(365)
        activity = 100 * np.exp(-days_since_update / 180)
        
        return activity
    
    def _calculate_security_component(self, df: pd.DataFrame) -> pd.Series:
        """Calculate security component (0-100)"""
        score = pd.Series(50, index=df.index)  # Base score
        
        # Has license (30 points)
        if 'has_license' in df.columns:
            score += df['has_license'].astype(int) * 30
        
        # Not archived (20 points)
        if 'Is Archived' in df.columns:
            score += (~df['Is Archived']).astype(int) * 20
        
        # Recent updates (security patches) (20 points)
        days_since_update = df['days_since_update'].fillna(365)
        update_score = np.clip(20 * (1 - days_since_update / 365), 0, 20)
        score += update_score
        
        return np.clip(score, 0, 100)
    
    def _calculate_scalability_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate scalability score (0-100)"""
        score = pd.Series(50, index=df.index)  # Base score
        
        # High engagement indicates scalable architecture (25 points)
        if 'engagement_ratio' in df.columns:
            engagement_score = np.clip(df['engagement_ratio'] * 12.5, 0, 25)
            score += engagement_score
        
        # Maturity (25 points)
        if 'maturity_score' in df.columns:
            score += df['maturity_score'] * 0.25
        
        # Good documentation (20 points)
        if 'documentation_score' in df.columns:
            score += df['documentation_score'] * 0.2
        
        # Active maintenance (15 points)
        if 'maintenance_score' in df.columns:
            score += df['maintenance_score'] * 0.15
        
        return np.clip(score, 0, 100)
    
    def _calculate_production_readiness(self, df: pd.DataFrame) -> pd.Series:
        """Calculate production readiness score (0-100)"""
        score = pd.Series(0, index=df.index)
        
        # Has license (20 points)
        if 'has_license' in df.columns:
            score += df['has_license'].astype(int) * 20
        
        # Not archived (15 points)
        if 'Is Archived' in df.columns:
            score += (~df['Is Archived']).astype(int) * 15
        
        # Recent updates (20 points)
        if 'activity_score' in df.columns:
            score += df['activity_score'] * 0.2
        
        # Good documentation (20 points)
        if 'documentation_score' in df.columns:
            score += df['documentation_score'] * 0.2
        
        # Maturity (15 points)
        if 'maturity_score' in df.columns:
            score += df['maturity_score'] * 0.15
        
        # Low issue ratio (10 points)
        if 'issue_ratio' in df.columns:
            issue_score = np.clip(10 * (1 - df['issue_ratio']), 0, 10)
            score += issue_score
        
        return np.clip(score, 0, 100)
    
    def get_target_columns(self) -> list:
        """Get list of target columns for ML training"""
        return [
            'overall_quality_score',
            'maintainability_score',
            'scalability_score',
            'architecture_score',
            'production_readiness_score'
        ]


# Made with Bob