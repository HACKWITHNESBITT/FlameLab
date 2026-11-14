"""Transparent weighted-sum scoring engine.

Evidence policy (strict): a factor with insufficient input is UNEVALUATED
(score None with a reason), never a number. Unevaluated factors are excluded
from the reported score, contribute 0 to the ordering rank_value, and are
listed explicitly. Completeness is reported separately and never multiplies
the score, so removing evidence can never improve a record's rank_value.
Formulas: docs/SCORING.md ("Factor formulas").
"""

from __future__ import annotations

from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).resolve().parent / "config" / "scoring_tables.yaml"

FACTOR_FIELDS = {
    "oxygen_overlap": ["test_conditions.oxygen_percent"],
    "pressure_overlap": ["test_conditions.pressure_psi"],
    "airflow_match": ["test_conditions.airflow_cm_s"],
    "fuel_relevance": ["fuels", "fuel_class"],
    "hardware_scale": ["hardware", "fuels.size"],
    "gravity_relevance": ["gravity_regime"],
    "pillar_fit": ["safety_pillars"],
}
FACTOR_NAMES = list(FACTOR_FIELDS)
COMPLETENESS_FIELDS = ["hardware", "gravity_regime", "fuel_class", "investigation_type",
                       "fuels", "test_conditions", "variables", "measurements",
                       "objectives", "summary"]


def load_tables(path: Path = CONFIG_PATH) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


TABLES = load_tables()


def _val(field, default=None):
    if isinstance(field, dict) and "value" in field:
        return field.get("value", default)
    return field if field is not None else default


def _status(field):
    return field.get("status") if isinstance(field, dict) else None


def _group_bounds(groups, key):
    """Collect (min, max) present ranges for a quantity across test groups."""
    out = []
    for g in groups or []:
        if not isinstance(g, dict):
            continue
        v = _val(g.get(key))
        if v is None:
            continue
        if isinstance(v, dict):
            out.append((v.get("min"), v.get("max")))
        elif isinstance(v, (int, float)):
            out.append((v, v))
    return [(lo, hi) for lo, hi in out if lo is not None or hi is not None]


def _cap(interval, floor, ceil):
    lo, hi = interval
    lo = floor if lo is None else max(floor, lo)
    hi = ceil if hi is None else min(ceil, hi)
    return (lo, hi)


def _intersection_measure(intervals, env):
    """Total measure of (union of intervals) intersected with env range."""
    el, eh = env
    if eh < el:
        return 0.0
    clipped = []
    for lo, hi in intervals:
        a = el if lo is None else max(el, lo)
        b = eh if hi is None else min(eh, hi)
        if b >= a:
            clipped.append((a, b))
    clipped.sort()
    total, cur_l, cur_h = 0.0, None, None
    for a, b in clipped:
        if cur_l is None:
            cur_l, cur_h = a, b
        elif a <= cur_h:
            cur_h = max(cur_h, b)
        else:
            total += cur_h - cur_l
            cur_l, cur_h = a, b
    if cur_l is not None:
        total += cur_h - cur_l
    return total


def _point_score(intervals, point, scale):
    for lo, hi in intervals:
        a = float("-inf") if lo is None else lo
        b = float("inf") if hi is None else hi
        if a <= point <= b:
            return 1.0
    dist = min(min(abs(point - (lo if lo is not None else point)),
                   abs(point - (hi if hi is not None else point)))
               for lo, hi in intervals)
    return max(0.0, 1.0 - dist / scale)


def _groups(record):
    return _val(record.get("test_conditions"), []) or []


def oxygen_overlap(record, env):
    ranges = _group_bounds(_groups(record), "oxygen_percent")
    if not ranges:
        return None, ["oxygen missing"]
    e = _cap((env["oxygen_percent"].get("min"), env["oxygen_percent"].get("max")), 0.0, 100.0)
    if e[1] <= e[0]:
        return _point_score(ranges, e[0], 100.0), []
    return round(_intersection_measure(ranges, e) / (e[1] - e[0]), 4), []


def pressure_overlap(record, env):
    ranges = _group_bounds(_groups(record), "pressure_psi")
    if not ranges:
        return None, ["pressure missing"]
    e = _cap((env["pressure_psi"].get("min"), env["pressure_psi"].get("max")), 0.0, 20.0)
    if e[1] <= e[0]:
        return _point_score(ranges, e[0], 20.0), []
    return round(_intersection_measure(ranges, e) / (e[1] - e[0]), 4), []


def airflow_match(record, env):
    eraw = (env["airflow_cm_s"].get("min"), env["airflow_cm_s"].get("max"))
    if eraw == (None, None):
        return None, ["no reference airflow for this environment"]
    ranges = _group_bounds(_groups(record), "airflow_cm_s")
    if not ranges:
        return None, ["airflow missing"]
    e = (eraw[0] if eraw[0] is not None else 0.0,
         eraw[1] if eraw[1] is not None else eraw[0])
    if _intersection_measure(ranges, e) > 0:
        return 1.0, []
    gap = min(min(abs(e[0] - (hi if hi is not None else e[0])),
                    abs(e[1] - (lo if lo is not None else e[1])))
                for lo, hi in ranges)
    width = max(e[1] - e[0], 1e-9)
    return round(1.0 / (1.0 + gap / width), 4), []


