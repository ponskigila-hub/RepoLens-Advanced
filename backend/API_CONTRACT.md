# RepoLens Analyze API — contract v1.0

## Request

`POST /api/analyze` (`Content-Type: application/json`)

```json
{
  "github_url": "https://github.com/owner/repository",
  "include_llm": true,
  "use_mock": false
}
```

- Only public GitHub HTTPS URLs in the form `github.com/{owner}/{repository}` are accepted.
- `include_llm` enables an optional OpenAI-compatible text insight call. Scores are always computed locally.
- `use_mock` is retained for backwards compatibility; `true` skips the optional LLM request. It never substitutes or changes scores.

## Response

See the [complete validated JSON fixture](examples/analyze-response.example.json). The following top-level groups are stable; additive fields may appear in later minor schema versions.

| Field | Shape and purpose |
|---|---|
| `success`, `schema_version` | Status and payload version (`1.0`). |
| `repository`, `repo_info` | Canonical owner/name/URL, depth-1 fetch info, technologies, file and line totals; `repo_info` preserves the prior client contract. |
| `metrics` | Actual file/line/language/dependency/artifact measures; Python AST counts and complexity; observed test/coverage values; maintenance/security-pattern candidates. |
| `scores` | `quality`, `overall_quality`, `maintainability`, `scalability`, `architecture`, `production_readiness`. Each is `{score: number, components: [{name, score, weight, evidence}]}` on a 0–100 scale. |
| `score_methodology` | Version, calculation scope, excluded inputs, and coverage semantics. Current version: `static-v1`. |
| `file_breakdown`, `files`, `folder_breakdown` | Counts by category/language/extension, a bounded (up to 1,000 entries) file list, and up to 100 folder aggregates. |
| `insights` | Evidence-based summary, strengths, risks, prioritized recommendations, scan warnings, score snapshot, and `llm` request status/text. |
| `ml_scores` | Compatibility alias for the former UI. Despite the legacy field name, `model_used` is `static-v1`; this is not an ML-model prediction. |
| `repository_overview`, `creator_information`, `technology_stack`, `architecture_overview`, `architecture_analysis` | UI-ready interpretation fields. Unknown facts are explicitly labeled rather than guessed. |
| `important_files`, `onboarding_guide`, `code_quality_analysis`, `security_analysis`, `performance_analysis`, `improvement_suggestions`, `final_summary` | Backwards-compatible dashboard data populated from scanned evidence. |

## Score interpretation and caveats

Scores are deterministic weighted sums of observed signals. Every component includes its normalized score, weight, and evidence string. Missing evidence is not replaced by a constant default. `coverage_percent` is `null` unless an actual supported `coverage.xml`, `lcov.info`, or supported coverage JSON report is measured. `scanned_source` and `insights.scan_warnings` expose bounded/incomplete reads. Python complexity uses AST traversal; other language complexity/function counts are syntax-pattern estimates. This is not runtime profiling, execution of repository code, or a full security audit.

The API clones with depth 1 and caps the walk at 12,000 files and text reads at 24 MiB. Optional LLM errors are reported at `insights.llm` and do not turn a successful static scan into an error.

## Errors

- `422`: unsupported/invalid URL or request validation.
- `400`: clone failure, inaccessible repository, or clone timeout.
- `500`: scan or server-side processing failure.

FastAPI validation errors use its standard `detail` format. The browser app uses `NEXT_PUBLIC_API_URL` and calls `/api/analyze`.
