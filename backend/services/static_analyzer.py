"""Evidence-based repository metrics and deterministic scorecards.

Scores are direct, versioned transformations of scanned code/artifacts; model
files, popularity estimates, and constant fallback scores are not used.
"""
from __future__ import annotations

import ast
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from typing import Any


class _ComplexityVisitor(ast.NodeVisitor):
    BRANCH_NODES = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.IfExp, ast.ExceptHandler, ast.comprehension)

    def __init__(self):
        self.functions: list[dict[str, Any]] = []
        self.classes = 0
        self.imports = 0
        self._function_depth = 0
        self._current_complexity = 1

    def visit_FunctionDef(self, node): self._function(node)
    def visit_AsyncFunctionDef(self, node): self._function(node)

    def _function(self, node):
        record = {"name": node.name, "line": node.lineno, "complexity": 1}
        self.functions.append(record)
        previous = self._current_complexity
        self._current_complexity = 1
        self._function_depth += 1
        for child in node.body:
            self.visit(child)
        record["complexity"] = self._current_complexity
        self._function_depth -= 1
        self._current_complexity = previous

    def visit_ClassDef(self, node):
        self.classes += 1
        self.generic_visit(node)

    def visit_Import(self, node): self.imports += len(node.names)
    def visit_ImportFrom(self, node): self.imports += len(node.names)

    def generic_visit(self, node):
        if self._function_depth and isinstance(node, self.BRANCH_NODES):
            self._current_complexity += 1
        if self._function_depth and isinstance(node, ast.BoolOp):
            self._current_complexity += max(0, len(node.values) - 1)
        if self._function_depth and isinstance(node, ast.Match):
            self._current_complexity += len(node.cases)
        super().generic_visit(node)


