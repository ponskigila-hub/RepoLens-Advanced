# RepoLens roadmap

This file contains **future work only**. The earlier roadmap's Gemini/IBM Bob integration, trained-model scoring, shallow-clone optimization, and dashboard modernization no longer describe the active product and have been removed from this plan.

## Already implemented

- Bounded depth-1 public repository scan and dynamic `static-v2` scorecards.
- Python AST metrics plus sampled function/class names from Python, JavaScript, TypeScript, Go, and Rust source.
- File/folder tree, directory-role hints, entry-point candidates, manifest/framework evidence, and literal README/framework cross-check.
- Best-effort GitHub owner, creation date, and contributor metadata; unavailable/rate-limited metadata does not fail a code scan.
- Public-unlisted saved report snapshots, latest-score SVG badges, and browser-native PDF export.
- Readiness file checklist, explicit unknown states, and an in-report **How it works** tab.

## Remaining ideas

1. **More language-aware parsing.** Add maintained parsers for languages beyond the currently supported Python AST and JS/TS/Go/Rust symbol patterns. Keep unsupported-language status explicit and avoid presenting syntax guesses as complete AST analysis.
2. **Commit-aware scan cache.** Cache results by immutable commit SHA, with bounded storage, invalidation/retention policy, and a GitHub rate-limit-aware fallback. Do not cache mutable branch names without resolving their commit.
3. **Honest long-scan progress.** If real repositories exceed the synchronous request budget, introduce a background-job API and streamed progress based on actual completed stages. Do not simulate percentage completion.
4. **Deeper code relationships.** Add import/dependency graph and entry-point-to-module links from parsed source, clearly distinguish static references from runtime call flow, and cap graph output for large repositories.
5. **Optional semantic explanation.** If implemented, keep it opt-in, evidence-cited, bounded, and isolated from deterministic scores; document what repository content is sent to the configured provider.
6. **Dedicated security checks.** Add a separately labeled, ruleset-versioned static security feature with low false-positive goals and manual-review guidance. Do not market the current heuristic scan as a security audit.
7. **Private repositories and team access.** Only design this with explicit OAuth/token permissions, encrypted secret handling, access control for saved reports, and deletion/retention controls.

## Acceptance principles

- Missing evidence is `unavailable`/`not measured`, never a made-up default.
- Repository source is data, not instructions; never execute it during analysis.
- Keep API additions backward-compatible where practical and version breaking schema changes.
- Add tests for every new parser, score signal, metadata failure mode, and public-report permission boundary.