def fuel_relevance(record, env, lens):
    fc = _val(record.get("fuel_class"))
    table = TABLES["fuel_by_lens"].get(lens, TABLES["fuel_by_lens"]["all"])
    if fc not in table:
        return None, ["fuel class unconfirmed"]
    return table[fc], []


def hardware_scale(record, env):
    if record.get("project") == "Saffire":
        return TABLES["saffire_project_score"], []
    hw = _val(record.get("hardware"))
    if hw not in TABLES["hardware_scale"]:
        return None, ["hardware unconfirmed"]
    return TABLES["hardware_scale"][hw], []


def _gravity_class(env):
    g = str(env.get("gravity", ""))
    if g == "microgravity":
        return "microgravity"
    if g == "normal_gravity":
        return "normal_gravity"
    return "partial"


def gravity_relevance(record, env):
    gr = _val(record.get("gravity_regime"))
    cls = _gravity_class(env)
    table = TABLES["gravity_score"][cls]
    if gr not in table:
        if cls == "partial":
            return None, ["partial gravity: no Moon/Mars-g data, micro/normal records unevaluated"]
        return None, ["gravity regime unconfirmed"]
    flags = []
    if cls == "partial":
        flags.append("mimicked gravity is an analogue, not a Moon/Mars measurement")
    return table[gr], flags


def pillar_fit(record, env, lens):
    pillars = _val(record.get("safety_pillars"), []) or []
    if lens == "all":
        if pillars:
            return 1.0, []
        return None, ["pillars unassigned"]
    if not pillars:
        return None, ["pillars unassigned"]
    if lens in pillars:
        return 1.0, []
    return 0.2, []


def data_completeness(record):
    read = sum(1 for f in COMPLETENESS_FIELDS if _status(record.get(f)) == "read")
    return round(read / len(COMPLETENESS_FIELDS), 4)


def modeling_readiness(record):
    conds = _groups(record)
    parts = [
        any(_group_bounds([g], "oxygen_percent") or _group_bounds([g], "pressure_psi")
            or _group_bounds([g], "airflow_cm_s") for g in conds),
        any(isinstance(f, dict) and f.get("size")
            and "not specified" not in str(f.get("size"))
            for f in (_val(record.get("fuels"), []) or [])),
        bool(_val(record.get("measurements"), []) or []),
        bool((_val(record.get("variables"), {}) or {}).get("varied")),
    ]
    return round(sum(1 for p in parts if p) / 4, 4)


def score_record(record, env, weights, lens="all"):
    """Score one record.

    Returns score (mean over evaluated factors only), rank_value (weighted
    sum over ALL weights with unevaluated contributing 0 — this is what
    orders the ranking, so less evidence can never outrank more), and a
    separate evidence block. Records with no evaluated factors get
    insufficient_data and sort last.
    """
    w = {k: weights["default"][k] for k in FACTOR_NAMES}
    w.update({k: v for k, v in weights.get("lenses", {}).get(lens, {}).items()
              if k in FACTOR_NAMES})
    total = sum(w.values())
    fns = {
        "oxygen_overlap": lambda: oxygen_overlap(record, env),
        "pressure_overlap": lambda: pressure_overlap(record, env),
        "airflow_match": lambda: airflow_match(record, env),
        "fuel_relevance": lambda: fuel_relevance(record, env, lens),
        "hardware_scale": lambda: hardware_scale(record, env),
        "gravity_relevance": lambda: gravity_relevance(record, env),
        "pillar_fit": lambda: pillar_fit(record, env, lens),
    }
    factors, flags, reasons = [], [], {}
    for name in FACTOR_NAMES:
        s, fflags = fns[name]()
        entry = {"factor": name,
                 "score": (None if s is None else round(max(0.0, min(1.0, float(s))), 4)),
                 "weight": w[name],
                 "contribution": round(w[name] * (s or 0.0) / total, 4),
                 "fields": FACTOR_FIELDS[name],
                 "status": "evaluated" if s is not None else "insufficient_data"}
        factors.append(entry)
        flags.extend(fflags)
        reasons[name] = "; ".join(fflags) if fflags else "no reason recorded"
    evaluated = [f for f in factors if f["score"] is not None]
    if not evaluated:
        score, rank_value, insufficient = None, 0.0, True
    else:
        ew = sum(f["weight"] for f in evaluated)
        score = round(sum(f["weight"] * f["score"] for f in evaluated) / ew, 4)
        rank_value = round(sum(f["contribution"] for f in factors), 4)
        insufficient = False
    by_name = {f["factor"]: f["score"] for f in factors}
    pf, hs = by_name["pillar_fit"], by_name["hardware_scale"]
    equipment = None if pf is None or hs is None else round(pf * hs, 4)
    return {
        "id": record.get("id"),
        "score": score,
        "rank_value": rank_value,
        "insufficient_data": insufficient,
        "evidence": {
            "completeness": data_completeness(record),
            "coverage": round(sum(f["weight"] for f in evaluated) / total, 4),
            "evaluated": [f["factor"] for f in evaluated],
            "unevaluated": [{"factor": f["factor"], "reason": reasons[f["factor"]]}
                            for f in factors if f["score"] is None],
        },
        "modeling_readiness": modeling_readiness(record),
        "equipment_relevance": equipment,
        "factors": factors,
        "flags": sorted(set(flags)),
    }


def score_all(records, env, weights, lens="all"):
    return sorted((score_record(r, env, weights, lens) for r in records),
                  key=lambda r: (-r["rank_value"], r["id"]))
