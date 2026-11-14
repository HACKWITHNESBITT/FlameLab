"""Full SI eval: every case in questions.yaml through the live /api/ask pipeline.

Checks covered flags, must_mention/must_not text, must_cite tokens, and —
the release bar — verification.passed on every covered answer (zero
unsupported claims). Requires MODEL_API_KEY for answerable cases; gap,
scope, procedure, and insufficient cases run without one.
Exit 0 = all green, 1 = failures, 2 = key missing but needed.
"""
import json
import os
import re
import sys
from pathlib import Path

import yaml
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))
from backend.app import app  # noqa: E402

c = TestClient(app)


def check(case):
    q = case["question"]
    exp = case.get("expected", {})
    fails = []
    r = c.post("/api/ask", json={"question": q, "environment": case.get("environment")})
    if r.status_code == 503:
        return None  # provider needed but absent
    j = r.json()
    if "covered" in exp and j.get("covered") != exp.get("covered"):
        fails.append(f"covered={j.get('covered')} expected {exp.get('covered')}")
    text = (j.get("answer") or "").lower()
    for m in exp.get("must_mention", []) or []:
        alts = [a.strip().lower() for a in m.split("|")]
        hay = text + " " + " ".join(j.get("missing", [])).lower()
        if not any(a in hay for a in alts):
            fails.append(f"missing mention: {m!r}")
    if j.get("covered"):
        for m in exp.get("must_not", []) or []:
            if m.lower() in text:
                fails.append(f"forbidden text present: {m!r}")
        for t in exp.get("must_cite", []) or []:
            if not any(c == t or c.startswith(t + ".") for c in (j.get("citations") or [])):
                fails.append(f"missing citation: {t}")
        # Release bar: re-verify the SERVED text independently. Every served
        # sentence must pass; the pipeline note is stripped first.
        from si import verifier as _v
        from backend.app import _get_record as _gr
        served = re.sub(r"\s*\[System note:[^\]]*\]", "", j.get("answer") or "")
        rv = _v.verify_text(served, _gr)
        if not rv["passed"] or rv["text"] != served.strip():
            fails.append("served text contains unverified sentences")
    return fails


def main():
    cases = yaml.safe_load(open(ROOT / "si" / "eval" / "questions.yaml"))["cases"]
    need_key = need_run = False
    results = []
    for case in cases:
        try:
            fails = check(case)
        except Exception as e:  # noqa: BLE001 - one case must not kill the run
            fails = [f"exception: {type(e).__name__}: {str(e)[:200]}"]
        if fails is None:
            need_key = True
            print(f"SKIP {case['id']}: provider key needed")
            continue
        need_run = True
        results.append((case["id"], fails))
        print(("PASS " if not fails else "FAIL ") + case["id"]
              + ("" if not fails else " :: " + " | ".join(fails)))
    failed = [i for i, f in results if f]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed", end="")
    if need_key and not need_run:
        print("; provider key missing, nothing runnable")
        return 2
    if need_key:
        print("; note: some cases skipped (no provider key)")
    else:
        print()
    if need_key and failed:
        print("verdict: FAIL (with skips)")
        return 1
    print("verdict: " + ("FAIL" if failed else "PASS"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
