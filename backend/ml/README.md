# Historical ML utilities

The modules in this directory are retained as historical/reference code only. They are **not** loaded by the current `/api/analyze` request path, and model artifacts do not determine scores.

Active scores come from `backend/services/static_analyzer.py` (`static-v2`). They are deterministic weighted transformations of observed repository evidence. The runtime requirements intentionally do not include the old training stack.

For the current API and workflow, see [`../API_CONTRACT.md`](../API_CONTRACT.md), [`../README.md`](../README.md), and the repository-root [`REFACTORING.md`](../../REFACTORING.md).
