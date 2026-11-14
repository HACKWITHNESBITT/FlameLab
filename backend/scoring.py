"""Transparent weighted-sum scoring engine.

Entry point: score_record(record, env, weights, lens). All factors return 0..1.
Missing inputs score 0 with a flag — never silently filled. Exact formulas are
documented in docs/SCORING.md ("Factor formulas (v1)"); this module implements
that section verbatim.
"""

from __future__ import annotations

FACTOR_FIELDS = {
    "oxygen_overlap": ["test_conditions.oxygen_percent"],
    "pressure_overlap": ["test_conditions.pressure_psi"],
    "airflow_match": ["test_conditions.airflow_cm_s"],
    "fuel_relevance": ["fuels", "fuel_class"],
    "hardware_scale": ["hardware", "fuels.size"],
    "gravity_relevance": ["gravity_regime"],
    "pillar_fit": ["safety_pillars"],
    "data_completeness": [],
}

# v1 heuristic tables (documented; pending domain-expert tuning).
FUEL_BY_LENS = {
    "all": {"solid": 0.8, "gas": 0.7, "liquid_droplet": 0.7, "aerosol_dust": 0.6, "other": 0.4},
    "prevention": {"solid": 1.0, "gas": 0.6, "liquid_droplet": 0.5, "aerosol_dust": 0.3, "other": 0.2},
    "detection": {"solid": 0.4, "gas": 0.5, "liquid_droplet": 0.4, "aerosol_dust": 1.0, "other": 0.3},
    "suppression": {"solid": 0.7, "gas": 0.6, "liquid_droplet": 1.0, "aerosol_dust": 0.3, "other": 0.2},
}
HARDWARE_SCALE = {"CIR": 0.6, "MSG": 0.5, "other": 0.4}
GRAVITY_SCORE = {
    "microgravity": {"microgravity": 1.0, "mimicked_partial": 0.8, "normal_gravity": 0.5},
    "normal_gravity": {"microgravity": 0.6, "mimicked_partial": 0.7, "normal_gravity": 1.0},
    "partial": {"microgravity": 0.6, "mimicked_partial": 0.7, "normal_gravity": 0.6},
}
COMPLETENESS_FIELDS = ["hardware", "gravity_regime", "fuel_class", "investigation_type",
                       "fuels", "test_conditions", "variables", "measurements",
                       "objectives", "summary"]


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
        return 0.0, ["oxygen missing"]
    e = _cap((env["oxygen_percent"].get("min"), env["oxygen_percent"].get("max")), 0.0, 100.0)
    if e[1] <= e[0]:
        return _point_score(ranges, e[0], 100.0), []
    return round(_intersection_measure(ranges, e) / (e[1] - e[0]), 4), []


def pressure_overlap(record, env):
    ranges = _group_bounds(_groups(record), "pressure_psi")
    if not ranges:
        return 0.0, ["pressure missing"]
    e = _cap((env["pressure_psi"].get("min"), env["pressure_psi"].get("max")), 0.0, 20.0)
    if e[1] <= e[0]:
        return _point_score(ranges, e[0], 20.0), []
    return round(_intersection_measure(ranges, e) / (e[1] - e[0]), 4), []


def airflow_match(record, env):
    eraw = (env["airflow_cm_s"].get("min"), env["airflow_cm_s"].get("max"))
    if eraw == (None, None):
        return 0.5, ["no reference airflow for this environment"]
    ranges = _group_bounds(_groups(record), "airflow_cm_s")
    if not ranges:
        return 0.0, ["airflow missing"]
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
    table = FUEL_BY_LENS.get(lens, FUEL_BY_LENS["all"])
    if fc not in table:
        return 0.0, ["fuel class unconfirmed"]
    return table[fc], []


