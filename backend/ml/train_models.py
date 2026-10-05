"""
Script to train ML models for repository quality prediction
Run this script to train and save models before using the ML service
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from ml.model_trainer import train_and_save_models
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """Train and save ML models"""
    logger.info("Starting model training...")
    logger.info("This may take a few minutes...")
    
    try:
        # Train with 5000 repositories (adjust as needed)
        metrics = train_and_save_models(max_repos=5000)
        
        logger.info("\nTraining completed successfully!")
        logger.info("Models saved to backend/ml/models/")
        logger.info("\nYou can now use the ML service for predictions.")
        
        return 0
        
    except Exception as e:
        logger.error(f"Error during training: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())

# Made with Bob