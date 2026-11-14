"""Claude API client over raw httpx (no extra dependency).

Prompts come from si/prompts/*.md under version control; records are passed
as structured JSON. Raises NoProviderError when ANTHROPIC_API_KEY is absent
so endpoints fail over to 503. Model override via FLAMELAB_SI_MODEL.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import httpx

PROMPTS = Path(__file__).resolve().parent / "prompts"
API_URL = "https://api.anthropic.com/v1/messages"
MODEL = os.getenv("FLAMELAB_SI_MODEL", "claude-sonnet-4-5")


class NoProviderError(RuntimeError):
    pass


def _prompt(name: str) -> str:
    return (PROMPTS / f"{name}.md").read_text()


def _strip_fences(text: str) -> str:
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip()


def generate(prompt_name: str, payload: dict, *,
             json_keys: tuple[str, ...], timeout_s: float = 60.0) -> dict:
    """Generate structured JSON. Returns the parsed object (keys not enforced)."""
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise NoProviderError("ANTHROPIC_API_KEY is not set")
    system = (_prompt(prompt_name)
              + "\n\nRespond with a single JSON object and nothing else. "
              + f"Top-level keys: {', '.join(json_keys)}.")
    resp = httpx.post(API_URL, timeout=timeout_s, headers={
        "x-api-key": key, "anthropic-version": "2023-06-01",
        "content-type": "application/json"},
        json={"model": MODEL, "max_tokens": 2000, "system": system,
              "messages": [{"role": "user",
                            "content": json.dumps(payload)[:12000]}]})
    resp.raise_for_status()
    text = "".join(b.get("text", "") for b in resp.json().get("content", [])
                   if b.get("type") == "text")
    return json.loads(_strip_fences(text))
