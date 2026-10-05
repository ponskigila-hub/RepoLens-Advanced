"""Construct bounded prompts from measured repository evidence."""
import json
from typing import Any


class PromptBuilder:
    def build_static_analysis_prompt(self, repo_name: str, scan: dict[str, Any], analysis: dict[str, Any]) -> str:
        evidence = {
            "repository": repo_name,
            "technologies": scan.get("technologies", []),
            "file_count": scan.get("file_count", 0),
            "source_lines": scan.get("total_lines", 0),
            "language_breakdown": scan.get("language_breakdown", {}),
            "folder_breakdown": scan.get("folder_breakdown", [])[:30],
            "important_files": [{"path": f.get("path"), "category": f.get("category"), "lines": f.get("lines")} for f in scan.get("important_files", [])[:25]],
            "readme_excerpt": scan.get("readme_content", "")[:2500],
            "metrics": analysis.get("metrics", {}),
            "scores": {name: value.get("score") for name, value in analysis.get("scores", {}).items()},
        }
        return (
            "Review this repository using only the evidence below. Explain the actual architecture and data flow where visible; "
            "identify specific strengths, risks, and prioritized next steps. Distinguish measured facts from inference. "
            "Do not invent code, test coverage, vulnerabilities, deployments, or score values. Keep the response concise and actionable.\n\n"
            + json.dumps(evidence, ensure_ascii=False, default=str)
        )
