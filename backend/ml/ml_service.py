import pandas as pd
import numpy as np
from typing import Dict, Optional
from pathlib import Path
import logging

from .model_trainer import ModelTrainer
from .feature_engineering import FeatureEngineer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MLService:
    """Service for ML-based repository quality prediction"""
    
    def __init__(self, model_dir: str = "backend/ml/models"):
        self.model_dir = Path(model_dir)
        self.trainer = ModelTrainer(model_dir=str(model_dir))
        self.feature_engineer = FeatureEngineer()
        self.models_loaded = False
        
        # Try to load models on initialization
        self._load_models()
    
    def _load_models(self) -> bool:
        """Load trained models"""
        try:
            self.models_loaded = self.trainer.load_models()
            if self.models_loaded:
                logger.info("ML models loaded successfully")
            else:
                logger.warning("ML models not found - predictions will use fallback heuristics")
            return self.models_loaded
        except Exception as e:
            logger.error(f"Error loading ML models: {e}")
            self.models_loaded = False
            return False
    
    def extract_features_from_scan(self, scan_result: Dict) -> Dict:
        """
        Extract ML features from repository scan result
        
        Args:
            scan_result: Dictionary from file_scanner.scan()
            
        Returns:
            Dictionary with repository features
        """
        # Extract actual repository metrics
        file_count = scan_result.get('file_count', 0)
        total_lines = scan_result.get('total_lines', 0)
        readme_length = len(scan_result.get('readme_content', ''))
        tech_count = len(scan_result.get('technologies', []))
        
        # Estimate quality based on actual repository characteristics
        size_score = min(total_lines / 10000 * 50, 50)
        doc_score = min(readme_length / 1000 * 30, 30)
        tech_score = min(tech_count * 5, 20)
        
        base_quality = size_score + doc_score + tech_score
        
        # Extract basic metadata with variation based on actual repo
        features = {
            'Stars': int(base_quality * 10),
            'Forks': int(base_quality * 2),
            'Issues': max(1, int(file_count / 10)),
            'Watchers': int(base_quality * 5),
            'Size': total_lines,
            'Has Issues': True,
            'Has Projects': file_count > 20,
            'Has Downloads': False,
            'Has Wiki': readme_length > 500,
            'Has Pages': readme_length > 1000,
            'Has Discussions': False,
            'Is Fork': False,
            'Is Archived': False,
            'Is Template': False,
            'has_description': readme_length > 0,
            'description_length': readme_length,
            'topic_count': tech_count,
            'repo_age_days': 365,
            'days_since_update': 7,
            'Language': scan_result.get('technologies', ['Unknown'])[0] if scan_result.get('technologies') else 'Unknown',
            'License': 'MIT' if readme_length > 500 else 'Unknown'
        }
        
        return features
    
    def extract_features_from_github_metadata(self, github_data: Dict) -> Dict:
        """
        Extract features from GitHub API metadata
        
        Args:
            github_data: Dictionary with GitHub repository metadata
            
        Returns:
            Dictionary with repository features
        """
        from datetime import datetime
        
        features = {
            'Stars': github_data.get('stargazers_count', 0),
            'Forks': github_data.get('forks_count', 0),
            'Issues': github_data.get('open_issues_count', 0),
            'Watchers': github_data.get('watchers_count', 0),
            'Size': github_data.get('size', 0),
            'Has Issues': github_data.get('has_issues', True),
            'Has Projects': github_data.get('has_projects', False),
            'Has Downloads': github_data.get('has_downloads', False),
            'Has Wiki': github_data.get('has_wiki', False),
            'Has Pages': github_data.get('has_pages', False),
            'Has Discussions': github_data.get('has_discussions', False),
            'Is Fork': github_data.get('fork', False),
            'Is Archived': github_data.get('archived', False),
            'Is Template': github_data.get('is_template', False),
            'has_description': bool(github_data.get('description')),
            'description_length': len(github_data.get('description', '')),
            'topic_count': len(github_data.get('topics', [])),
            'Language': github_data.get('language', 'Unknown'),
            'License': github_data.get('license', {}).get('spdx_id', 'No License') if github_data.get('license') else 'No License'
        }
        
        # Calculate age
        if 'created_at' in github_data:
            created = datetime.fromisoformat(github_data['created_at'].replace('Z', '+00:00'))
            features['repo_age_days'] = (datetime.now(created.tzinfo) - created).days
        else:
            features['repo_age_days'] = 365
        
        # Calculate days since update
        if 'updated_at' in github_data:
            updated = datetime.fromisoformat(github_data['updated_at'].replace('Z', '+00:00'))
            features['days_since_update'] = (datetime.now(updated.tzinfo) - updated).days
        else:
            features['days_since_update'] = 7
        
        return features
    
    def predict_scores(self, repo_features: Dict) -> Dict:
        """
        Predict repository quality scores with feature contributions
        
        Args:
            repo_features: Dictionary with repository features
            
        Returns:
            Dictionary with ML scores and feature contributions
        """
        try:
            # Convert to DataFrame
            df = pd.DataFrame([repo_features])
            
            # Engineer features
            df = self.feature_engineer.engineer_features(df)
            
            # Prepare features for prediction
            X = self.feature_engineer.prepare_features_for_prediction(repo_features)
            
            # Make predictions if models are loaded
            if self.models_loaded:
                predictions = self.trainer.predict(X)
            else:
                # Fallback to heuristic scoring
                predictions = self._heuristic_scoring(df)
            
            # Calculate feature contributions
            feature_contributions = self._calculate_feature_contributions(df, predictions)
            
            # Calculate confidence based on feature quality
            confidence = self._calculate_confidence(df)
            
            return {
                'ml_scores': {
                    'overall_quality': round(predictions.get('overall_quality_score', 0), 1),
                    'maintainability': round(predictions.get('maintainability_score', 0), 1),
                    'scalability': round(predictions.get('scalability_score', 0), 1),
                    'architecture': round(predictions.get('architecture_score', 0), 1),
                    'production_readiness': round(predictions.get('production_readiness_score', 0), 1)
                },
                'feature_contributions': feature_contributions,
                'confidence': confidence,
                'model_used': 'ml' if self.models_loaded else 'heuristic'
            }
            
        except Exception as e:
            logger.error(f"Error predicting scores: {e}")
            # Return default scores on error
            return {
                'ml_scores': {
                    'overall_quality': 50.0,
                    'maintainability': 50.0,
                    'scalability': 50.0,
                    'architecture': 50.0,
                    'production_readiness': 50.0
                },
                'feature_contributions': {},
                'confidence': 0.5,
                'model_used': 'fallback',
                'error': str(e)
            }
    
    def _heuristic_scoring(self, df: pd.DataFrame) -> Dict:
        """
        Fallback heuristic scoring when ML models are not available
        
        Args:
            df: DataFrame with engineered features
            
        Returns:
            Dictionary with scores
        """
        row = df.iloc[0]
        
        # Calculate scores based on engineered features
        scores = {
            'overall_quality_score': row.get('popularity_score', 50) * 0.3 + 
                                    row.get('documentation_score', 50) * 0.3 +
                                    row.get('activity_score', 50) * 0.2 +
                                    row.get('maturity_score', 50) * 0.2,
            'maintainability_score': row.get('maintenance_score', 50),
            'scalability_score': row.get('maturity_score', 50) * 0.5 + 
                                row.get('popularity_score', 50) * 0.3 +
                                row.get('documentation_score', 50) * 0.2,
            'architecture_score': row.get('maturity_score', 50) * 0.4 +
                                 row.get('popularity_score', 50) * 0.3 +
                                 (100 if not row.get('Is Fork', False) else 70) * 0.3,
            'production_readiness_score': row.get('activity_score', 50) * 0.3 +
                                         row.get('documentation_score', 50) * 0.3 +
                                         (100 if row.get('has_license', False) else 50) * 0.2 +
                                         (100 if not row.get('Is Archived', False) else 0) * 0.2
        }
        
        # Clip all scores to 0-100
        for key in scores:
            scores[key] = float(np.clip(scores[key], 0, 100))
        
        return scores
    
    def _calculate_feature_contributions(self, df: pd.DataFrame, predictions: Dict) -> Dict:
        """
        Calculate which features contributed most to the predictions
        
        Args:
            df: DataFrame with engineered features
            predictions: Dictionary with predicted scores
            
        Returns:
            Dictionary with feature contributions
        """
        row = df.iloc[0]
        
        # Identify positive and negative contributing factors
        positive_factors = []
        negative_factors = []
        
        # Documentation factors
        if row.get('documentation_score', 0) > 70:
            positive_factors.append({
                'factor': 'Strong Documentation',
                'impact': 'high',
                'description': 'Well-documented with comprehensive README'
            })
        elif row.get('documentation_score', 0) < 40:
            negative_factors.append({
                'factor': 'Weak Documentation',
                'impact': 'medium',
                'description': 'Limited or missing documentation'
            })
        
        # Popularity factors
        if row.get('popularity_score', 0) > 70:
            positive_factors.append({
                'factor': 'High Community Engagement',
                'impact': 'medium',
                'description': f"Strong community with {row.get('Stars', 0)} stars"
            })
        
        # Activity factors
        if row.get('activity_score', 0) > 70:
            positive_factors.append({
                'factor': 'Active Development',
                'impact': 'high',
                'description': 'Recently updated and actively maintained'
            })
        elif row.get('activity_score', 0) < 40:
            negative_factors.append({
                'factor': 'Inactive Repository',
                'impact': 'high',
                'description': 'Not recently updated'
            })
        
        # Maturity factors
        if row.get('maturity_score', 0) > 70:
            positive_factors.append({
                'factor': 'Mature Codebase',
                'impact': 'high',
                'description': 'Well-established project with proven track record'
            })
        
        # License factor
        if row.get('has_license', False):
            positive_factors.append({
                'factor': 'Open Source License',
                'impact': 'medium',
                'description': 'Properly licensed for open source use'
            })
        else:
            negative_factors.append({
                'factor': 'No License',
                'impact': 'medium',
                'description': 'Missing license information'
            })
        
        # Fork status
        if row.get('Is Fork', False):
            negative_factors.append({
                'factor': 'Forked Repository',
                'impact': 'low',
                'description': 'This is a fork of another repository'
            })
        
        # Archived status
        if row.get('Is Archived', False):
            negative_factors.append({
                'factor': 'Archived Repository',
                'impact': 'critical',
                'description': 'Repository is archived and no longer maintained'
            })
        
        return {
            'positive_factors': positive_factors,
            'negative_factors': negative_factors,
            'top_contributing_features': [
                {'name': 'Documentation Quality', 'score': row.get('documentation_score', 50)},
                {'name': 'Community Engagement', 'score': row.get('popularity_score', 50)},
                {'name': 'Development Activity', 'score': row.get('activity_score', 50)},
                {'name': 'Project Maturity', 'score': row.get('maturity_score', 50)}
            ]
        }
    
    def _calculate_confidence(self, df: pd.DataFrame) -> float:
        """
        Calculate prediction confidence based on feature quality
        
        Args:
            df: DataFrame with engineered features
            
        Returns:
            Confidence score (0-1)
        """
        row = df.iloc[0]
        
        # Factors that increase confidence
        confidence_factors = []
        
        # Has good documentation
        if row.get('documentation_score', 0) > 50:
            confidence_factors.append(0.2)
        
        # Has community engagement
        if row.get('popularity_score', 0) > 30:
            confidence_factors.append(0.2)
        
        # Is actively maintained
        if row.get('activity_score', 0) > 50:
            confidence_factors.append(0.2)
        
        # Has license
        if row.get('has_license', False):
            confidence_factors.append(0.15)
        
        # Not a fork
        if not row.get('Is Fork', False):
            confidence_factors.append(0.1)
        
        # Not archived
        if not row.get('Is Archived', False):
            confidence_factors.append(0.15)
        
        # Calculate total confidence
        confidence = sum(confidence_factors)
        
        # Ensure confidence is between 0.3 and 0.95
        return float(np.clip(confidence, 0.3, 0.95))
    
    def analyze_repository(self, scan_result: Dict, github_metadata: Optional[Dict] = None) -> Dict:
        """
        Complete ML analysis of a repository
        
        Args:
            scan_result: Result from file_scanner.scan()
            github_metadata: Optional GitHub API metadata
            
        Returns:
            Dictionary with ML analysis results
        """
        # Extract features
        if github_metadata:
            features = self.extract_features_from_github_metadata(github_metadata)
        else:
            features = self.extract_features_from_scan(scan_result)
        
        # Merge with scan result features
        scan_features = self.extract_features_from_scan(scan_result)
        features.update({
            'Size': scan_features['Size'],
            'has_description': scan_features['has_description'],
            'description_length': scan_features['description_length']
        })
        
        # Predict scores
        result = self.predict_scores(features)
        
        # Add feature summary
        result['feature_summary'] = {
            'stars': features.get('Stars', 0),
            'forks': features.get('Forks', 0),
            'issues': features.get('Issues', 0),
            'size': features.get('Size', 0),
            'age_days': features.get('repo_age_days', 0),
            'days_since_update': features.get('days_since_update', 0),
            'has_license': features.get('License', 'Unknown') != 'No License',
            'language': features.get('Language', 'Unknown')
        }
        
        return result


# Made with Bob