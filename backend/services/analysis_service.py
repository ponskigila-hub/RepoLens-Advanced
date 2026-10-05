"""Optional LLM insight generation; score calculation stays local and deterministic."""
from __future__ import annotations

import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()


class AnalysisService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.timeout_seconds = min(max(int(os.getenv("LLM_TIMEOUT_SECONDS", "20")), 3), 45)

    def generate_insights(self, prompt: str) -> dict[str, Any]:
        if not self.api_key:
            return {"status": "not_configured", "provider": None, "model": None, "text": None, "error": None}
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={"model": self.model, "temperature": 0.2, "messages": [{"role": "system", "content": "You are a senior software engineer. Use only the supplied repository evidence. Do not invent scores, test coverage, files, vulnerabilities, or deployed systems. Return concise, specific engineering insights and distinguish facts from inferences."}, {"role": "user", "content": prompt}]},
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            data = response.json()
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return {"status": "generated" if text else "empty_response", "provider": "openai-compatible", "model": self.model, "text": text or None, "error": None}
        except requests.Timeout:
            return {"status": "timeout", "provider": "openai-compatible", "model": self.model, "text": None, "error": "LLM request exceeded its configured timeout."}
        except requests.RequestException as exc:
            return {"status": "error", "provider": "openai-compatible", "model": self.model, "text": None, "error": f"LLM request failed: {exc}"}
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            return {"status": "error", "provider": "openai-compatible", "model": self.model, "text": None, "error": f"Unexpected LLM response: {exc}"}
