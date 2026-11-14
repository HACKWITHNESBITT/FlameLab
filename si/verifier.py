"""Citation verifier: the `citation-check` skill as code.

Every SI sentence must carry at least one [rec:<id>#<field.path>] token.
Verification confirms the record exists, the field path resolves, and any
number in the sentence appears in the cited field value (normalized). Any
failure drops the sentence. Fail closed: unverified text never survives.
"""

from __future__ import annotations

import re

TOKEN = re.compile(r"\[rec:([A-Za-z0-9_.-]+)#([A-Za-z0-9_.]+)\]")
SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
NUMBER = re.compile(r"-?\d+(?:\.\d+)?")


def parse_citations(text: str) -> list[tuple[str, str]]:
    return TOKEN.findall(text or "")


def split_sentences(text: str) -> list[str]:
    return [s for s in SENTENCE_SPLIT.split((text or "").strip()) if s]


def _walk(node, parts: list[str]):
    """Resolve dotted field path through a record. Returns (found, value)."""
    cur = node
    for p in parts:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        elif isinstance(cur, list) and p.isdigit() and int(p) < len(cur):
            cur = cur[int(p)]
        else:
            return False, None
    return True, cur


def _unwrap(field):
    if isinstance(field, dict) and "value" in field:
        return field["value"]
    return field


def _numbers_in(value) -> set[str]:
    found: set[str] = set()

    def visit(v):
        if isinstance(v, bool):
            return
        if isinstance(v, (int, float)):
            found.add(_norm(v))
        elif isinstance(v, str):
            for m in NUMBER.findall(v):
                found.add(_norm(m))
        elif isinstance(v, dict):
            for x in v.values():
                visit(x)
        elif isinstance(v, (list, tuple)):
            for x in v:
                visit(x)

    visit(value)
    return found


def _norm(v) -> str:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return str(v)
    return ("%g" % f).rstrip("0").rstrip(".") if "." in "%g" % f else "%g" % f


def verify_sentence(sentence: str, get_record) -> tuple[bool, list[str]]:
    """Returns (ok, failure reasons). get_record(id) -> record dict or None."""
    cites = parse_citations(sentence)
    if not cites:
        return False, ["no citation token"]
    failures = []
    for rid, path in cites:
        rec = get_record(rid)
        if rec is None:
            failures.append(f"unknown record: {rid}")
            continue
        found, field = _walk(rec, path.split("."))
        if not found:
            failures.append(f"unknown field: {rid}#{path}")
            continue
        allowed = _numbers_in(_unwrap(field))
        for n in NUMBER.findall(TOKEN.sub("", sentence)):
            if _norm(n) not in allowed:
                failures.append(f"number {n} not in {rid}#{path}")
    return (not failures), failures


def verify_text(text: str, get_record) -> dict:
    """Verify each sentence; drop failures. Returns cleaned text + report."""
    kept, dropped = [], []
    for s in split_sentences(text):
        ok, reasons = verify_sentence(s, get_record)
        (kept if ok else dropped).append({"sentence": s, "reasons": [] if ok else reasons})
    passed = bool(kept) and not dropped
    return {"text": " ".join(k["sentence"] for k in kept),
            "kept": len(kept), "dropped": len(dropped),
            "failures": dropped, "passed": passed}
