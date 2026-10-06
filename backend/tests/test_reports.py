import asyncio
import sys
import tempfile
import unittest
from pathlib import Path

import httpx

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from main import app
from routes import reports as reports_route
from services.report_store import ReportStore


class SavedReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.original_store = reports_route.report_store
        reports_route.report_store = ReportStore(Path(self.temp.name) / "reports.sqlite3")
        self.result = {
            "success": True,
            "schema_version": "1.1",
            "repository": {"owner": "sample", "name": "project", "full_name": "sample/project", "url": "https://github.com/sample/project", "clone_depth": 1},
            "scores": {"quality": {"score": 83.5, "components": []}},
            "repository_overview": {"purpose": "An example repository for a report-store test."},
        }

    def tearDown(self):
        reports_route.report_store = self.original_store
        self.temp.cleanup()

    def request(self, method, path, **kwargs):
        async def run():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                return await client.request(method, path, **kwargs)
        return asyncio.run(run())

    def test_save_retrieve_and_badge(self):
        saved = self.request("POST", "/api/reports", json={"result": self.result})
        self.assertEqual(saved.status_code, 201, saved.text)
        meta = saved.json()
        self.assertEqual(meta["visibility"], "public_unlisted")
        self.assertEqual(meta["quality_score"], 83.5)

        loaded = self.request("GET", f"/api/reports/{meta['id']}")
        self.assertEqual(loaded.status_code, 200, loaded.text)
        self.assertEqual(loaded.json()["result"]["repository"]["full_name"], "sample/project")

        badge = self.request("GET", "/badge/sample/project.svg")
        self.assertEqual(badge.status_code, 200, badge.text)
        self.assertIn("image/svg+xml", badge.headers["content-type"])
        self.assertIn("83.5/100", badge.text)
        self.assertIn("sample/project", badge.text)

    def test_rejects_invalid_report_and_missing_badge(self):
        bad = self.request("POST", "/api/reports", json={"result": {"success": True}})
        self.assertEqual(bad.status_code, 422)
        missing = self.request("GET", "/api/reports/abcdefghijklmnop")
        self.assertEqual(missing.status_code, 404)
        badge = self.request("GET", "/badge/missing/repository.svg")
        self.assertEqual(badge.status_code, 404)


if __name__ == "__main__":
    unittest.main()
