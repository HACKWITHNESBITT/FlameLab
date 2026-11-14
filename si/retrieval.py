"""Keyword + structured retrieval over curated records (no vector DB needed
at this scale). Also decides question coverage before any generation runs,
so gap/scope/procedure/not-covered answers never touch the provider.
"""

from __future__ import annotations

import re

STOPWORDS = frozenset("""what which who where when how many much does is are was were
  the a an of in on for to and or with from by about tell me give show list do
  does did it its this that these those as at there their then than so such
  into over after before between through during each other more most some any no
  doesnt dont isn t""".split())

FIELD_KEYWORDS = {
    "test_conditions.oxygen_percent": ("oxygen", "o2", "oxidizer", "loa", "loi"),
    "test_conditions.pressure_psi": ("pressure", "psi", "atm", "atmosphere"),
    "test_conditions.airflow_cm_s": ("airflow", "flow", "ventilation", "velocity"),
    "fuels": ("fuel", "material", "sample", "pmma", "acrylic", "sibal", "nomex",
              "methanol", "heptane", "droplet", "wick"),
    "hardware": ("hardware", "cir", "msg", "mdca", "spice", "duct", "glovebox", "rack"),
    "measurements": ("measure", "sensor", "data", "camera", "record"),
    "variables": ("varied", "variable", "change", "constant", "differ"),
}
PROCEDURE_WORDS = ("crew", "astronaut", "should", "alarm", "procedure", "respond",
                   "response", "grab", "extinguisher", "evacuate", "emergency")
SCOPE_WORDS = ("rocket", "propellant", "engine", "launch", "turbine")
CELESTIAL = ("moon", "lunar", "mars", "martian")
GRAVITY_BEHAVIOR = ("gravity", "gravities", "behave", "behavior", "behaviour",
                    "weight", "weightlessness")
PARTIAL_STANDALONE = ("partial", "1/6g", "3/8g")


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9/]+", (text or "").lower())
            if t not in STOPWORDS}


def _record_text(rec: dict) -> dict[str, str]:
    def val(f):
        v = f.get("value") if isinstance(f, dict) else f
        return " ".join(str(x) for x in (v if isinstance(v, list) else [v]) if v)

    fuels = rec.get("fuels", {})
    fuel_names = " ".join(f.get("name", "") for f in (val(fuels) or []) if isinstance(f, dict))
    return {
        "id": f"{rec.get('id', '')} {rec.get('name', '')} {rec.get('acronym_expansion', '')}",
        "objectives": val(rec.get("objectives")),
        "summary": val(rec.get("summary")),
        "fuels": fuel_names,
        "hardware": f"{rec.get('hardware', '')} {val(rec.get('hardware_detail'))}",
        "pillars": " ".join(val(rec.get("safety_pillars")) or []),
    }


def score_record(question: str, rec: dict) -> tuple[float, list[str]]:
    toks = _tokens(question)
    if not toks:
        return 0.0, []
    text = _record_text(rec)
    matched, score = [], 0.0
    idtoks = set(re.findall(r"[a-z0-9/-]+", text["id"].lower()))
    if toks & idtoks:
        score += 3.0
        matched.append("id")
    for field, blob in (("objectives", text["objectives"]), ("summary", text["summary"]),
                        ("fuels", text["fuels"]), ("hardware", text["hardware"])):
        if toks & _tokens(blob):
            score += 2.0 if field in ("fuels", "hardware") else 1.0
            matched.append(field)
    if toks & _tokens(text["pillars"]):
        score += 2.0
        matched.append("safety_pillars")
    return score, matched


def retrieve(question: str, records: list[dict], top_k: int = 3) -> list[dict]:
    ql = (question or "").lower()
    hits = sorted((r["id"] for r in records if r.get("id") and r["id"].lower() in ql),
                  key=len, reverse=True)
    best = hits[0] if hits else None  # longest exact id wins ("bass-ii" beats "bass")
    scored = []
    for r in records:
        s, m = score_record(question, r)
        if best is not None and r["id"] == best:
            s += 5.0
            m = ["id-exact"] + m
        scored.append(((s, m), r))
    ranked = sorted(scored, key=lambda sr: -sr[0][0])
    return [{"record": r, "score": s, "matched": m} for (s, m), r in ranked[:top_k]]


def needed_fields(question: str) -> list[str]:
    toks = _tokens(question)
    return [f for f, words in FIELD_KEYWORDS.items() if toks & set(words)]


def _field_present(rec: dict, path: str) -> bool:
    parts = path.split(".")
    if parts[0] == "test_conditions" and len(parts) == 2:
        tc = rec.get("test_conditions")
        groups = tc.get("value") if isinstance(tc, dict) else None
        for g in groups or []:
            q = g.get(parts[1]) if isinstance(g, dict) else None
            if (isinstance(q, dict) and q.get("status") != "missing"
                    and q.get("value") is not None):
                return True
        return False
    node = rec
    for p in parts:
        if not isinstance(node, dict) or p not in node:
            return False
        node = node[p]
    if isinstance(node, dict) and "value" in node:
        return node.get("status") != "missing" and node.get("value") is not None
    if isinstance(node, list):
        return len(node) > 0
    return node is not None


def coverage(question: str, retrieved: list[dict]) -> dict:
    """Decide whether the data covers the question (no generation needed).

    Returns {covered, kind, missing[]} with kind in answerable/gap/scope/
    procedure/insufficient.
    """
    toks = _tokens(question)
    if toks & set(PROCEDURE_WORDS):
        return {"covered": False, "kind": "procedure",
                "missing": ["crew procedures are out of scope; see mission safety authorities"]}
    if toks & set(SCOPE_WORDS):
        return {"covered": False, "kind": "scope",
                "missing": ["rocket/propellant fires are out of scope"]}
    celestial = toks & set(CELESTIAL)
    grav = toks & set(GRAVITY_BEHAVIOR)
    if toks & set(PARTIAL_STANDALONE) or (celestial and grav):
        return {"covered": False, "kind": "gap",
                "missing": ["partial-gravity data: PSI holds microgravity and normal-gravity results only"]}
    top = retrieved[0] if retrieved else None
    if top is None or top["score"] < 2.0:
        return {"covered": False, "kind": "insufficient",
                "missing": ["no record matches the question"]}
    needed = needed_fields(question)
    if needed:
        missing = [f for f in needed if not _field_present(top["record"], f)]
        if len(missing) == len(needed):
            return {"covered": False, "kind": "insufficient", "missing": missing}
        return {"covered": True, "kind": "answerable",
                "missing": [], "partial": missing}
    return {"covered": True, "kind": "answerable", "missing": []}
