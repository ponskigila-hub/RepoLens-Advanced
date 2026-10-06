"""Evidence-only project setup and capability hints extracted from repository files.

The output contains manifest declarations and documentation excerpts only. It never
executes project code and never returns values from environment templates.
"""
from __future__ import annotations

import json
import re
import tomllib
from pathlib import Path
from typing import Any


FEATURE_HEADING = re.compile(
    r"(?:features?|capabilities|what\s+(?:it|this project)\s+(?:does|can do)|key functionality|core functionality)",
    re.I,
)
COMMAND_START = re.compile(
    r"^(?:\$\s*)?(?:cd\s|npm\s|pnpm\s|yarn\s|bun\s|uv\s|pip(?:3)?\s|"
    r"python(?:3)?\s|pytest\b|uvicorn\s|poetry\s|docker(?:\s|$)|make\s|"
    r"go\s|cargo\s|bundle\s|composer\s)",
    re.I,
)
ENV_KEY = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=")


def _text(item: dict[str, Any]) -> str:
    value = item.get("_content")
    return value if isinstance(value, str) else ""


def _readme_features(inventory: list[dict[str, Any]]) -> list[dict[str, str]]:
    readme = next(
        (item for item in inventory if Path(item["name"]).name.lower().startswith("readme") and _text(item)),
        None,
    )
    if not readme:
        return []
    in_section = False
    features: list[dict[str, str]] = []
    in_code = False
    for raw in _text(readme).splitlines():
        line = raw.strip()
        if line.startswith(("```", "~~~")):
            in_code = not in_code
            continue
        if in_code:
            continue
        heading = re.match(r"^#{1,6}\s+(.+)$", line)
        if heading:
            title = re.sub(r"[`*_]", "", heading.group(1)).strip()
            if in_section:
                break
            in_section = bool(FEATURE_HEADING.search(title))
            continue
        if not in_section:
            continue
        bullet = re.match(r"^(?:[-*+] |\d+[.)] )(.+)$", line)
        if not bullet:
            continue
        description = bullet.group(1).strip()
        description = re.sub(r"!?(\[([^\]]*)\])\([^)]*\)", r"\2", description)
        description = re.sub(r"<[^>]+>", "", description)
        description = re.sub(r"[`*_~]", "", description)
        description = re.sub(r"\s+", " ", description).strip()
        if len(description) >= 18:
            features.append({"text": description[:240], "source": readme["path"]})
        if len(features) >= 5:
            break
    return features


def _readme_commands(inventory: list[dict[str, Any]]) -> list[dict[str, str]]:
    readme = next(
        (item for item in inventory if Path(item["name"]).name.lower().startswith("readme") and _text(item)),
        None,
    )
    if not readme:
        return []
    in_code = False
    commands: list[dict[str, str]] = []
    seen: set[str] = set()
    for raw in _text(readme).splitlines():
        line = raw.strip()
        if line.startswith(("```", "~~~")):
            in_code = not in_code
            continue
        if not in_code:
            continue
        command = re.sub(r"^(?:\$|>)\s*", "", line).strip()
        if not command or len(command) > 200 or not COMMAND_START.match(command):
            continue
        if command not in seen:
            commands.append({"title": "Documented command", "command": command, "source": readme["path"]})
            seen.add(command)
        if len(commands) >= 8:
            break
    return commands


def _manifest_data(item: dict[str, Any]) -> dict[str, Any] | None:
    name = Path(item["name"]).name.lower()
    content = _text(item)
    try:
        if name == "package.json":
            value = json.loads(content)
            return value if isinstance(value, dict) else None
        if name in {"pyproject.toml", "cargo.toml"}:
            return tomllib.loads(content)
        if name == "composer.json":
            value = json.loads(content)
            return value if isinstance(value, dict) else None
    except (ValueError, TypeError, tomllib.TOMLDecodeError):
        return None
    return None


