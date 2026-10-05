# Machine Learning Integration Guide

## Overview

This guide explains the ML-powered repository intelligence system integrated into the AI GitHub Repository Analyzer platform.

## Architecture

```
GitHub Repository
        ↓
Repository Scanner (file_scanner.py)
        ↓
Feature Extraction (feature_engineering.py)
        ↓
ML Prediction Service (ml_service.py)
        ↓
Prompt Builder (prompt_builder.py) ← ML Results Injected Here
        ↓
LLM Analysis (analysis_service.py)
        ↓
Frontend Dashboard (React Components)
```

## Key Components

### 1. ML Pipeline (`backend/ml/`)

**Dataset Loader** (`dataset_loader.py`)
- Loads Kaggle GitHub repository dataset
- Handles timezone issues
- Preprocesses repository metadata
- Samples 5,000 repositories for training

**Feature Engineering** (`feature_engineering.py`)
- Extracts 20+ repository features
- Combines GitHub metadata with static analysis
- Normalizes numeric features
- Handles missing values

**Label Generator** (`label_generator.py`)
- Creates quality scores from repository metrics
- Weighted scoring system:
  - Popularity: 20%
  - Maintainability: 25%
  - Documentation: 15%
  - Architecture: 20%
  - Activity: 10%
  - Security: 10%

**Model Trainer** (`model_trainer.py`)
- Trains XGBoost/RandomForest models
- Predicts 5 quality scores:
  - Overall Quality
  - Maintainability
  - Scalability
  - Architecture
  - Production Readiness
- Evaluates with RMSE, MAE, R² metrics
- Serializes trained models

**ML Service** (`ml_service.py`)
- Loads trained models
- Generates predictions for new repositories
- Calculates feature contributions (explainability)
- Computes prediction confidence scores
- Falls back to heuristic scoring if models unavailable

### 2. Backend Integration

**Prompt Builder** (`backend/services/prompt_builder.py`)
- Accepts ML results as input
- Injects ML scores into AI prompts
- Includes feature contributions
- Adds confidence metrics
- Instructs LLM to ground explanations in ML predictions

**Analysis Service** (`backend/services/analysis_service.py`)
- Gets ML predictions first
- Passes ML results to prompt builder
- Combines ML scores with LLM explanations
- Returns hybrid AI + ML analysis

**API Route** (`backend/routes/analyze.py`)
- Orchestrates analysis pipeline
- Gets ML predictions before LLM analysis
- Returns comprehensive results with ML scores

### 3. Frontend Components

**MLScoresCard** (`frontend/components/MLScoresCard.tsx`)
- Displays 5 ML quality scores
- Animated progress bars
- Color-coded score indicators
- Model confidence display

**FeatureContributionCard** (`frontend/components/FeatureContributionCard.tsx`)
- Shows ML explainability
- Top contributing features
- Positive/negative factors
- Confidence meter

**Other Premium Components**
- RepositorySummary
- EngineeringSummary
- ArchitectureVisualization
- TechnologyStack
- ImportantFilesExplorer
- SecurityAnalysisPanel
- OnboardingGuide
- ImprovementSuggestions

## ML Features Extracted

### GitHub Metadata Features
- stars
- forks
- watchers
- open_issues
- subscribers_count
- repository_size
- language
- has_wiki
- has_pages
- has_downloads

### Static Analysis Features
- total_files
- total_lines_of_code
- average_file_size
- average_function_length
- max_function_length
- folder_depth
- dependency_count
- has_tests
- has_ci_cd
- has_docker
- readme_length
- code_complexity
- duplicate_code_ratio
- security_warning_count

## ML Explainability

### Feature Contributions
The system identifies which features positively or negatively impact scores:

**Positive Contributors:**
- High test coverage
- Good documentation
- Clean architecture
- Active maintenance

**Negative Contributors:**
- Missing tests
- High complexity
- Security warnings
- Poor documentation

### Confidence Scoring
Prediction confidence (0.3-0.95) based on:
- Feature completeness
- Data quality
- Model certainty

## Setup Instructions

### 1. Install ML Dependencies

```bash
cd backend
pip install -r requirements-ml.txt
```

### 2. Prepare Dataset

Place the Kaggle dataset in `data/repositories.csv`:
```
data/
  repositories.csv
```

### 3. Train ML Models

```bash
cd backend/ml
python model_trainer.py
```

This will:
- Load and preprocess dataset
- Engineer features
- Generate labels
- Train XGBoost models
- Evaluate performance
- Save models to `backend/ml/models/`

### 4. Verify Models

Check that models were created:
```
backend/ml/models/
  overall_quality_model.pkl
  maintainability_model.pkl
  scalability_model.pkl
  architecture_model.pkl
  production_readiness_model.pkl
```

### 5. Start Backend

