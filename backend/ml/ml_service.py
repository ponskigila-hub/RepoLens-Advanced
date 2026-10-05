"""Compatibility facade for the current evidence-based scorer.

Saved training models and synthetic metadata heuristics are intentionally not
loaded by RepoLens. The current public API scoring source is StaticAnalyzer.
"""
from __future__ import annotations

from typing import Any
from services.static_analyzer import StaticAnalyzer


class MLService:
    """Legacy class name retained; delegates real scan results to StaticAnalyzer."""
    def __init__(self, *args, **kwargs):
        self.analyzer = StaticAnalyzer()
        self.models_loaded = False

    def analyze_repository(self, scan_result: dict[str, Any], github_metadata: dict | None = None) -> dict[str, Any]:
        if not isinstance(scan_result, dict) or "source_files" not in scan_result:
            raise ValueError("Pass a FileScanner scan result; synthesized GitHub metadata is not a scoring input.")
        result = self.analyzer.analyze(scan_result)
        scores = result["scores"]
        values = {key: value["score"] for key, value in scores.items()}
        components = scores["quality"]["components"]
        contributions = {
            "positive_factors": [{"factor": c["name"], "impact": "positive", "description": c["evidence"]} for c in components if c["score"] >= 70],
            "negative_factors": [{"factor": c["name"], "impact": "needs_attention", "description": c["evidence"]} for c in components if c["score"] < 40],
            "top_contributing_features": [{"name": c["name"], "score": c["score"], "weight": c["weight"]} for c in components],
        }
        return {
            "ml_scores": {
                "overall_quality": values["overall_quality"], "maintainability": values["maintainability"],
                "scalability": values["scalability"], "architecture": values["architecture"],
                "production_readiness": values["production_readiness"],
            },
            "feature_contributions": contributions,
            "confidence": round(min(1.0, len(scan_result["source_files"]) / max(scan_result.get("source_file_count", 0), 1)), 2),
            "model_used": result["score_methodology"]["version"], "metrics": result["metrics"],
            "score_methodology": result["score_methodology"],
        }

    def predict_scores(self, repo_features: dict[str, Any]) -> dict[str, Any]:
        """Reject synthetic/tabular inputs rather than returning made-up scores."""
        if not isinstance(repo_features, dict) or "source_files" not in repo_features:
            raise ValueError("Dynamic scoring requires an actual FileScanner scan result.")
        return self.analyze_repository(repo_features)

    @staticmethod
    def extract_features_from_scan(scan_result: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(scan_result, dict) or "source_files" not in scan_result:
            raise ValueError("A FileScanner scan result is required.")
        return StaticAnalyzer().analyze(scan_result)["metrics"]
