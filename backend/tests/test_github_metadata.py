import json
import sys
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from services.github_metadata import GitHubMetadataService


class FakeResponse:
    def __init__(self, payload, headers=None):
        self._body = json.dumps(payload).encode("utf-8")
        self.headers = Message()
        for key, value in (headers or {}).items():
            self.headers[key] = value

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, limit):
        return self._body[:limit]


class GitHubMetadataTests(unittest.TestCase):
    def test_fetch_returns_repository_owner_date_and_bounded_contributors(self):
        repo = {
            "created_at": "2020-01-02T03:04:05Z",
            "owner": {"login": "octocat", "type": "User", "avatar_url": "https://avatars.githubusercontent.com/u/1"},
        }
        contributors = [
            {"login": f"dev{i}", "contributions": 100 - i, "avatar_url": None}
            for i in range(15)
        ]
        headers = {"Link": '<https://api.github.com/repos/o/r/contributors?page=2>; rel="next"'}
        service = GitHubMetadataService()
        with patch("services.github_metadata.urlopen", side_effect=[FakeResponse(repo), FakeResponse(contributors, headers)]) as mocked:
            result = service.fetch("octocat", "hello-world")
        self.assertEqual(result["status"], "available")
        self.assertEqual(result["created_at"], "2020-01-02T03:04:05Z")
        self.assertEqual(result["owner"]["login"], "octocat")
        self.assertEqual(len(result["contributors"]), 10)
        self.assertTrue(result["contributors_truncated"])
        self.assertEqual(result["contributors"][0]["login"], "dev0")
        self.assertEqual(mocked.call_count, 2)
        self.assertEqual(service.fetch("OCTOCAT", "HELLO-WORLD"), result)

    def test_rate_limit_or_network_failure_returns_unavailable_without_raising(self):
        service = GitHubMetadataService()
        error = HTTPError("https://api.github.com", 403, "rate limited", {}, None)
        with patch("services.github_metadata.urlopen", side_effect=[error, error]):
            result = service.fetch("octocat", "private-or-limited")
        self.assertEqual(result["status"], "unavailable")
        self.assertIsNone(result["created_at"])
        self.assertEqual(result["contributors"], [])
        self.assertIn("completed independently", result["note"])


if __name__ == "__main__":
    unittest.main()
