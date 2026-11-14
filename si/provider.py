"""Meta Model API client (Muse family) over raw httpx.

The API is OpenAI-compatible: POST {base}/chat/completions with a Bearer key.
Prompts come from si/prompts/*.md under version control; records are passed
as structured JSON. Raises NoProviderError when MODEL_API_KEY is absent so
endpoints fail over to 503. Model override via FLAMELAB_SI_MODEL.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import httpx

PROMPTS = Path(__file__).resolve().parent / "prompts"
API_BASE = os.getenv("FLAMELAB_SI_API_BASE", "https://api.meta.ai/v1")
MODEL = os.getenv("FLAMELAB_SI_MODEL", "muse-spark-1.3")


class NoProviderError(RuntimeError):
    pass


def _prompt(name: str) -> str:
    return (PROMPTS / f"{name}.md").read_text()


def _strip_fences(text: str) -> str:
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip()


def generate(prompt_name: str, payload: dict, *,
             json_keys: tuple[str, ...], timeout_s: float = 90.0) -> dict:
    """Generate structured JSON. Returns the parsed object (keys not enforced)."""
    key = os.getenv("MODEL_API_KEY")
    if not key:
        raise NoProviderError("MODEL_API_KEY is not set")
    system = (_prompt(prompt_name)
              + "\n\nRespond with a single JSON object and nothing else. "
              + f"Top-level keys: {', '.join(json_keys)}.")
    resp = httpx.post(f"{API_BASE}/chat/completions", timeout=timeout_s, headers={
        "Authorization": f"Bearer {key}", "content-type": "application/json"},
        json={"model": MODEL, "temperature": 0, "response_format": {"type": "json_object"},
              "messages": [{"role": "system", "content": system},
                           {"role": "user", "content": json.dumps(payload)[:60000]}]})
    resp.raise_for_status()
    text = "".join(c.get("message", {}).get("content", "")
                   for c in resp.json().get("choices", []))
    return json.loads(_strip_fences(text))
