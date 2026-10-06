import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi import HTTPException

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from main import app
from routes import analyze as analyze_route
from services.file_preview import read_file_preview


class FilePreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_secret_shaped_assignments_are_redacted(self):
        (self.root / "settings.py").write_text('API_KEY = "sk-test-secret-value"\npassword: hunter2\n', encoding="utf-8")
        result = read_file_preview(str(self.root), "settings.py")
        self.assertEqual(result["redacted_values"], 2)
        self.assertNotIn("sk-test-secret-value", result["content"])
        self.assertNotIn("hunter2", result["content"])
        self.assertIn("[REDACTED]", result["content"])

    def test_sensitive_paths_and_traversal_are_blocked(self):
        (self.root / ".env").write_text("API_KEY=secret-value\n", encoding="utf-8")
        with self.assertRaises(HTTPException) as env_error:
            read_file_preview(str(self.root), ".env")
        self.assertEqual(env_error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as traversal_error:
            read_file_preview(str(self.root), "../outside.py")
        self.assertEqual(traversal_error.exception.status_code, 422)

    def test_symlinks_binary_and_oversized_files_are_blocked(self):
        outside = self.root.parent / f"{self.root.name}-outside.py"
        outside.write_text("print('outside')", encoding="utf-8")
        try:
            (self.root / "linked.py").symlink_to(outside)
            with self.assertRaises(HTTPException) as link_error:
                read_file_preview(str(self.root), "linked.py")
            self.assertEqual(link_error.exception.status_code, 403)
        finally:
            outside.unlink(missing_ok=True)
        (self.root / "image.png").write_bytes(b"\x89PNG\x00data")
        with self.assertRaises(HTTPException) as binary_error:
            read_file_preview(str(self.root), "image.png")
        self.assertEqual(binary_error.exception.status_code, 415)
        (self.root / "large.py").write_text("x" * (256 * 1024 + 1), encoding="utf-8")
        with self.assertRaises(HTTPException) as large_error:
            read_file_preview(str(self.root), "large.py")
        self.assertEqual(large_error.exception.status_code, 413)

    def test_preview_route_clones_reads_and_cleans_up(self):
        (self.root / "main.py").write_text("def main():\n    return 'ok'\n", encoding="utf-8")
        clone = {"success": True, "local_path": str(self.root)}
        with patch.object(analyze_route.repo_cloner, "validate_github_url", return_value=True), \
             patch.object(analyze_route.repo_cloner, "clone_repository", return_value=clone), \
             patch.object(analyze_route.repo_cloner, "cleanup_repo", return_value=True) as cleanup:
            async def post_preview():
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                    return await client.post("/api/file-preview", json={"github_url": "https://github.com/owner/repo", "path": "main.py"})
            response = asyncio.run(post_preview())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["path"], "main.py")
        self.assertIn("def main", response.json()["content"])
        cleanup.assert_called_once_with(str(self.root))


if __name__ == "__main__":
    unittest.main()
