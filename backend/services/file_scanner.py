"""Bounded, local-only repository inventory for RepoLens.

The scanner never executes repository code. File-count and byte budgets make
analysis predictable for large or hostile public repositories.
"""
from __future__ import annotations

import ast
import io
import json
import os
import re
import tomllib
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from services.project_guide import build_project_guide


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
        "package.json", "requirements.txt", "pyproject.toml", "pipfile",
        "cargo.toml", "go.mod", "pom.xml", "build.gradle", "gemfile",
        "composer.json", "dockerfile", "docker-compose.yml", "docker-compose.yaml",
        "tsconfig.json", "pytest.ini", "tox.ini", "makefile", "procfile",
        "requirements-dev.txt", ".python-version", "python-version", ".node-version", ".nvmrc",
        ".ruby-version", ".tool-versions", "build.gradle.kts",
        ".env.example", ".env.sample", "example.env", ".gitignore",
    }
    MAX_FILES = 12000
    MAX_FILE_BYTES = 512 * 1024
    MAX_TOTAL_READ_BYTES = 24 * 1024 * 1024
    MAX_SYMBOL_SAMPLES = 120
    JS_TS_SYMBOL_PATTERNS = (
        (re.compile(r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)"), "function"),
        (re.compile(r"^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)"), "class"),
        (re.compile(r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^;\n]*\)|[A-Za-z_$][\w$]*)\s*=>"), "function"),
    )
    GO_RUST_SYMBOL_PATTERNS = (
        (re.compile(r"^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\("), "function"),
        (re.compile(r"^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)\s*[<(]"), "function"),
        (re.compile(r"^\s*(?:pub\s+)?struct\s+([A-Za-z_]\w*)"), "class"),
        (re.compile(r"^\s*(?:pub\s+)?(?:trait|enum)\s+([A-Za-z_]\w*)"), "class"),
    )
    FRAMEWORK_MANIFESTS = {"package.json", "requirements.txt", "requirements-dev.txt", "pyproject.toml", "cargo.toml"}
    FRAMEWORK_PACKAGES = {
        "next": ("Next.js", "Web framework"), "react": ("React", "UI framework/library"),
        "vue": ("Vue", "UI framework"), "@angular/core": ("Angular", "UI framework"),
        "svelte": ("Svelte", "UI framework"), "astro": ("Astro", "Web framework"),
        "nuxt": ("Nuxt", "Web framework"), "gatsby": ("Gatsby", "Web framework"),
        "@remix-run/react": ("Remix", "Web framework"), "express": ("Express", "Backend framework"),
        "fastify": ("Fastify", "Backend framework"), "@nestjs/core": ("NestJS", "Backend framework"),
        "hono": ("Hono", "Backend framework"), "koa": ("Koa", "Backend framework"),
        "tailwindcss": ("Tailwind CSS", "Styling framework"), "fastapi": ("FastAPI", "Backend framework"),
        "django": ("Django", "Backend framework"), "flask": ("Flask", "Backend framework"),
        "starlette": ("Starlette", "ASGI framework"), "streamlit": ("Streamlit", "App framework"),
        "gradio": ("Gradio", "App framework"), "litestar": ("Litestar", "Backend framework"),
        "sanic": ("Sanic", "Backend framework"), "axum": ("Axum", "Backend framework"),
        "actix-web": ("Actix Web", "Backend framework"), "rocket": ("Rocket", "Backend framework"),
    }

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
                try:
                    data = tomllib.loads(content)
                    project = data.get("project", {})
                    if isinstance(project, dict):
                        declared = project.get("dependencies", [])
                        if isinstance(declared, list):
                            for requirement in declared:
                                if isinstance(requirement, str):
                                    match = re.match(r"^\s*([A-Za-z0-9][A-Za-z0-9_.-]*)", requirement)
                                    if match: dependencies.add(match.group(1).lower().replace("_", "-"))
                        optional = project.get("optional-dependencies", {})
                        if isinstance(optional, dict):
                            for group in optional.values():
                                if isinstance(group, list):
                                    for requirement in group:
                                        if isinstance(requirement, str):
                                            match = re.match(r"^\s*([A-Za-z0-9][A-Za-z0-9_.-]*)", requirement)
                                            if match: dependencies.add(match.group(1).lower().replace("_", "-"))
                    poetry = data.get("tool", {}).get("poetry", {})
                    if isinstance(poetry, dict):
                        groups = [poetry.get("dependencies", {}), poetry.get("dev-dependencies", {})]
                        groups.extend(entry.get("dependencies", {}) for entry in poetry.get("group", {}).values() if isinstance(entry, dict))
                        for packages in groups:
                            if isinstance(packages, dict):
                                dependencies.update(package.lower().replace("_", "-") for package in packages if package.lower() != "python")
                except (ValueError, TypeError, tomllib.TOMLDecodeError):
                    pass
            elif name == "go.mod":
                manifests.append(path)
                in_require_block = False
                for line in content.splitlines():
                    stripped = line.strip()
                    if stripped.startswith("require "):
                        requirement = stripped[len("require "):].strip()
                        if requirement == "(":
                            in_require_block = True
                            continue
                        parts = requirement.split()
                    elif in_require_block and stripped and not stripped.startswith(")"):
                        parts = stripped.split()
                    else:
                        if in_require_block and stripped.startswith(")"):
                            in_require_block = False
                        continue
                    if len(parts) >= 2 and re.match(r"^v[0-9]", parts[1]):
                        dependencies.add(parts[0])
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
    def _framework_signals(inventory: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """Find recognized framework/library declarations and retain manifest evidence."""
        signals: dict[str, dict[str, Any]] = {}
        checked: set[str] = set()
        parsed: set[str] = set()

        def add(package: str, manifest: str, section: str) -> None:
            key = package.strip().lower().replace("_", "-")
            descriptor = FileScanner.FRAMEWORK_PACKAGES.get(key)
            if descriptor is None:
                return
            name, role = descriptor
            item = signals.setdefault(name, {"name": name, "role": role, "packages": [], "evidence": []})
            if package not in item["packages"]:
                item["packages"].append(package)
            evidence = {"manifest": manifest, "section": section}
            if evidence not in item["evidence"]:
                item["evidence"].append(evidence)

        def add_requirement(raw: str, manifest: str, section: str) -> None:
            requirement = raw.split("#", 1)[0].strip()
            if not requirement or requirement.startswith(("-", "git+", "http://", "https://")):
                return
            match = re.match(r"([A-Za-z0-9][A-Za-z0-9_.-]*)", requirement)
            if match:
                add(match.group(1), manifest, section)

        for item in inventory:
            path = item["path"]
            filename = Path(item["name"]).name.lower()
            if filename not in FileScanner.FRAMEWORK_MANIFESTS:
                continue
            checked.add(path)
            content = item.get("_content")
            if content is None:
                continue
            try:
                if filename == "package.json":
                    manifest = json.loads(content)
                    if not isinstance(manifest, dict):
                        continue
                    parsed.add(path)
                    for section in ("dependencies", "optionalDependencies", "peerDependencies", "devDependencies"):
                        packages = manifest.get(section, {})
                        if isinstance(packages, dict):
                            for package in packages:
                                add(package, path, section)
                elif filename in {"requirements.txt", "requirements-dev.txt"}:
                    parsed.add(path)
                    for line in content.splitlines():
                        add_requirement(line, path, "requirements")
                elif filename == "pyproject.toml":
                    manifest = tomllib.loads(content)
                    parsed.add(path)
                    project = manifest.get("project", {})
                    if isinstance(project, dict):
                        for requirement in project.get("dependencies", []) if isinstance(project.get("dependencies", []), list) else []:
                            add_requirement(requirement, path, "project.dependencies")
                        optional = project.get("optional-dependencies", {})
                        if isinstance(optional, dict):
                            for group, values in optional.items():
                                if isinstance(values, list):
                                    for requirement in values:
                                        add_requirement(requirement, path, f"project.optional-dependencies.{group}")
                    poetry = manifest.get("tool", {}).get("poetry", {})
                    if isinstance(poetry, dict):
                        dependency_groups = [("tool.poetry.dependencies", poetry.get("dependencies", {}))]
                        groups = poetry.get("group", {})
                        if isinstance(groups, dict):
                            dependency_groups.extend((f"tool.poetry.group.{group}.dependencies", values.get("dependencies", {})) for group, values in groups.items() if isinstance(values, dict))
                        for section, packages in dependency_groups:
                            if isinstance(packages, dict):
                                for package in packages:
                                    add(package, path, section)
                elif filename == "cargo.toml":
                    manifest = tomllib.loads(content)
                    parsed.add(path)
                    for section in ("dependencies", "dev-dependencies", "build-dependencies"):
                        packages = manifest.get(section, {})
                        if isinstance(packages, dict):
                            for package in packages:
                                add(package, path, section)
            except (ValueError, TypeError, tomllib.TOMLDecodeError):
                continue

        frameworks = sorted(signals.values(), key=lambda entry: (entry["role"], entry["name"]))
        for entry in frameworks:
            entry["packages"].sort()
            entry["evidence"].sort(key=lambda evidence: (evidence["manifest"], evidence["section"]))
        if frameworks:
            status = "detected"
            note = "Recognized packages are declared in the listed manifests; this does not confirm they are imported or active at runtime."
        elif parsed:
            status = "not_detected"
            note = "No recognized framework package was found in readable supported manifests; custom or indirectly managed frameworks may be missed."
        else:
            status = "unavailable"
            note = "No supported readable dependency manifest was available, so framework detection could not be completed."
        detection = {"status": status, "manifests": sorted(checked), "parsed_manifests": sorted(parsed), "note": note}
        return frameworks, detection

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

    @classmethod
    def _source_symbols(cls, source_items: list[dict[str, str]]) -> dict[str, Any]:
        """Extract symbol names/locations only; never execute or return source text."""
        symbols: list[dict[str, Any]] = []
        total = 0
        parsed_files = 0
        languages_seen: set[str] = set()
        pattern_languages = {"JavaScript", "TypeScript", "Go", "Rust"}
        for item in source_items:
            path, content = item["path"], item["content"]
            language = item.get("language", "Other")
            found: list[tuple[int, str, str]] = []
            if language == "Python":
                try:
                    tree = ast.parse(content, filename=path)
                except (SyntaxError, ValueError):
                    continue
                parsed_files += 1
                languages_seen.add(language)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        found.append((node.lineno, "function", node.name))
                    elif isinstance(node, ast.ClassDef):
                        found.append((node.lineno, "class", node.name))
            elif language in pattern_languages:
                parsed_files += 1
                languages_seen.add(language)
                patterns = cls.JS_TS_SYMBOL_PATTERNS if language in {"JavaScript", "TypeScript"} else cls.GO_RUST_SYMBOL_PATTERNS
                for line_number, source_line in enumerate(io.StringIO(content), 1):
                    for pattern, kind in patterns:
                        match = pattern.search(source_line)
                        if match:
                            found.append((line_number, kind, match.group(1)))
            found.sort(key=lambda row: (row[0], row[1], row[2]))
            for line, kind, name in found:
                total += 1
                if len(symbols) < cls.MAX_SYMBOL_SAMPLES:
                    symbols.append({"path": path, "line": line, "kind": kind, "name": name})
        return {
            "status": "available" if parsed_files else "unavailable",
            "count": total,
            "parsed_files": parsed_files,
            "sample_limit": cls.MAX_SYMBOL_SAMPLES,
            "truncated": total > len(symbols),
            "items": symbols,
            "method": "Python AST; declaration-name patterns for JavaScript, TypeScript, Go, and Rust. Other languages may be omitted; names do not describe runtime behavior.",
        }

    @staticmethod
    def _dependency_imports(content: str, language: str, dependencies: list[str]) -> list[str]:
        """Match direct manifest packages to literal imports; retain names, never source text."""
        imported: set[str] = set()
        try:
            if language == "Python":
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        imported.update(alias.name.split(".", 1)[0].lower().replace("_", "-") for alias in node.names)
                    elif isinstance(node, ast.ImportFrom) and node.module:
                        imported.add(node.module.split(".", 1)[0].lower().replace("_", "-"))
            elif language in {"JavaScript", "TypeScript"}:
                patterns = (
                    r"\b(?:from|import)\s*['\"]([^'\"]+)['\"]",
                    r"\b(?:require|import)\s*\(\s*['\"]([^'\"]+)['\"]\s*\)",
                )
                for pattern in patterns:
                    for match in re.finditer(pattern, content):
                        imported.add(match.group(1).strip())
            elif language == "Go":
                pattern = r'(?m)^\s*(?:import\s+)?(?:(?:[A-Za-z_]\w*|_|\.)\s+)?["`]([^"`]+)["`]'
                imported.update(match.group(1) for match in re.finditer(pattern, content))
            elif language == "Rust":
                imported.update(match.group(1).lower().replace("_", "-") for match in re.finditer(r"(?m)^\s*(?:use\s+|extern\s+crate\s+)(?:::)?([A-Za-z_]\w*)", content))
        except (SyntaxError, ValueError):
            if language != "Python":
                raise

        python_aliases = {
            "beautifulsoup4": {"bs4"}, "opencv-python": {"cv2"}, "pillow": {"pil"},
            "pyyaml": {"yaml"}, "scikit-learn": {"sklearn"}, "python-dotenv": {"dotenv"},
        }
        matches: set[str] = set()
        for dependency in dependencies:
            normalized = dependency.strip().lower().replace("_", "-")
            if not normalized:
                continue
            if language in {"JavaScript", "TypeScript"}:
                if any(specifier == dependency or specifier.startswith(dependency.rstrip("/") + "/") for specifier in imported):
                    matches.add(dependency)
            elif language == "Go":
                if any(specifier == dependency or specifier.startswith(dependency.rstrip("/") + "/") for specifier in imported):
                    matches.add(dependency)
            else:
                aliases = {normalized.replace("-", "_").replace("_", "-")} | python_aliases.get(normalized, set())
                if normalized in imported or any(alias.lower().replace("_", "-") in imported for alias in aliases):
                    matches.add(dependency)
        return sorted(matches, key=str.casefold)

    def scan(self) -> dict[str, Any]:
        try:
            inventory, warnings = self._walk()
            dependencies = self._dependencies(inventory)
            for item in inventory:
                if item["category"] in {"source", "test"} and item.get("_content"):
                    imports = self._dependency_imports(item["_content"], item["language"], dependencies["names"])
                    if imports:
                        item["dependency_imports"] = imports
            frameworks, framework_detection = self._framework_signals(inventory)
            technologies = sorted(set(self._detect_technologies(inventory)) | {framework["name"] for framework in frameworks})
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
                "frameworks": frameworks, "framework_detection": framework_detection,
                "code_symbols": self._source_symbols(source_items),
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
                "project_guide": build_project_guide(inventory),
                "warnings": warnings,
            }
        except Exception as exc:
            return {"success": False, "error": f"Repository scan failed: {exc}"}
