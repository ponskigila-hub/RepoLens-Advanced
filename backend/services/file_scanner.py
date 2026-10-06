"""Bounded, local-only repository inventory for RepoLens.

The scanner never executes repository code. File-count and byte budgets make
analysis predictable for large or hostile public repositories.
"""
from __future__ import annotations

import json
import os
import re
import tomllib
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


class FileScanner:
    IGNORE_DIRS = {
        ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
        "dist", "build", ".next", ".nuxt", "target", "vendor", "bin",
        "obj", "out", ".idea", ".vscode", ".pytest_cache",
        ".mypy_cache", ".ruff_cache", "site-packages", "Pods",
    }
    SOURCE_EXTENSIONS = {
        ".py", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".java",
        ".cpp", ".cc", ".c", ".h", ".hpp", ".go", ".rs", ".rb", ".php",
        ".swift", ".kt", ".cs", ".scala", ".html", ".css", ".scss",
        ".vue", ".svelte", ".sh", ".sql",
    }
    CONFIG_NAMES = {
        "package.json", "requirements.txt", "pyproject.toml", "Pipfile",
        "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "Gemfile",
        "composer.json", "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
        "tsconfig.json", "pytest.ini", "tox.ini", "Makefile", "Procfile",
        ".env.example", ".env.sample", "example.env", ".gitignore",
    }
    MAX_FILES = 12000
    MAX_FILE_BYTES = 512 * 1024
    MAX_TOTAL_READ_BYTES = 24 * 1024 * 1024

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path).resolve()

    @staticmethod
    def _category(path: str, extension: str) -> str:
        parts = {part.lower() for part in Path(path).parts}
        name = Path(path).name.lower()
        if any("test" in part for part in parts) or name.startswith(("test_", "spec_")) or ".test." in name or ".spec." in name:
            return "test"
        if extension in FileScanner.SOURCE_EXTENSIONS:
            return "source"
        if name in FileScanner.CONFIG_NAMES:
            return "config"
        if name.startswith("readme") or name in {"contributing.md", "changelog.md", "license", "license.md"}:
            return "documentation"
        return "other"

    def _walk(self) -> tuple[list[dict[str, Any]], list[str]]:
        inventory: list[dict[str, Any]] = []
        warnings: list[str] = []
        read_budget = self.MAX_TOTAL_READ_BYTES
        for root, dirs, filenames in os.walk(self.repo_path, followlinks=False):
            dirs[:] = sorted(d for d in dirs if d not in self.IGNORE_DIRS and not (Path(root) / d).is_symlink())
            for filename in sorted(filenames):
                absolute = Path(root) / filename
                relative_candidate = absolute.relative_to(self.repo_path).as_posix()
                if "coverage" in Path(relative_candidate).parts and filename.lower() not in {"coverage.xml", "lcov.info", "coverage-final.json", "coverage.json"}:
                    continue
                try:
                    if absolute.is_symlink() or not absolute.is_file():
                        continue
                    stat = absolute.stat()
                except OSError:
                    continue
                relative = absolute.relative_to(self.repo_path).as_posix()
                ext = absolute.suffix.lower()
                category = self._category(relative, ext)
                entry: dict[str, Any] = {
                    "path": relative, "name": filename, "extension": ext,
                    "category": category, "size_bytes": stat.st_size,
                    "lines": None, "language": self._language(ext),
                }
                if stat.st_size <= self.MAX_FILE_BYTES and read_budget > 0 and category in {"source", "config", "documentation", "test"}:
                    try:
                        limit = min(stat.st_size, read_budget, self.MAX_FILE_BYTES)
                        with absolute.open("rb") as stream:
                            raw = stream.read(limit + 1)
                        if b"\x00" not in raw:
                            content = raw[:limit].decode("utf-8", errors="replace")
                            entry["lines"] = len(content.splitlines())
                            entry["_content"] = content
                            read_budget -= min(len(raw), limit)
                        else:
                            entry["category"] = "binary"
                    except OSError:
                        pass
                inventory.append(entry)
                if len(inventory) >= self.MAX_FILES:
                    warnings.append(f"File scan capped at {self.MAX_FILES} files.")
                    return inventory, warnings
        if read_budget <= 0:
            warnings.append("Text analysis byte budget reached; some files may be excluded from source metrics.")
        return inventory, warnings

    @staticmethod
    def _language(ext: str) -> str:
        mapping = {
            ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
            ".ts": "TypeScript", ".tsx": "TypeScript", ".java": "Java", ".go": "Go", ".rs": "Rust",
            ".rb": "Ruby", ".php": "PHP", ".swift": "Swift", ".kt": "Kotlin", ".cs": "C#",
            ".scala": "Scala", ".c": "C", ".h": "C/C++", ".cpp": "C++", ".cc": "C++", ".hpp": "C++",
            ".html": "HTML", ".css": "CSS", ".scss": "SCSS", ".vue": "Vue", ".svelte": "Svelte",
            ".sh": "Shell", ".sql": "SQL",
        }
        return mapping.get(ext, "Other")

    @staticmethod
    def _dependencies(inventory: list[dict[str, Any]]) -> dict[str, Any]:
        dependencies: set[str] = set()
        manifests: list[str] = []
        for item in inventory:
            name, content = item["name"].lower(), item.get("_content", "")
            path = item["path"]
            if name == "package.json":
                try:
                    data = json.loads(content)
                    deps = data.get("dependencies", {})
                    if isinstance(deps, dict): dependencies.update(deps)
                    dev = data.get("devDependencies", {})
                    if isinstance(dev, dict): dependencies.update(dev)
                    manifests.append(path)
                except (ValueError, TypeError):
                    pass
            elif name in {"requirements.txt", "requirements-dev.txt"}:
                manifests.append(path)
                for line in content.splitlines():
                    line = line.strip()
                    if line and not line.startswith(("#", "-")):
                        match = re.match(r"([A-Za-z0-9_.-]+)", line)
                        if match: dependencies.add(match.group(1).lower().replace("_", "-"))
            elif name == "pyproject.toml":
                manifests.append(path)
                for match in re.finditer(r"^\s*([A-Za-z0-9_.-]+)\s*(?:[<=>~!]|\s*=)", content, re.M):
                    dependencies.add(match.group(1).lower().replace("_", "-"))
            elif name == "go.mod":
                manifests.append(path)
                dependencies.update(re.findall(r"^\s*([^\s]+)\s+v[0-9]", content, re.M))
            elif name in {"cargo.toml", "gemfile", "composer.json", "pom.xml", "build.gradle"}:
                manifests.append(path)
                if name == "cargo.toml":
                    dependencies.update(re.findall(r"^\s*([A-Za-z0-9_-]+)\s*=\s*\"", content, re.M))
        lock_names = {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "pipfile.lock", "cargo.lock", "gemfile.lock", "composer.lock", "go.sum"}
        lockfiles = [i["path"] for i in inventory if i["name"].lower() in lock_names]
        return {"count": len(dependencies), "names": sorted(dependencies)[:100], "manifests": sorted(set(manifests)), "lockfiles": sorted(lockfiles)}

    @staticmethod
    def _detect_technologies(inventory: list[dict[str, Any]]) -> set[str]:
        technologies: set[str] = set()
        for item in inventory:
            ext, name = item["extension"], item["name"].lower()
            if name == "package.json":
                try:
                    data = json.loads(item.get("_content", "{}"))
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    for dep, tech in {"next": "Next.js", "react": "React", "vue": "Vue", "@angular/core": "Angular", "svelte": "Svelte", "tailwindcss": "Tailwind CSS", "express": "Express", "fastify": "Fastify", "jest": "Jest", "vitest": "Vitest", "playwright": "Playwright", "prisma": "Prisma"}.items():
                        if dep in deps: technologies.add(tech)
                except Exception:
                    pass
            if ext == ".py": technologies.add("Python")
            elif ext in {".js", ".jsx", ".mjs", ".cjs"}: technologies.add("JavaScript")
            elif ext in {".ts", ".tsx"}: technologies.add("TypeScript")
            elif ext == ".go": technologies.add("Go")
            elif ext == ".rs": technologies.add("Rust")
            elif ext == ".java": technologies.add("Java")
            if name == "requirements.txt":
                content = item.get("_content", "").lower()
                for package, label in (("fastapi", "FastAPI"), ("django", "Django"), ("flask", "Flask")):
                    if package in content: technologies.add(label)
            if "dockerfile" in name: technologies.add("Docker")
            if name in {"go.mod", "cargo.toml", "pom.xml", "build.gradle"}:
                technologies.add({"go.mod":"Go modules", "cargo.toml":"Cargo", "pom.xml":"Maven", "build.gradle":"Gradle"}[name])
        return technologies

    @staticmethod
    def _project_metadata(inventory: list[dict[str, Any]]) -> dict[str, Any]:
        """Read project identity from known manifests; never execute repository code."""
        candidates = sorted(
            (item for item in inventory if Path(item["name"]).name.lower() in {"package.json", "pyproject.toml", "cargo.toml"}),
            key=lambda item: ("/" in item["path"], item["path"]),
        )
        for item in candidates:
            try:
                if Path(item["name"]).name.lower() == "package.json":
                    data = json.loads(item.get("_content", "{}"))
                    section = data
                else:
                    data = tomllib.loads(item.get("_content", ""))
                    section = data.get("project", {}) if Path(item["name"]).name.lower() == "pyproject.toml" else data.get("package", {})
            except (ValueError, TypeError, tomllib.TOMLDecodeError):
                continue
            description = section.get("description") if isinstance(section, dict) else None
            project_name = section.get("name") if isinstance(section, dict) else None
            if isinstance(description, str) and description.strip():
                return {"name": project_name if isinstance(project_name, str) else None, "description": description.strip()[:1200], "manifest_path": item["path"]}
        return {"name": None, "description": None, "manifest_path": None}

    def scan(self) -> dict[str, Any]:
        try:
            inventory, warnings = self._walk()
            dependencies = self._dependencies(inventory)
            technologies = sorted(self._detect_technologies(inventory))
            files: list[dict[str, Any]] = []
            folders: dict[str, dict[str, int]] = defaultdict(lambda: {"file_count": 0, "source_files": 0, "lines": 0, "size_bytes": 0})
            languages: Counter[str] = Counter()
            extensions: Counter[str] = Counter()
            lines_by_category: Counter[str] = Counter()
            source_items: list[dict[str, str]] = []
            readme = ""
            readme_path = None
            for item in inventory:
                content = item.get("_content", "")
                public = {k: v for k, v in item.items() if not k.startswith("_")}
                files.append(public)
                if item["language"] != "Other" and item["category"] in {"source", "test"}:
                    languages[item["language"]] += 1
                extensions[item["extension"] or "[no extension]"] += 1
                if item["lines"] is not None: lines_by_category[item["category"]] += item["lines"]
                parts = Path(item["path"]).parts
                folder = "/".join(parts[:-1]) or "."
                aggregate = folders[folder]
                aggregate["file_count"] += 1
                aggregate["size_bytes"] += item["size_bytes"]
                aggregate["lines"] += item["lines"] or 0
                if item["category"] == "source": aggregate["source_files"] += 1
                if Path(item["name"]).name.lower().startswith("readme"):
                    if readme_path is None:
                        readme_path = item["path"]
                    if content and not readme:
                        readme = content[:5000]
                if item["category"] == "source" and content:
                    source_items.append({"path": item["path"], "language": item["language"], "content": content})
            source_files = [f for f in files if f["category"] == "source"]
            test_files = [f for f in files if f["category"] == "test"]
            important = sorted(files, key=lambda f: (f["category"] not in {"source", "config", "test"}, -f["size_bytes"], f["path"]))[:40]
            folder_list = [dict(path=path, **values) for path, values in sorted(folders.items(), key=lambda pair: (-pair[1]["file_count"], pair[0]))[:100]]
            structure = [f"{f['path']}/ ({f['file_count']} files)" for f in folder_list[:60]]
            paths = [f["path"] for f in files]
            names = {Path(path).name.lower() for path in paths}
            github_workflows = sorted(path for path in paths if path.startswith(".github/workflows/") and Path(path).suffix.lower() in {".yml", ".yaml"})
            readme_paths = sorted(path for path in paths if Path(path).name.lower().startswith("readme"))
            license_paths = sorted(path for path in paths if Path(path).name.lower().startswith("license") or Path(path).name.lower() == "copying")
            gitignore_paths = sorted(path for path in paths if Path(path).name.lower() == ".gitignore")
            dockerfile_paths = sorted(path for path in paths if Path(path).name.lower() == "dockerfile")
            root_readme_paths = sorted(path for path in paths if Path(path).parent == Path(".") and Path(path).name.lower() == "readme.md")
            root_license_paths = sorted(path for path in paths if Path(path).parent == Path(".") and (Path(path).name.lower().startswith("license") or Path(path).name.lower() == "copying"))
            root_gitignore_paths = sorted(path for path in paths if Path(path).parent == Path(".") and Path(path).name.lower() == ".gitignore")
            root_dockerfile_paths = sorted(path for path in paths if Path(path).parent == Path(".") and Path(path).name.lower() == "dockerfile")
            total_lines = sum((f["lines"] or 0) for f in files if f["category"] in {"source", "test"})
            return {
                "success": True, "root_path": str(self.repo_path), "files": files,
                "source_files": source_items, "folder_breakdown": folder_list,
                "folder_structure": structure, "important_files": important,
                "technologies": technologies, "readme_content": readme, "readme_path": readme_path,
                "project_metadata": self._project_metadata(inventory),
                "file_count": len(files), "source_file_count": len(source_files),
                "test_file_count": len(test_files), "total_lines": total_lines,
                "lines_by_category": dict(lines_by_category),
                "language_breakdown": dict(sorted(languages.items())),
                "extension_breakdown": dict(extensions), "dependencies": dependencies,
                "artifacts": {
                    "has_ci": bool(github_workflows) or any(p.startswith(".circleci/") or Path(p).name in {".gitlab-ci.yml", "Jenkinsfile", "azure-pipelines.yml", "bitbucket-pipelines.yml"} for p in paths),
                    "has_github_workflow": bool(github_workflows),
                    "github_workflows": github_workflows,
                    "has_docker": any("dockerfile" in n or n in {"docker-compose.yml", "docker-compose.yaml"} for n in names),
                    "has_dockerfile": bool(dockerfile_paths),
                    "has_root_dockerfile": bool(root_dockerfile_paths),
                    "has_tests": bool(test_files),
                    "has_license": bool(license_paths),
                    "has_root_license": bool(root_license_paths),
                    "has_readme": bool(readme_paths),
                    "has_root_readme": bool(root_readme_paths),
                    "has_gitignore": bool(gitignore_paths),
                    "has_root_gitignore": bool(root_gitignore_paths),
                    "checklist_paths": {"readme": root_readme_paths, "license": root_license_paths, "github_workflows": github_workflows[:20], "dockerfile": root_dockerfile_paths, "gitignore": root_gitignore_paths},
                    "has_env_example": bool(names & {".env.example", ".env.sample", "example.env"}),
                    "has_coverage_report": bool(names & {"coverage.xml", "lcov.info", "coverage-final.json", "coverage.json"}),
                    "has_security_workflow": any("codeql" in p.lower() or "dependabot" in p.lower() for p in paths),
                },
                "warnings": warnings,
            }
        except Exception as exc:
            return {"success": False, "error": f"Repository scan failed: {exc}"}