def hardware_scale(record, env):
    if (record.get("project")) == "Saffire":
        return 1.0, []
    hw = _val(record.get("hardware"))
    if hw not in HARDWARE_SCALE:
        return 0.0, ["hardware unconfirmed"]
    return HARDWARE_SCALE[hw], []


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
    table = GRAVITY_SCORE[cls]
    if gr not in table:
        return 0.0, ["gravity regime unconfirmed"]
    flags = []
    if cls == "partial":
        flags.append("partial gravity: PSI has no Moon/Mars-g data; "
                     "microgravity and normal-gravity results bound it")
    return table[gr], flags


def pillar_fit(record, env, lens):
    pillars = _val(record.get("safety_pillars"), []) or []
    if lens == "all":
        if pillars:
            return 1.0, []
        return 0.3, ["pillars unassigned"]
    if lens in pillars:
        return 1.0, []
    return 0.2, []


def data_completeness(record, env):
    if not COMPLETENESS_FIELDS:
        return 0.0, []
    read = sum(1 for f in COMPLETENESS_FIELDS if _status(record.get(f)) == "read")
    return round(read / len(COMPLETENESS_FIELDS), 4), []


def modeling_readiness(record):
    parts = []
    conds = _groups(record)
    parts.append(any(_group_bounds([g], "oxygen_percent") or _group_bounds([g], "pressure_psi")
                     or _group_bounds([g], "airflow_cm_s") for g in conds))
    fuels = _val(record.get("fuels"), []) or []
    parts.append(any(isinstance(f, dict) and f.get("size")
                     and "not specified" not in str(f.get("size")) for f in fuels))
    parts.append(bool(_val(record.get("measurements"), []) or []))
    variables = _val(record.get("variables"), {}) or {}
    parts.append(bool(variables.get("varied")))
    return round(sum(1 for p in parts if p) / 4, 4)


def equipment_relevance(pillar_fit_score, hardware_scale_score, multiplier):
    return round(pillar_fit_score * hardware_scale_score * multiplier, 4)


def confidence_multiplier(completeness):
    return round(0.5 + 0.5 * completeness, 4)


def score_record(record, env, weights, lens="all"):
    """Score one record. Returns score, breakdown, flags, readiness scores."""
    w = dict(weights["default"])
    w.update(weights.get("lenses", {}).get(lens, {}))
    total = sum(w.values())
    fns = {
        "oxygen_overlap": lambda: oxygen_overlap(record, env),
        "pressure_overlap": lambda: pressure_overlap(record, env),
        "airflow_match": lambda: airflow_match(record, env),
        "fuel_relevance": lambda: fuel_relevance(record, env, lens),
        "hardware_scale": lambda: hardware_scale(record, env),
        "gravity_relevance": lambda: gravity_relevance(record, env),
        "pillar_fit": lambda: pillar_fit(record, env, lens),
        "data_completeness": lambda: data_completeness(record, env),
    }
    factors, flags = [], []
    for name in w:
        score, fflags = fns[name]()
        score = max(0.0, min(1.0, float(score)))
        factors.append({"factor": name, "score": round(score, 4), "weight": w[name],
                        "contribution": round(w[name] * score / total, 4),
                        "fields": FACTOR_FIELDS[name]})
        flags.extend(fflags)
    raw = round(sum(f["contribution"] for f in factors), 4)
    completeness = next(f["score"] for f in factors if f["factor"] == "data_completeness")
    mult = confidence_multiplier(completeness)
    pf = next(f["score"] for f in factors if f["factor"] == "pillar_fit")
    hs = next(f["score"] for f in factors if f["factor"] == "hardware_scale")
    return {"id": record.get("id"), "score": round(raw * mult, 4), "raw_score": raw,
            "confidence_multiplier": mult,
            "modeling_readiness": modeling_readiness(record),
            "equipment_relevance": equipment_relevance(pf, hs, mult),
            "factors": factors, "flags": sorted(set(flags))}


def score_all(records, env, weights, lens="all"):
    return sorted((score_record(r, env, weights, lens) for r in records),
                  key=lambda r: r["score"], reverse=True)