def _language_versions(inventory: list[dict[str, Any]]) -> list[dict[str, str]]:
    found: dict[str, dict[str, str]] = {}

    def add(name: str, version: Any, source: str) -> None:
        if isinstance(version, str) and version.strip() and name not in found:
            found[name] = {"name": name, "version": version.strip()[:80], "source": source}

    for item in inventory:
        filename = Path(item["name"]).name.lower()
        content = _text(item).strip()
        data = _manifest_data(item)
        if filename in {".python-version", "python-version"}:
            add("Python", content.splitlines()[0] if content else None, item["path"])
        elif filename == ".node-version" or filename == ".nvmrc":
            add("Node.js", content.splitlines()[0] if content else None, item["path"])
        elif filename == ".ruby-version":
            add("Ruby", content.splitlines()[0] if content else None, item["path"])
        elif filename == ".tool-versions":
            for line in content.splitlines():
                parts = line.split()
                if len(parts) > 1 and parts[0] in {"python", "nodejs", "ruby", "golang"}:
                    name = {"python": "Python", "nodejs": "Node.js", "ruby": "Ruby", "golang": "Go"}[parts[0]]
                    add(name, parts[1], item["path"])
        elif filename == "go.mod":
            match = re.search(r"(?m)^\s*go\s+([0-9.]+)\s*$", content)
            add("Go", match.group(1) if match else None, item["path"])
        elif filename in {"pyproject.toml", "cargo.toml"} and data:
            project = data.get("project", {}) if filename == "pyproject.toml" else data.get("package", {})
            if isinstance(project, dict):
                add("Python", project.get("requires-python"), item["path"])
                if filename == "cargo.toml":
                    add("Rust edition", project.get("edition"), item["path"])
        elif filename == "package.json" and data:
            engines = data.get("engines", {})
            if isinstance(engines, dict):
                add("Node.js", engines.get("node"), item["path"])
            for group in ("dependencies", "devDependencies", "peerDependencies"):
                packages = data.get(group, {})
                if isinstance(packages, dict):
                    add("TypeScript", packages.get("typescript"), item["path"])
                    if "typescript" in packages:
                        break
        elif filename in {"pom.xml", "build.gradle", "build.gradle.kts"}:
            match = re.search(r"(?:<maven\.compiler\.(?:release|source)>|<java\.version>)([^<]+)", content)
            if not match:
                match = re.search(r"(?:sourceCompatibility\s*=\s*|JavaVersion\.VERSION_)([0-9.]+)", content)
            add("Java", match.group(1) if match else None, item["path"])
        elif filename == "composer.json" and data:
            requirements = data.get("require", {})
            if isinstance(requirements, dict):
                add("PHP", requirements.get("php"), item["path"])

    return sorted(found.values(), key=lambda item: item["name"])


def _direct_dependencies(inventory: list[dict[str, Any]]) -> list[dict[str, str]]:
    records: dict[tuple[str, str], dict[str, str]] = {}
    for item in inventory:
        name = Path(item["name"]).name.lower()
        content = _text(item)
        data = _manifest_data(item)
        if name == "package.json" and data:
            for section in ("dependencies", "devDependencies", "peerDependencies"):
                packages = data.get(section, {})
                if isinstance(packages, dict):
                    for package, version in packages.items():
                        if isinstance(version, str):
                            records.setdefault((package, item["path"]), {"name": package, "version": version, "manifest": item["path"], "section": section})
        elif name in {"requirements.txt", "requirements-dev.txt"}:
            for line in content.splitlines():
                value = line.split("#", 1)[0].strip()
                match = re.match(r"^([A-Za-z0-9_.-]+)(.*)$", value)
                if match and not value.startswith(("-", "http")):
                    package = match.group(1).replace("_", "-")
                    records.setdefault((package.lower(), item["path"]), {"name": package, "version": match.group(2).strip() or "unspecified", "manifest": item["path"], "section": "requirements"})
        elif name == "pyproject.toml" and data:
            project = data.get("project", {})
            dependencies = project.get("dependencies", []) if isinstance(project, dict) else []
            for requirement in dependencies if isinstance(dependencies, list) else []:
                if isinstance(requirement, str):
                    match = re.match(r"^\s*([A-Za-z0-9_.-]+)(.*)$", requirement)
                    if match:
                        package = match.group(1).replace("_", "-")
                        records.setdefault((package.lower(), item["path"]), {"name": package, "version": match.group(2).strip() or "unspecified", "manifest": item["path"], "section": "project.dependencies"})
    return sorted(records.values(), key=lambda item: (item["name"].lower(), item["manifest"]))[:30]