class StaticAnalyzer:
    SCORE_VERSION = "static-v2"
    BRANCH_PATTERN = re.compile(r"\b(if|else\s+if|elif|for|while|catch|case|when|except)\b|&&|\|\||\?\s*[^:?]+:")
    FUNCTION_PATTERN = re.compile(r"\b(?:function\s+[\w$]+|def\s+\w+|async\s+def\s+\w+|(?:public|private|protected|static|async|export|const|let|var|func|fn)\s+)+[\w$]+\s*\([^;{}]*\)\s*(?:->\s*[^:{]+)?\s*(?:\{|:)")
    ENTRYPOINTS = {"main.py", "main.ts", "main.js", "index.ts", "index.js", "app.py", "app.ts", "app.js", "server.py", "server.ts", "server.js", "manage.py", "program.cs", "main.go", "main.rs"}
    LAYER_NAMES = {"api", "routes", "controllers", "services", "service", "models", "model", "repositories", "repository", "domain", "core", "components", "lib", "utils", "middleware", "frontend", "backend", "infra", "infrastructure"}

    def analyze(self, scan: dict[str, Any]) -> dict[str, Any]:
        files = scan.get("files", [])
        source = scan.get("source_files", [])
        complexity_values: list[int] = []
        functions = classes = imports = branches = syntax_errors = 0
        python_files = 0
        comment_lines = source_lines = 0
        todos = []
        large_files = []
        secret_candidates = []
        for item in source:
            path, content = item["path"], item["content"]
            if item.get("language") == "Python":
                python_files += 1
                try:
                    tree = ast.parse(content, filename=path)
                    visitor = _ComplexityVisitor()
                    visitor.visit(tree)
                    functions += len(visitor.functions)
                    classes += visitor.classes
                    imports += visitor.imports
                    complexity_values.extend(x["complexity"] for x in visitor.functions)
                except (SyntaxError, ValueError):
                    syntax_errors += 1
            else:
                found_functions = len(self.FUNCTION_PATTERN.findall(content))
                found_branches = len(self.BRANCH_PATTERN.findall(content))
                functions += found_functions
                branches += found_branches
                complexity_values.extend([1 + min(found_branches, 100) / max(found_functions, 1)] * found_functions)
                imports += len(re.findall(r"(?m)^\s*(?:import\s|from\s[\w.]+\s+import|#include\s|using\s+|require\s*\(|export\s+)", content))
            lines = content.splitlines()
            source_lines += len(lines)
            comment_lines += sum(1 for line in lines if line.strip().startswith(("#", "//", "/*", "*", "<!--", "--")))
            if len(lines) > 500:
                large_files.append({"path": path, "lines": len(lines)})
            for line_number, line in enumerate(lines, 1):
                if re.search(r"\b(TODO|FIXME|XXX|HACK)\b", line, re.I) and len(todos) < 100:
                    todos.append({"path": path, "line": line_number, "marker": re.search(r"\b(TODO|FIXME|XXX|HACK)\b", line, re.I).group(1)})
                if re.search(r"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][A-Za-z0-9_./+=-]{12,}['\"]", line):
                    secret_candidates.append({"path": path, "line": line_number, "reason": "credential-like literal pattern; review manually"})
        avg_complexity = round(sum(complexity_values) / len(complexity_values), 2) if complexity_values else None
        max_complexity = max(complexity_values) if complexity_values else None
        coverage = self._coverage(scan)
        metrics = {
            "files": {"total": scan.get("file_count", 0), "source": scan.get("source_file_count", 0), "tests": scan.get("test_file_count", 0), "scanned_source": len(source)},
            "lines": {"source_and_tests": scan.get("total_lines", 0), "source": scan.get("lines_by_category", {}).get("source", 0), "tests": scan.get("lines_by_category", {}).get("test", 0), "comments": comment_lines, "comment_to_source_ratio": round(comment_lines / source_lines, 3) if source_lines else None},
            "ast": {"python_files_parsed": python_files, "syntax_error_files": syntax_errors, "functions": functions, "classes": classes, "imports": imports, "average_cyclomatic_complexity": avg_complexity, "maximum_cyclomatic_complexity": max_complexity, "complexity_method": "Python AST branch counting; non-Python branching/function estimates from syntax patterns"},
            "tests": {"files": scan.get("test_file_count", 0), "coverage_percent": coverage, "coverage_is_measured": coverage is not None},
            "dependencies": scan.get("dependencies", {}),
            "artifacts": scan.get("artifacts", {}),
            "maintenance_signals": {"todo_markers": len(todos), "todo_samples": todos[:30], "large_source_files_over_500_lines": large_files, "credential_literal_candidates": secret_candidates[:30]},
            "language_breakdown": scan.get("language_breakdown", {}),
        }
        signals = self._signals(scan, metrics, complexity_values)
        scores = self._scores(signals, metrics)
        return {
            "metrics": metrics,
            "scores": scores,
            "score_methodology": {
                "version": self.SCORE_VERSION,
                "method": "deterministic weighted scorecard computed from scanned source, AST metrics, repository structure, dependencies, tests, and delivery artifacts",
                "score_range": [0, 100],
                "not_used": ["repository popularity", "synthetic GitHub metadata", "trained model predictions", "constant success fallbacks"],
                "coverage_note": "Coverage contributes only when an actual supported coverage report is present; absent report is returned as null, not inferred.",
            },
        }

    @staticmethod
    def _coverage(scan: dict[str, Any]) -> float | None:
        root = Path(scan.get("root_path", "."))
        total, covered = 0, 0
        for file in scan.get("files", []):
            path = file.get("path", "")
            try:
                if Path(path).name.lower() == "coverage.xml":
                    xml = ET.parse(root / path).getroot()
                    covered += int(float(xml.attrib.get("lines-covered", 0)))
                    total += int(float(xml.attrib.get("lines-valid", 0)))
                elif Path(path).name.lower() == "lcov.info":
                    text = (root / path).read_text(encoding="utf-8", errors="ignore")
                    total += sum(int(n) for n in re.findall(r"^LF:(\d+)$", text, re.M))
                    covered += sum(int(n) for n in re.findall(r"^LH:(\d+)$", text, re.M))
                elif Path(path).name.lower() in {"coverage-final.json", "coverage.json"}:
                    data = json.loads((root / path).read_text(encoding="utf-8", errors="ignore"))
                    if isinstance(data.get("files"), dict):
                        entries = data["files"].values()
                        for entry in entries:
                            summary = entry.get("summary", {})
                            total += int(summary.get("num_statements", summary.get("total", {}).get("lines", 0)))
                            covered += int(summary.get("covered_lines", summary.get("covered", {}).get("lines", 0)))
                    elif isinstance(data, dict):
                        for entry in data.values():
                            if not isinstance(entry, dict): continue
                            statements = entry.get("s", {})
                            if isinstance(statements, dict) and statements:
                                total += len(statements)
                                covered += sum(1 for count in statements.values() if count)
                            else:
                                summary = entry.get("summary", {})
                                total += int(summary.get("num_statements", 0))
                                covered += int(summary.get("covered_lines", 0))
            except (OSError, ValueError, ET.ParseError):
                continue
        return round(100 * covered / total, 2) if total else None

    def _signals(self, scan, metrics, complexities):
        artifacts = scan.get("artifacts", {})
        deps = scan.get("dependencies", {})
        source_count = scan.get("source_file_count", 0)
        test_count = scan.get("test_file_count", 0)
        folders = scan.get("folder_breakdown", [])
        source_folders = {str(Path(folder["path"]).parts[0]) for folder in folders if folder.get("source_files") and folder.get("path") != "."}
        directory_modularity = min(len(source_folders) / 5, 1)
        file_modularity = min(source_count / 25, 1)
        modularity = 0.55 * directory_modularity + 0.45 * file_modularity
        avg = metrics["ast"]["average_cyclomatic_complexity"]
        complexity_health = max(0, min(1, 1 - ((avg or 0) - 1) / 14)) if avg is not None else 0
        test_ratio = min(test_count / max(source_count, 1), 1)
        test_presence = min(test_ratio * 2, 1)
        coverage = metrics["tests"]["coverage_percent"]
        test_quality = (coverage / 100) if coverage is not None else test_presence
        lines = metrics["lines"]["source_and_tests"]
        readme_lines = len(scan.get("readme_content", "").splitlines())
        documentation = min(readme_lines / 80, 1) * 0.65 + min(sum(1 for f in scan.get("files", []) if f["category"] == "documentation") / 4, 1) * 0.35
        dep_density = deps.get("count", 0) / max(source_count, 1)
        dep_health = 1 / (1 + dep_density / 2) if deps.get("count", 0) else float(bool(deps.get("manifests")))
        lock_health = float(bool(deps.get("lockfiles")))
        source_dirs = {
            Path(folder["path"]).name.lower()
            for folder in folders
            if folder.get("source_files") and Path(folder["path"]).parts
        }
        layers = len(source_dirs & self.LAYER_NAMES)
        layering = min(layers / 4, 1)
        entrypoint_count = sum(1 for f in scan.get("files", []) if Path(f["path"]).name.lower() in self.ENTRYPOINTS)
        entrypoint_signal = min(entrypoint_count / 3, 1)
        source_size = sum(f.get("size_bytes", 0) for f in scan.get("files", []) if f["category"] == "source")
        small_files = sum(1 for f in scan.get("files", []) if f["category"] == "source" and (f.get("lines") or 0) <= 500)
        size_distribution = small_files / source_count if source_count else 0
        async_signal = min(sum(len(re.findall(r"\b(async|await|goroutine|tokio|thread|ThreadPool)\b", item["content"])) for item in scan.get("source_files", [])) / max(source_count, 1) / 3, 1)
        test_isolated = float(any("test" in Path(f["path"]).parts or "tests" in Path(f["path"]).parts for f in scan.get("files", []) if f["category"] == "test"))
        return {
            "modularity": modularity, "complexity_health": complexity_health,
            "test_presence": test_presence, "test_quality": test_quality,
            "documentation": documentation, "dependency_health": dep_health,
            "lockfile": lock_health, "layering": layering, "entrypoints": entrypoint_signal,
            "size_distribution": size_distribution, "ci": float(artifacts.get("has_ci", False)),
            "docker": float(artifacts.get("has_docker", False)), "license": float(artifacts.get("has_root_license", artifacts.get("has_license", False))),
            "github_workflow": float(artifacts.get("has_github_workflow", False)),
            "dockerfile": float(artifacts.get("has_root_dockerfile", artifacts.get("has_dockerfile", False))),
            "gitignore": float(artifacts.get("has_root_gitignore", artifacts.get("has_gitignore", False))),
            "readme_file": float(artifacts.get("has_root_readme", artifacts.get("has_readme", False))),
            "env_example": float(artifacts.get("has_env_example", False)),
            "security_workflow": float(artifacts.get("has_security_workflow", False)),
            "coverage": coverage / 100 if coverage is not None else 0,
            "async_evidence": async_signal, "test_isolation": test_isolated,
            "dependency_count": deps.get("count", 0), "source_bytes": source_size,
            "complexity_available": bool(complexities), "test_count": test_count,
            "source_count": source_count, "source_lines": lines,
        }

    @staticmethod
    def _scores(s, metrics):
        # All component scores are based on observed evidence. Missing evidence
        # contributes zero and is explained in the returned component list.
        definitions = {
            "quality": ("Quality", [("complexity_health", .20, "Cyclomatic complexity"), ("modularity", .20, "Source modularity"), ("test_quality", .20, "Tests / measured coverage"), ("documentation", .15, "Documentation"), ("dependency_health", .15, "Dependency footprint"), ("lockfile", .10, "Dependency lockfile")]),
            "maintainability": ("Maintainability", [("complexity_health", .30, "Cyclomatic complexity"), ("modularity", .25, "Source modularity"), ("test_quality", .20, "Tests / measured coverage"), ("documentation", .15, "Documentation"), ("size_distribution", .10, "Source-file size distribution")]),
            "scalability": ("Scalability", [("modularity", .30, "Source modularity"), ("layering", .20, "Layered boundaries"), ("docker", .15, "Container deployment evidence"), ("ci", .10, "Automated delivery evidence"), ("async_evidence", .10, "Concurrency / async code evidence"), ("dependency_health", .10, "Dependency footprint"), ("lockfile", .05, "Dependency lockfile")]),
            "architecture": ("Architecture", [("modularity", .25, "Source modularity"), ("layering", .25, "Architectural layer directories"), ("entrypoints", .20, "Entrypoint organization"), ("test_isolation", .15, "Test separation"), ("size_distribution", .15, "Source-file size distribution")]),
            "production_readiness": ("Production Readiness", [("test_quality", .15, "Tests / measured coverage"), ("ci", .10, "CI/CD configuration"), ("github_workflow", .10, "GitHub Actions workflow"), ("dockerfile", .10, "Root Dockerfile"), ("lockfile", .10, "Dependency lockfile"), ("license", .10, "Root license file"), ("env_example", .10, "Environment template"), ("security_workflow", .10, "Security automation"), ("documentation", .05, "Documentation depth"), ("readme_file", .05, "Root README.md"), ("gitignore", .05, "Root .gitignore")]),
        }
        result = {}
        for key, (title, components) in definitions.items():
            weighted = sum(s[name] * weight for name, weight, _ in components)
            result[key] = {
                "score": round(weighted * 100, 1),
                "components": [{"name": label, "score": round(s[name] * 100, 1), "weight": weight, "evidence": StaticAnalyzer._evidence(name, s, metrics)} for name, weight, label in components],
            }
        result["overall_quality"] = {"score": result["quality"]["score"], "components": result["quality"]["components"]}
        return result

    @staticmethod
    def _evidence(name, signals, metrics):
        if name == "complexity_health": return f"Average cyclomatic complexity: {metrics['ast']['average_cyclomatic_complexity']} across {metrics['ast']['functions']} functions" if signals["complexity_available"] else "No functions parsed; no complexity evidence"
        if name == "modularity": return f"{signals['source_count']} source files across measured directories"
        if name in {"test_quality", "test_presence"}: return f"{signals['test_count']} test files; measured coverage={metrics['tests']['coverage_percent']}%" if metrics['tests']['coverage_percent'] is not None else f"{signals['test_count']} test files; no coverage report present"
        if name == "documentation": return f"README/documentation files and measured README length; has README={metrics['artifacts']['has_readme']}"
        if name == "dependency_health": return f"{signals['dependency_count']} declared dependencies across {len(metrics['dependencies']['manifests'])} manifests"
        if name == "lockfile": return f"{len(metrics['dependencies']['lockfiles'])} lockfiles found"
        if name == "layering": return "Count of recognized architectural layer directories"
        if name == "entrypoints": return "Repository entrypoint filenames detected"
        if name == "size_distribution": return "Share of source files at or below 500 lines"
        if name == "test_isolation": return "Tests are located in test/spec-named paths"
        if name == "async_evidence": return "Observed async/concurrency syntax per source file"
        if name == "ci": return f"CI configuration present={metrics['artifacts']['has_ci']}"
        if name == "docker": return f"Docker/container file present={metrics['artifacts']['has_docker']}"
        if name == "github_workflow": return f"GitHub Actions workflow present={metrics['artifacts'].get('has_github_workflow', False)}"
        if name == "dockerfile": return f"Root Dockerfile present={metrics['artifacts'].get('has_root_dockerfile', metrics['artifacts'].get('has_dockerfile', False))}"
        if name == "gitignore": return f"Root .gitignore present={metrics['artifacts'].get('has_root_gitignore', metrics['artifacts'].get('has_gitignore', False))}"
        if name == "readme_file": return f"Root README.md present={metrics['artifacts'].get('has_root_readme', metrics['artifacts']['has_readme'])}"
        if name == "license": return f"Root license file present={metrics['artifacts'].get('has_root_license', metrics['artifacts']['has_license'])}"
        if name == "env_example": return f"Environment template present={metrics['artifacts']['has_env_example']}"
        if name == "security_workflow": return f"Security automation present={metrics['artifacts']['has_security_workflow']}"
        if name == "coverage": return f"Measured coverage={metrics['tests']['coverage_percent']}%"
        return "Measured repository evidence"
