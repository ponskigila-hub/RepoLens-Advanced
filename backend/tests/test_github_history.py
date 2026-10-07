import sys
import threading
import unittest
import asyncio
from pathlib import Path
from unittest.mock import patch

import httpx

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from services.github_history import GitHubHistoryService
from main import app
from routes import analyze as analyze_route


class GitHubHistoryTests(unittest.TestCase):
    def test_history_endpoint_validates_url_and_returns_on_demand_payload(self):
        original_fetch = analyze_route.github_history_service.fetch
        analyze_route.github_history_service.fetch = lambda owner, repository: {
            "status": "partial", "source": "GitHub REST API", "activity_status": "pending",
            "weekly_activity": [], "activity_note": "pending", "recent_commits": [],
            "complexity_trend": [], "complexity_note": "proxy", "commit_limit": 30,
            "complexity_sample_limit": 8, "note": "partial",
        }
        try:
            async def exercise():
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                    invalid = await client.post("/api/history", json={"github_url": "https://example.com/o/r"})
                    valid = await client.post("/api/history", json={"github_url": "https://github.com/sample/project"})
                    return invalid, valid
            invalid, valid = asyncio.run(exercise())
        finally:
            analyze_route.github_history_service.fetch = original_fetch
        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(valid.status_code, 200)
        self.assertEqual(valid.json()["activity_status"], "pending")

    def test_branch_point_patch_counts_only_supported_source_changes(self):
        change = GitHubHistoryService._complexity_change([
            {
                "filename": "src/worker.py",
                "patch": "@@ -1,3 +1,4 @@\n def work():\n-    while waiting:\n+    if ready and enabled:\n+# if this is only a comment\n+    print('if in a string is an acknowledged heuristic')\n",
            },
            {"filename": "README.md", "patch": "@@\n+if this is prose, ignore it\n"},
            {"filename": "src/image.png", "patch": None},
        ])
        self.assertEqual(change["source_files_changed"], 1)
        self.assertEqual(change["source_files_with_patch"], 1)
        self.assertEqual(change["added_decision_points"], 3)
        self.assertEqual(change["removed_decision_points"], 1)
        self.assertEqual(change["net_decision_points"], 2)
        self.assertEqual(change["patch_coverage_percent"], 100.0)

    def test_activity_is_sorted_and_limited_to_last_52_weeks(self):
        items = [{"week": 1_700_000_000 + index * 604_800, "total": index} for index in range(60)]
        activity = GitHubHistoryService._normalize_activity(items)
        self.assertEqual(len(activity), 52)
        self.assertEqual(activity[0]["commits"], 8)
        self.assertEqual(activity[-1]["commits"], 59)
        self.assertLessEqual(activity[0]["week_start"], activity[-1]["week_start"])

    def test_fetch_builds_recent_commit_trend_and_caches_result(self):
        service = GitHubHistoryService()
        latest_sha = "a" * 40
        older_sha = "b" * 40
        commit_list = [
            {"sha": latest_sha, "commit": {"author": {"date": "2026-10-07T10:00:00Z"}, "message": "Add a branch\nbody"}},
            {"sha": older_sha, "commit": {"author": {"date": "2026-10-06T10:00:00Z"}, "message": "Remove a loop"}},
        ]
        details = {
            latest_sha: {
                "stats": {"additions": 3, "deletions": 1, "total": 1},
                "files": [{"filename": "src/main.py", "patch": "@@\n+if enabled:\n-while waiting:\n"}],
            },
            older_sha: {
                "stats": {"additions": 1, "deletions": 2, "total": 1},
                "files": [{"filename": "src/main.py", "patch": "@@\n-    if enabled:\n+    return ready\n"}],
            },
        }
        activity = [{"week": 1_728_000_000, "total": 4}]
        calls = []
        call_lock = threading.Lock()

        def fake_get_json(url):
            with call_lock:
                calls.append(url)
            if url.endswith("/stats/commit_activity"):
                return activity, {}, 200
            if "/commits?per_page=" in url:
                return commit_list, {}, 200
            for sha, payload in details.items():
                if url.endswith(f"/commits/{sha}"):
                    return payload, {}, 200
            raise AssertionError(f"Unexpected GitHub URL: {url}")

        with patch.object(service, "_get_json", side_effect=fake_get_json):
            result = service.fetch("sample", "project")
            calls_after_fetch = len(calls)
            cached = service.fetch("SAMPLE", "PROJECT")

        self.assertEqual(result["status"], "available")
        self.assertEqual(result["activity_status"], "available")
        self.assertEqual(result["weekly_activity"][0]["commits"], 4)
        self.assertEqual(len(result["recent_commits"]), 2)
        self.assertEqual(result["recent_commits"][0]["additions"], 3)
        self.assertEqual([point["sha"] for point in result["complexity_trend"]], ["bbbbbbb", "aaaaaaa"])
        self.assertEqual([point["net_decision_points"] for point in result["complexity_trend"]], [-1, 0])
        self.assertEqual(cached, result)
        self.assertEqual(len(calls), calls_after_fetch)

    def test_patch_sample_spans_the_recent_commit_window(self):
        commits = [{"sha": f"{index:040x}"} for index in range(30)]
        sampled = GitHubHistoryService._sample_patch_commits(commits)
        self.assertEqual(len(sampled), 8)
        self.assertEqual(sampled[0], commits[0])
        self.assertEqual(sampled[-1], commits[-1])
        self.assertTrue(all(left["sha"] < right["sha"] for left, right in zip(sampled, sampled[1:])))

    def test_pending_activity_is_reported_as_partial_not_as_zero(self):
        service = GitHubHistoryService()
        commit_list = []

        def fake_get_json(url):
            if url.endswith("/stats/commit_activity"):
                return None, {}, 202
            if "/commits?per_page=" in url:
                return commit_list, {}, 200
            raise AssertionError(f"Unexpected GitHub URL: {url}")

        with patch.object(service, "_get_json", side_effect=fake_get_json):
            result = service.fetch("sample", "stats-pending")

        self.assertEqual(result["status"], "partial")
        self.assertEqual(result["activity_status"], "pending")
        self.assertEqual(result["weekly_activity"], [])
        self.assertIn("preparing", result["activity_note"])


if __name__ == "__main__":
    unittest.main()