def build_project_guide(inventory: list[dict[str, Any]]) -> dict[str, Any]:
    features = _readme_features(inventory)
    commands = _readme_commands(inventory)
    scripts: list[dict[str, str]] = []
    package_files = [item for item in inventory if Path(item["name"]).name.lower() == "package.json"]
    for item in package_files:
        data = _manifest_data(item)
        package_scripts = data.get("scripts", {}) if isinstance(data, dict) else {}
        if not isinstance(package_scripts, dict):
            continue
        manager = data.get("packageManager", "")
        if isinstance(manager, str) and manager.startswith("pnpm"):
            runner = "pnpm"
        elif isinstance(manager, str) and manager.startswith("yarn"):
            runner = "yarn"
        elif any(Path(f["name"]).name.lower() == "pnpm-lock.yaml" for f in inventory):
            runner = "pnpm"
        elif any(Path(f["name"]).name.lower() == "yarn.lock" for f in inventory):
            runner = "yarn"
        else:
            runner = "npm"
        for script in ("dev", "start", "test", "build", "lint"):
            value = package_scripts.get(script)
            if isinstance(value, str):
                scripts.append({"name": script, "command": f"{runner} run {script}", "declared_command": value, "source": item["path"]})

    if not commands:
        commands.extend({"title": f"Package script · {item['name']}", "command": item["command"], "source": item["source"], "declared_command": item["declared_command"]} for item in scripts[:6])
        manifests = {Path(item["name"]).name.lower(): item["path"] for item in inventory}
        if "package.json" in manifests and not any(command.get("title") == "Install dependencies" for command in commands):
            lock_names = {Path(item["name"]).name.lower() for item in inventory}
            install = "pnpm install --frozen-lockfile" if "pnpm-lock.yaml" in lock_names else "yarn install --frozen-lockfile" if "yarn.lock" in lock_names else "npm ci" if "package-lock.json" in lock_names else "npm install"
            commands.insert(0, {"title": "Install dependencies", "command": install, "source": manifests["package.json"]})
        python_manifest = next((item["path"] for item in inventory if Path(item["name"]).name.lower() == "requirements.txt"), None)
        if python_manifest:
            commands.insert(0, {"title": "Install Python dependencies", "command": f"python -m pip install -r {python_manifest}", "source": python_manifest})
        if any(Path(item["name"]).name.lower() == "cargo.toml" for item in inventory):
            commands.append({"title": "Build Rust project", "command": "cargo build", "source": next(item["path"] for item in inventory if Path(item["name"]).name.lower() == "cargo.toml")})
        if any(Path(item["name"]).name.lower() == "go.mod" for item in inventory):
            commands.append({"title": "Run Go module", "command": "go run .", "source": next(item["path"] for item in inventory if Path(item["name"]).name.lower() == "go.mod")})
    commands = commands[:10]

    environment_variables: dict[tuple[str, str], dict[str, str]] = {}
    template_names = {".env.example", ".env.sample", "example.env"}
    for item in inventory:
        if Path(item["name"]).name.lower() not in template_names:
            continue
        for line in _text(item).splitlines():
            match = ENV_KEY.match(line)
            if match:
                key = (match.group(1), item["path"])
                environment_variables.setdefault(key, {"name": match.group(1), "source": item["path"]})

    return {
        "features": features,
        "feature_source": features[0]["source"] if features else None,
        "feature_note": "Feature bullets are quoted from README headings and are not independently verified." if features else "No feature list was found in a recognizable README section; RepoLens avoids inferring business capabilities from names alone.",
        "commands": commands,
        "scripts": scripts[:20],
        "environment_variables": sorted(environment_variables.values(), key=lambda item: (item["source"], item["name"])),
        "language_versions": _language_versions(inventory),
        "direct_dependencies": _direct_dependencies(inventory),
        "environment_note": "Only variable names from example templates are returned. Values are never included.",
    }