```bash
cd backend
uvicorn server:app --reload --port 8000
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

### 7. Test ML Integration

1. Open http://localhost:3000
2. Enter a GitHub repository URL
3. Click "Analyze Repository"
4. Verify ML scores appear in the dashboard
5. Check feature contributions card
6. Confirm AI explanations reference ML scores

## Testing ML-Grounded Analysis

### What to Verify

**ML Scores Display:**
- ✅ 5 scores shown (0-100 range)
- ✅ Progress bars animated
- ✅ Color-coded indicators
- ✅ Model confidence displayed

**Feature Contributions:**
- ✅ Top contributing features listed
- ✅ Positive factors highlighted (green)
- ✅ Negative factors highlighted (red)
- ✅ Confidence meter shown

**AI Explanations:**
- ✅ Reference ML scores explicitly
- ✅ Explain score reasoning
- ✅ Ground insights in repository metrics
- ✅ Don't contradict ML predictions

**Engineering Analysis:**
- ✅ Uses ML maintainability score
- ✅ Explains score with actual features
- ✅ References test coverage, complexity, etc.

**Architecture Analysis:**
- ✅ Uses ML architecture score
- ✅ Explains folder structure quality
- ✅ References design patterns

**Production Readiness:**
- ✅ Uses ML production readiness score
- ✅ Explains CI/CD, testing, security
- ✅ References actual repository characteristics

## Troubleshooting

### Models Not Loading

**Symptom:** "Using heuristic scoring - models not available"

**Solution:**
1. Check models exist in `backend/ml/models/`
2. Retrain models: `python backend/ml/model_trainer.py`
3. Verify file permissions

### Low Confidence Scores

**Symptom:** Confidence < 0.5

**Causes:**
- Missing repository features
- Incomplete GitHub metadata
- Small/empty repository

**Solution:**
- Test with larger, well-documented repositories
- Ensure repository has README, tests, CI/CD

### Generic AI Responses

**Symptom:** AI doesn't reference ML scores

**Solution:**
1. Verify ML results passed to prompt builder
2. Check `build_analysis_prompt()` includes ML context
3. Ensure analysis service gets ML predictions first

### Dataset Issues

**Symptom:** "Error loading dataset"

**Solution:**
1. Verify `data/repositories.csv` exists
2. Check CSV format matches expected schema
3. Ensure pandas can read the file

## Performance Optimization

### Model Loading
- Models loaded once at startup
- Cached in memory for fast predictions
- ~50-100ms prediction time

### Feature Extraction
- Parallel file scanning
- Efficient static analysis
- Cached repository metrics

### API Response Time
- ML prediction: ~100ms
- LLM analysis: ~2-5s (depends on API)
- Total: ~2-6s per repository

## Model Retraining

### When to Retrain
- New dataset available
- Model performance degrades
- Feature engineering changes
- Label generation updates

### How to Retrain
```bash
cd backend/ml
python model_trainer.py
```

### Evaluation Metrics
- RMSE: Root Mean Squared Error
- MAE: Mean Absolute Error
- R²: Coefficient of Determination

Target metrics:
- RMSE < 10
- MAE < 8
- R² > 0.7

## API Response Format

```json
{
  "success": true,
  "ml_scores": {
    "overall_quality": 85.2,
    "maintainability": 78.5,
    "scalability": 82.1,
    "architecture": 88.3,
    "production_readiness": 75.6
  },
  "feature_contributions": {
    "top_features": [
      {"name": "has_tests", "contribution": 12.5},
      {"name": "readme_length", "contribution": 8.3}
    ],
    "positive_factors": ["Good test coverage", "Comprehensive documentation"],
    "negative_factors": ["High code complexity", "Missing CI/CD"]
  },
  "confidence": 0.87,
  "model_used": "ml",
  "repository_overview": {...},
  "architecture_overview": {...},
  "improvement_suggestions": [...]
}
```

## Best Practices

### For Accurate Predictions
1. Analyze repositories with complete metadata
2. Ensure repositories have README files
3. Test with diverse repository types
4. Use repositories with >100 stars for better accuracy

### For ML Explainability
1. Always display feature contributions
2. Show confidence scores
3. Explain positive/negative factors
4. Reference actual repository characteristics

### For AI Grounding
1. Pass ML results to prompt builder
2. Instruct LLM to explain ML scores
3. Ensure AI doesn't contradict predictions
4. Ground all insights in measurable metrics

## Future Enhancements

### Planned Features
- [ ] Real-time GitHub API integration
- [ ] Contributor analysis
- [ ] Commit history analysis
- [ ] Issue/PR quality metrics
- [ ] Community health scoring
- [ ] Dependency vulnerability scanning
- [ ] Code smell detection
- [ ] Technical debt estimation

### Model Improvements
- [ ] Deep learning models (LSTM, Transformer)
- [ ] Multi-task learning
- [ ] Transfer learning from large codebases
- [ ] Ensemble methods
- [ ] Active learning for continuous improvement

## Support

For issues or questions:
1. Check TROUBLESHOOTING.md
2. Review error logs in backend console
3. Verify ML models are trained
4. Test with sample repositories first

## License

This ML integration is part of the AI GitHub Repository Analyzer platform.
Built for IBM Bob Hackathon 2026.