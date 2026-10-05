import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Tuple, Optional
import joblib
import logging
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler

# Try XGBoost first, fallback to RandomForest
try:
    from xgboost import XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    from sklearn.ensemble import RandomForestRegressor

from .dataset_loader import DatasetLoader
from .feature_engineering import FeatureEngineer
from .label_generator import LabelGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelTrainer:
    """Train ML models for repository quality prediction"""
    
    def __init__(self, model_dir: str = "backend/ml/models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.models = {}
        self.scalers = {}
        self.feature_names = []
        self.metrics = {}
        
        self.use_xgboost = XGBOOST_AVAILABLE
        logger.info(f"Using {'XGBoost' if self.use_xgboost else 'RandomForest'} for training")
    
    def prepare_data(self, max_repos: int = 5000) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Load and prepare data for training
        
        Args:
            max_repos: Maximum number of repositories to use
            
        Returns:
            Tuple of (features_df, labels_df)
        """
        logger.info("Preparing training data...")
        
        # Load dataset
        loader = DatasetLoader()
        df = loader.load_dataset(max_repos=max_repos)
        df = loader.preprocess_dataset()
        
        # Engineer features
        engineer = FeatureEngineer()
        df = engineer.engineer_features(df)
        
        # Generate labels
        label_gen = LabelGenerator()
        df = label_gen.generate_labels(df)
        
        # Get feature columns
        feature_cols = engineer.get_ml_features(df)
        target_cols = label_gen.get_target_columns()
        
        # Prepare features and labels
        X = df[feature_cols].copy()
        y = df[target_cols].copy()
        
        # Handle any remaining NaN values
        X = X.fillna(0)
        y = y.fillna(0)
        
        self.feature_names = feature_cols
        
        logger.info(f"Prepared {len(X)} samples with {len(feature_cols)} features")
        logger.info(f"Target variables: {target_cols}")
        
        return X, y
    
    def train_models(self, X: pd.DataFrame, y: pd.DataFrame, test_size: float = 0.2) -> Dict:
        """
        Train models for each target variable
        
        Args:
            X: Feature DataFrame
            y: Target DataFrame
            test_size: Proportion of data for testing
            
        Returns:
            Dictionary with training metrics
        """
        logger.info("Training models...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        self.scalers['feature_scaler'] = scaler
        
        # Train a model for each target
        for target_col in y.columns:
            logger.info(f"Training model for {target_col}...")
            
            # Create model
            if self.use_xgboost:
                model = XGBRegressor(
                    n_estimators=100,
                    max_depth=6,
                    learning_rate=0.1,
                    random_state=42,
                    n_jobs=-1
                )
            else:
                model = RandomForestRegressor(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42,
                    n_jobs=-1
                )
            
            # Train model
            model.fit(X_train_scaled, y_train[target_col])
            
            # Evaluate
            y_pred_train = model.predict(X_train_scaled)
            y_pred_test = model.predict(X_test_scaled)
            
            metrics = {
                'train_rmse': np.sqrt(mean_squared_error(y_train[target_col], y_pred_train)),
                'test_rmse': np.sqrt(mean_squared_error(y_test[target_col], y_pred_test)),
                'train_mae': mean_absolute_error(y_train[target_col], y_pred_train),
                'test_mae': mean_absolute_error(y_test[target_col], y_pred_test),
                'train_r2': r2_score(y_train[target_col], y_pred_train),
                'test_r2': r2_score(y_test[target_col], y_pred_test)
            }
            
            self.models[target_col] = model
            self.metrics[target_col] = metrics
            
            logger.info(f"{target_col} - Test RMSE: {metrics['test_rmse']:.2f}, Test R²: {metrics['test_r2']:.3f}")
        
        return self.metrics
    
    def save_models(self) -> None:
        """Save trained models and scalers to disk"""
        logger.info("Saving models...")
        
        # Save each model
        for target_col, model in self.models.items():
            model_path = self.model_dir / f"{target_col}_model.joblib"
            joblib.dump(model, model_path)
            logger.info(f"Saved {target_col} model to {model_path}")
        
        # Save scaler
        scaler_path = self.model_dir / "feature_scaler.joblib"
        joblib.dump(self.scalers['feature_scaler'], scaler_path)
        logger.info(f"Saved scaler to {scaler_path}")
        
        # Save feature names
        features_path = self.model_dir / "feature_names.joblib"
        joblib.dump(self.feature_names, features_path)
        logger.info(f"Saved feature names to {features_path}")
        
        # Save metrics
        metrics_path = self.model_dir / "training_metrics.joblib"
        joblib.dump(self.metrics, metrics_path)
        logger.info(f"Saved metrics to {metrics_path}")
    
    def load_models(self) -> bool:
        """
        Load trained models from disk
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Loading models...")
            
            # Load feature names
            features_path = self.model_dir / "feature_names.joblib"
            if not features_path.exists():
                logger.error("Feature names file not found")
                return False
            
            self.feature_names = joblib.load(features_path)
            
            # Load scaler
            scaler_path = self.model_dir / "feature_scaler.joblib"
            if not scaler_path.exists():
                logger.error("Scaler file not found")
                return False
            
            self.scalers['feature_scaler'] = joblib.load(scaler_path)
            
            # Load models
            target_cols = [
                'overall_quality_score',
                'maintainability_score',
                'scalability_score',
                'architecture_score',
                'production_readiness_score'
            ]
            
            for target_col in target_cols:
                model_path = self.model_dir / f"{target_col}_model.joblib"
                if not model_path.exists():
                    logger.warning(f"Model file not found: {model_path}")
                    continue
                
                self.models[target_col] = joblib.load(model_path)
                logger.info(f"Loaded {target_col} model")
            
            # Load metrics if available
            metrics_path = self.model_dir / "training_metrics.joblib"
            if metrics_path.exists():
                self.metrics = joblib.load(metrics_path)
            
            logger.info(f"Successfully loaded {len(self.models)} models")
            return True
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            return False
    
    def predict(self, X: pd.DataFrame) -> Dict[str, float]:
        """
        Make predictions for a repository
        
        Args:
            X: Feature DataFrame (single row)
            
        Returns:
            Dictionary with predicted scores
        """
        if not self.models:
            raise ValueError("No models loaded. Train or load models first.")
        
        # Ensure features are in correct order
        X_ordered = X[self.feature_names].copy()
        
        # Scale features
        X_scaled = self.scalers['feature_scaler'].transform(X_ordered)
        
        # Make predictions
        predictions = {}
        for target_col, model in self.models.items():
            pred = model.predict(X_scaled)[0]
            # Clip to 0-100 range
            predictions[target_col] = float(np.clip(pred, 0, 100))
        
        return predictions
    
    def get_metrics_summary(self) -> Dict:
        """Get summary of training metrics"""
        if not self.metrics:
            return {}
        
        summary = {}
        for target_col, metrics in self.metrics.items():
            summary[target_col] = {
                'test_rmse': round(metrics['test_rmse'], 2),
                'test_mae': round(metrics['test_mae'], 2),
                'test_r2': round(metrics['test_r2'], 3)
            }
        
        return summary


def train_and_save_models(max_repos: int = 5000) -> Dict:
    """
    Convenience function to train and save models
    
    Args:
        max_repos: Maximum number of repositories to use for training
        
    Returns:
        Dictionary with training metrics
    """
    trainer = ModelTrainer()
    
    # Prepare data
    X, y = trainer.prepare_data(max_repos=max_repos)
    
    # Train models
    metrics = trainer.train_models(X, y)
    
    # Save models
    trainer.save_models()
    
    # Print summary
    logger.info("\n" + "="*50)
    logger.info("TRAINING SUMMARY")
    logger.info("="*50)
    summary = trainer.get_metrics_summary()
    for target, metric in summary.items():
        logger.info(f"\n{target}:")
        logger.info(f"  Test RMSE: {metric['test_rmse']}")
        logger.info(f"  Test MAE:  {metric['test_mae']}")
        logger.info(f"  Test R²:   {metric['test_r2']}")
    logger.info("="*50)
    
    return metrics


# Made with Bob