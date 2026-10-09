import json
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from services.file_scanner import FileScanner


class DependencyImportTests(unittest.TestCase):
    def test_matches_declared_python_and_javascript_packages_to_source_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "src").mkdir()
            (root / "requirements.txt").write_text("fastapi>=0.110\nPyYAML>=6\n", encoding="utf-8")
            (root / "package.json").write_text(json.dumps({"dependencies": {"react": "^19", "axios": "^1"}}), encoding="utf-8")
            (root / "src/api.py").write_text(
                "from fastapi import FastAPI\nimport yaml\nfrom .internal import helper\n", encoding="utf-8"
            )
            (root / "src/ui.tsx").write_text(
                "import React from 'react';\nconst client = require('axios');\nimport './local';\n", encoding="utf-8"
            )
            result = FileScanner(str(root)).scan()

        files = {item["path"]: item for item in result["files"]}
        self.assertEqual(files["src/api.py"]["dependency_imports"], ["fastapi", "pyyaml"])
        self.assertEqual(files["src/ui.tsx"]["dependency_imports"], ["axios", "react"])
        self.assertNotIn("_content", files["src/api.py"])
        self.assertNotIn("import yaml", json.dumps(result["files"]))

    def test_ignores_comments_and_string_mentions_for_python(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "requirements.txt").write_text("requests>=2\n", encoding="utf-8")
            (root / "app.py").write_text("# import requests\nmessage = 'requests is used here'\n", encoding="utf-8")
            result = FileScanner(str(root)).scan()
        app_file = next(item for item in result["files"] if item["path"] == "app.py")
        self.assertNotIn("dependency_imports", app_file)

    def test_maps_go_and_rust_manifest_dependencies_to_source_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "go.mod").write_text(
                "module example.com/repolens-fixture\n\nrequire github.com/gin-gonic/gin v1.10.0\n", encoding="utf-8"
            )
            (root / "Cargo.toml").write_text(
                '[package]\nname = "fixture"\nversion = "0.1.0"\n[dependencies]\nserde = "1.0"\n', encoding="utf-8"
            )
            (root / "main.go").write_text(
                'package main\n\nimport (\n\t"github.com/gin-gonic/gin"\n)\n', encoding="utf-8"
            )
            (root / "lib.rs").write_text("use serde::Serialize;\n", encoding="utf-8")
            result = FileScanner(str(root)).scan()

        files = {item["path"]: item for item in result["files"]}
        self.assertEqual(files["main.go"]["dependency_imports"], ["github.com/gin-gonic/gin"])
        self.assertEqual(files["lib.rs"]["dependency_imports"], ["serde"])
        self.assertNotIn("_content", files["main.go"])
        self.assertNotIn("use serde", json.dumps(result["files"]))


if __name__ == "__main__":
    unittest.main()
