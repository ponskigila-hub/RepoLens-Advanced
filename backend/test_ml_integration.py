"""Backward-compatible runner for the evidence-based analysis tests."""
from pathlib import Path
import unittest

if __name__ == "__main__":
    suite = unittest.defaultTestLoader.discover(str(Path(__file__).parent / "tests"), pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
