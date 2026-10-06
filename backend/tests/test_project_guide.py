import json
import tempfile
import unittest
from pathlib import Path

from services.file_scanner import FileScanner


class ProjectGuideTests(unittest.TestCase):
    def test_guide_uses_documented_features_and_manifest_evidence_only(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "src").mkdir()
            (root / "src/main.ts").write_text("export function startApp() { return true; }\n", encoding="utf-8")
            (root / "README.md").write_text(
                "# Sample\n\n## Features\n- Processes uploaded records and reports validation errors.\n"
                "- Exposes a searchable dashboard for operators.\n",
                encoding="utf-8",
            )
            (root / "package.json").write_text(json.dumps({
                "name": "sample-app",
                "engines": {"node": ">=20"},
                "scripts": {"dev": "next dev", "test": "vitest run"},
                "dependencies": {"next": "15.5.0", "react": "^19.0.0"},
                "devDependencies": {"typescript": "~5.7.0"},
            }), encoding="utf-8")
            (root / "package-lock.json").write_text("{}", encoding="utf-8")
            (root / ".env.example").write_text("API_BASE_URL=https://example.invalid\nTOKEN=do-not-return-this\n", encoding="utf-8")

            scan = FileScanner(str(root)).scan()
            guide = scan["project_guide"]

            self.assertEqual(len(guide["features"]), 2)
            self.assertEqual(guide["features"][0]["source"], "README.md")
            self.assertTrue(any(item["name"] == "Node.js" and item["version"] == ">=20" for item in guide["language_versions"]))
            self.assertTrue(any(item["name"] == "TypeScript" and item["version"] == "~5.7.0" for item in guide["language_versions"]))
            self.assertTrue(any(item["name"] == "next" and item["version"] == "15.5.0" for item in guide["direct_dependencies"]))
            self.assertTrue(any(item["command"] == "npm run test" for item in guide["commands"]))
            variable_names = {item["name"] for item in guide["environment_variables"]}
            self.assertEqual(variable_names, {"API_BASE_URL", "TOKEN"})
            serialized_guide = json.dumps(guide)
            self.assertNotIn("do-not-return-this", serialized_guide)
            self.assertNotIn("https://example.invalid", serialized_guide)
            self.assertEqual(len(scan["files"]), scan["file_count"])


if __name__ == "__main__":
    unittest.main()
