import asyncio
import json
import sys
import tempfile
import unittest

import httpx
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from main import app
from routes import analyze as analyze_route
from services.file_scanner import FileScanner
from services.repo_cloner import RepoCloner
from services.static_analyzer import StaticAnalyzer
from ml.ml_service import MLService


class StaticAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.analyzer = StaticAnalyzer()

    def tearDown(self):
        self.temp.cleanup()

    def fixture(self):
        (self.root / "src").mkdir(exist_ok=True)
        (self.root / "tests").mkdir(exist_ok=True)
        (self.root / ".github/workflows").mkdir(parents=True, exist_ok=True)
        (self.root / "src/service.py").write_text(
            "def run(items):\n    for item in items:\n        if item:\n            print(item)\n", encoding="utf-8"
        )
        (self.root / "tests/test_service.py").write_text("def test_run():\n    assert True\n", encoding="utf-8")
        (self.root / "README.md").write_text("# Example\n\n" + "Documented project.\n" * 40, encoding="utf-8")
        (self.root / "requirements.txt").write_text("requests>=2\n", encoding="utf-8")
        (self.root / "poetry.lock").write_text("requests==2\n", encoding="utf-8")
        (self.root / "LICENSE").write_text("sample license\n", encoding="utf-8")
        (self.root / "Dockerfile").write_text("FROM python:3.12\n", encoding="utf-8")
        (self.root / ".github/workflows/ci.yml").write_text("name: ci\n", encoding="utf-8")
        (self.root / ".gitignore").write_text(".venv/\n", encoding="utf-8")

    def test_scanner_counts_real_files_and_detects_artifacts(self):
        self.fixture()
        scan = FileScanner(str(self.root)).scan()
        self.assertTrue(scan["success"])
        self.assertEqual(scan["file_count"], 9)
        self.assertEqual(scan["source_file_count"], 1)
        self.assertEqual(scan["test_file_count"], 1)
        self.assertEqual(scan["dependencies"]["count"], 1)
        self.assertTrue(scan["artifacts"]["has_ci"])
        self.assertTrue(scan["artifacts"]["has_github_workflow"])
        self.assertTrue(scan["artifacts"]["has_gitignore"])
        self.assertTrue(scan["artifacts"]["has_root_readme"])
        self.assertTrue(scan["artifacts"]["has_root_license"])
        self.assertTrue(scan["artifacts"]["has_root_dockerfile"])
        self.assertTrue(scan["artifacts"]["has_root_gitignore"])
        self.assertTrue(scan["artifacts"]["has_docker"])

    def test_dependency_inventory_uses_package_fields_not_manifest_metadata(self):
        self.fixture()
        (self.root / "package.json").write_text(json.dumps({
            "name": "sample-app", "version": "1.0.0", "dependencies": {"react": "^19"},
            "devDependencies": {"vitest": "^2"},
        }), encoding="utf-8")
        (self.root / "pyproject.toml").write_text(
            '[project]\nname = "sample-backend"\nversion = "1.0"\nrequires-python = ">=3.11"\n'
            'dependencies = ["fastapi>=0.110", "pydantic"]\n'
            '[project.optional-dependencies]\ntest = ["pytest>=8"]\n', encoding="utf-8"
        )
        dependencies = FileScanner(str(self.root)).scan()["dependencies"]
        self.assertEqual(set(dependencies["names"]), {"fastapi", "pydantic", "pytest", "react", "requests", "vitest"})
        self.assertNotIn("name", dependencies["names"])
        self.assertNotIn("version", dependencies["names"])
        self.assertNotIn("requires-python", dependencies["names"])

    def test_root_level_source_file_does_not_crash_architecture_scoring(self):
        self.fixture()
        (self.root / "app.py").write_text("def main():\n    return 'ok'\n", encoding="utf-8")
        scan = FileScanner(str(self.root)).scan()
        self.assertTrue(any(folder["path"] == "." and folder["source_files"] for folder in scan["folder_breakdown"]))
        result = self.analyzer.analyze(scan)
        self.assertIn("architecture", result["scores"])
        self.assertGreaterEqual(result["scores"]["architecture"]["score"], 0)

    def test_scores_change_when_repository_evidence_changes(self):
        self.fixture()
        full_scan = FileScanner(str(self.root)).scan()
        full = self.analyzer.analyze(full_scan)
        (self.root / ".github/workflows/ci.yml").unlink()
        (self.root / "Dockerfile").unlink()
        (self.root / "poetry.lock").unlink()
        (self.root / ".gitignore").unlink()
        reduced = self.analyzer.analyze(FileScanner(str(self.root)).scan())
        self.assertGreater(full["scores"]["production_readiness"]["score"], reduced["scores"]["production_readiness"]["score"])
        self.assertNotEqual(full["scores"]["quality"]["score"], 50.0)
        self.assertEqual(full["score_methodology"]["version"], "static-v2")

    def test_quick_fix_checklist_tracks_missing_files(self):
        self.fixture()
        for relative in ["README.md", "LICENSE", ".github/workflows/ci.yml", "Dockerfile", ".gitignore"]:
            (self.root / relative).unlink()
        scan = FileScanner(str(self.root)).scan()
        checklist = analyze_route._quick_fix_checklist(scan)
        self.assertEqual(checklist["completed"], 0)
        self.assertEqual(checklist["total"], 5)
        self.assertTrue(all(item["status"] == "missing" for item in checklist["items"]))

    def test_project_overview_uses_manifest_description_without_readme(self):
        self.fixture()
        (self.root / "README.md").unlink()
        (self.root / "package.json").write_text(json.dumps({"name": "sample-app", "description": "A focused manifest project description."}), encoding="utf-8")
        scan = FileScanner(str(self.root)).scan()
        overview = analyze_route._project_overview(scan, "sample/project", scan["technologies"])
        self.assertEqual(overview["description"], "A focused manifest project description.")
        self.assertEqual(overview["source"], "package.json")
        self.assertEqual(overview["title"], "sample-app")
        self.assertEqual(overview["status"], "documented")

    def test_project_overview_does_not_treat_install_commands_as_purpose(self):
        self.fixture()
        (self.root / "README.md").write_text("# Sample\n\n## Installation\n\nRun `pip install sample-app` to begin.\n", encoding="utf-8")
        overview = analyze_route._project_overview(FileScanner(str(self.root)).scan(), "sample/project")
        self.assertIsNone(overview["description"])
        self.assertEqual(overview["status"], "unavailable")
        self.assertIsNone(overview["source"])

    def test_framework_signals_require_exact_declared_packages_and_keep_evidence(self):
        self.fixture()
        (self.root / "requirements.txt").write_text("requests>=2\nfastapi-utils>=0.2\nfastapi>=0.110\n# django is only a comment\n", encoding="utf-8")
        (self.root / "package.json").write_text(json.dumps({"dependencies": {"next": "^15", "react": "^19", "react-icons": "^5"}}), encoding="utf-8")
        scan = FileScanner(str(self.root)).scan()
        frameworks = {item["name"]: item for item in scan["frameworks"]}
        self.assertEqual(set(frameworks), {"FastAPI", "Next.js", "React"})
        self.assertEqual(scan["framework_detection"]["status"], "detected")
        self.assertEqual(frameworks["FastAPI"]["evidence"][0]["manifest"], "requirements.txt")
        self.assertEqual(frameworks["Next.js"]["evidence"][0]["section"], "dependencies")

    def test_framework_detection_distinguishes_not_detected_from_unavailable(self):
        self.fixture()
        scan = FileScanner(str(self.root)).scan()
        self.assertEqual(scan["framework_detection"]["status"], "not_detected")
        (self.root / "requirements.txt").unlink()
        scan_without_manifest = FileScanner(str(self.root)).scan()
        self.assertEqual(scan_without_manifest["framework_detection"]["status"], "unavailable")

    def test_scanner_extracts_supported_python_and_typescript_symbol_names(self):
        self.fixture()
        (self.root / "src/service.py").write_text(
            "class BillingService:\n    def create_invoice(self, customer):\n        return customer\n",
            encoding="utf-8",
        )
        (self.root / "src/ui.tsx").write_text(
            "export function InvoicePanel() { return null; }\nexport const useInvoices = () => [];\n",
            encoding="utf-8",
        )
        symbols = FileScanner(str(self.root)).scan()["code_symbols"]
        found = {(item["path"], item["kind"], item["name"]) for item in symbols["items"]}
        self.assertIn(("src/service.py", "class", "BillingService"), found)
        self.assertIn(("src/service.py", "function", "create_invoice"), found)
        self.assertIn(("src/ui.tsx", "function", "InvoicePanel"), found)
        self.assertIn(("src/ui.tsx", "function", "useInvoices"), found)
        self.assertEqual(symbols["status"], "available")

    def test_code_overview_summarizes_paths_symbols_and_readme_framework_crosscheck(self):
        self.fixture()
        (self.root / "README.md").write_text("# Example\n\nA React interface. Django is also mentioned here.\n", encoding="utf-8")
        (self.root / "package.json").write_text(json.dumps({"dependencies": {"react": "^19"}}), encoding="utf-8")
        scan = FileScanner(str(self.root)).scan()
        overview = analyze_route._code_overview(scan)
        self.assertEqual(overview["status"], "available")
        self.assertIn("React", overview["frameworks"])
        checks = {item["name"]: item["status"] for item in overview["readme_framework_crosscheck"]["items"]}
        self.assertEqual(checks["React"], "mentioned_and_declared")
        self.assertEqual(checks["Django"], "readme_only")
        self.assertIn("src", [item["path"] for item in overview["directory_roles"]])

    def test_coverage_is_unknown_without_report_and_measured_with_lcov(self):
        self.fixture()
        scan = FileScanner(str(self.root)).scan()
        self.assertIsNone(self.analyzer.analyze(scan)["metrics"]["tests"]["coverage_percent"])
        (self.root / "lcov.info").write_text("TN:\nSF:src/service.py\nLF:10\nLH:7\nend_of_record\n", encoding="utf-8")
        measured = self.analyzer.analyze(FileScanner(str(self.root)).scan())
        self.assertEqual(measured["metrics"]["tests"]["coverage_percent"], 70.0)
        (self.root / "lcov.info").unlink()
        coverage_dir = self.root / "coverage"
        coverage_dir.mkdir(exist_ok=True)
        (coverage_dir / "lcov.info").write_text("TN:\nSF:src/service.py\nLF:4\nLH:3\nend_of_record\n", encoding="utf-8")
        nested = FileScanner(str(self.root)).scan()
        self.assertTrue(nested["artifacts"]["has_coverage_report"])
        self.assertEqual(self.analyzer.analyze(nested)["metrics"]["tests"]["coverage_percent"], 75.0)
        (coverage_dir / "lcov.info").unlink()
        (self.root / "coverage-final.json").write_text(json.dumps({"src/service.py": {"s": {"1": 1, "2": 0, "3": 1}}}), encoding="utf-8")
        json_report = FileScanner(str(self.root)).scan()
        self.assertEqual(self.analyzer.analyze(json_report)["metrics"]["tests"]["coverage_percent"], 66.67)

    def test_legacy_ml_facade_uses_measured_scan_and_rejects_synthetic_rows(self):
        self.fixture()
        scan = FileScanner(str(self.root)).scan()
        legacy = MLService().analyze_repository(scan)
        expected = self.analyzer.analyze(scan)["scores"]["quality"]["score"]
        self.assertEqual(legacy["ml_scores"]["overall_quality"], expected)
        with self.assertRaises(ValueError):
            MLService().predict_scores({"Stars": 100, "Size": 50})

    def test_github_url_validation_rejects_non_github_and_extra_path(self):
        self.assertTrue(RepoCloner.parse_github_url("https://github.com/owner/repo"))
        self.assertIsNone(RepoCloner.parse_github_url("http://github.com/owner/repo"))
        self.assertIsNone(RepoCloner.parse_github_url("https://github.com.evil.test/owner/repo"))
        self.assertIsNone(RepoCloner.parse_github_url("https://github.com/owner/repo/tree/main"))

    def test_analyze_endpoint_returns_dynamic_contract_without_llm(self):
        self.fixture()
        original_clone = analyze_route.repo_cloner.clone_repository
        original_cleanup = analyze_route.repo_cloner.cleanup_repo
        original_metadata = analyze_route.github_metadata_service.fetch
        analyze_route.repo_cloner.clone_repository = lambda url: {"success": True, "local_path": str(self.root), "repo_name": "sample/project", "owner": "sample", "repository": "project", "clone_depth": 1}
        analyze_route.repo_cloner.cleanup_repo = lambda path: True
        analyze_route.github_metadata_service.fetch = lambda owner, repository: {"status": "available", "created_at": "2020-01-02T03:04:05Z", "owner": {"login": owner, "type": "User", "html_url": "https://github.com/sample", "avatar_url": None}, "contributors": [], "contributors_status": "none_reported", "contributors_truncated": False, "contributors_limit": 10, "source": "GitHub REST API", "note": "test fixture"}
        try:
            async def post_analysis():
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                    return await client.post("/api/analyze", json={"github_url": "https://github.com/sample/project", "include_llm": False})
            response = asyncio.run(post_analysis())
        finally:
            analyze_route.repo_cloner.clone_repository = original_clone
            analyze_route.repo_cloner.cleanup_repo = original_cleanup
            analyze_route.github_metadata_service.fetch = original_metadata
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["schema_version"], "1.3")
        self.assertIn("metrics", data)
        self.assertIn("folder_breakdown", data)
        self.assertIn("maintainability", data["scores"])
        self.assertEqual(data["insights"]["llm"]["status"], "not_requested")
        self.assertEqual(data["repository_overview"]["purpose"], "Documented project.")
        self.assertEqual(data["repository_overview"]["purpose_status"], "documented")
        self.assertEqual(data["repository_overview"]["summary_source"], "README.md")
        self.assertIn("framework_detection", data["technology_stack"])
        self.assertEqual(data["quick_fix_checklist"]["completed"], 5)
        self.assertEqual(data["quick_fix_checklist"]["total"], 5)
        self.assertEqual(data["github_metadata"]["created_at"], "2020-01-02T03:04:05Z")
        self.assertEqual(data["code_overview"]["status"], "available")
        self.assertGreaterEqual(data["code_overview"]["symbols"]["count"], 1)
        self.assertEqual(len(data["files"]), data["file_breakdown"]["total"])
        self.assertEqual(data["file_breakdown"]["sample_limit"], FileScanner.MAX_FILES)
        self.assertIn("project_guide", data)
        self.assertIn("language_versions", data["project_guide"])


if __name__ == "__main__":
    unittest.main()
