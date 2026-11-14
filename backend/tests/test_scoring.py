"""Scoring engine tests: hand-checked factors, properties, golden rankings."""
import copy
import json
from pathlib import Path

import yaml

from backend import scoring, store

ROOT = Path(__file__).resolve().parent.parent.parent
W = yaml.safe_load(open(ROOT / "backend" / "config" / "weights.yaml"))
ENVS = {e["id"]: e for e in yaml.safe_load(open(ROOT / "backend" / "config" / "environments.yaml"))["environments"]}


def _w(value, status="read"):
    return {"value": value, "status": status, "source": {"doc": "t"}}


def _rec(**kw):
    base = {"id": "t", "project": None,
            "fuel_class": _w("solid"), "hardware": _w("MSG"),
            "gravity_regime": _w("microgravity"), "safety_pillars": _w(["prevention"]),
            "investigation_type": _w("microgravity"), "fuels": _w([]),
            "test_conditions": _w([]), "variables": _w({"varied": [], "held_constant": []}),
            "measurements": _w([]), "objectives": _w([]), "summary": _w("s")}
    base.update(kw)
    return base


def _tc(o2=None, p=None, af=None):
    def rng(v):
        return {"value": v, "status": "read" if v else "missing"}
    return {"label": "g", "oxygen_percent": rng(o2), "pressure_psi": rng(p), "airflow_cm_s": rng(af)}


def test_oxygen_overlap_hand_checked():
    r = _rec(test_conditions=_w([_tc(o2={"min": 10, "max": 50})]))
    s, _ = scoring.oxygen_overlap(r, ENVS["spacecraft"])  # env 19-23 fully covered
    assert s == 1.0
    s, _ = scoring.oxygen_overlap(r, ENVS["moon_base"])  # 30-50 of 30-100
    assert abs(s - 20 / 70) < 1e-4


def test_oxygen_missing_scores_zero_with_flag():
    s, flags = scoring.oxygen_overlap(_rec(), ENVS["moon_base"])
    assert s == 0.0 and flags == ["oxygen missing"]


def test_pressure_overlap_hand_checked():
    r = _rec(test_conditions=_w([_tc(p={"min": 7.35, "max": 14.7})]))
    s, _ = scoring.pressure_overlap(r, ENVS["moon_base"])  # 7.35-10.2 of 0-10.2
    assert abs(s - 2.85 / 10.2) < 1e-4


def test_airflow_overlap_is_full_match():
    r = _rec(test_conditions=_w([_tc(af={"min": 5, "max": 50})]))
    s, _ = scoring.airflow_match(r, ENVS["moon_base"])
    assert s == 1.0


def test_lookup_factors():
    assert scoring.fuel_relevance(_rec(), None, "prevention")[0] == 1.0
    assert scoring.fuel_relevance(_rec(fuel_class=_w("aerosol_dust")), None, "detection")[0] == 1.0
    assert scoring.hardware_scale(_rec(project="Saffire"), None)[0] == 1.0
    assert scoring.hardware_scale(_rec(), None)[0] == 0.5
    s, flags = scoring.gravity_relevance(_rec(), ENVS["moon_base"])
    assert s == 0.6 and any("partial gravity" in f for f in flags)
    assert scoring.pillar_fit(_rec(), None, "prevention")[0] == 1.0
    assert scoring.pillar_fit(_rec(), None, "detection")[0] == 0.2


def test_completeness_counts_read_only():
    assert scoring.data_completeness(_rec(), None)[0] == 1.0
    sparse = _rec(hardware={"value": None, "status": "missing"})
    assert scoring.data_completeness(sparse, None)[0] == 0.9


def test_modeling_readiness_quarters():
    assert scoring.modeling_readiness(_rec()) == 0.0
    full = _rec(test_conditions=_w([_tc(o2=17)]),
                fuels=_w([{"name": "x", "size": "2 mm"}]),
                measurements=_w([{"sensor": "s"}]),
                variables=_w({"varied": ["flow"], "held_constant": []}))
    assert scoring.modeling_readiness(full) == 1.0


def test_scores_bounded_and_missing_never_raises():
    recs = [json.loads(p.read_text()) for p in sorted((ROOT / "data" / "records").glob("*.json"))]
    for env in ENVS.values():
        for r in scoring.score_all(recs, env, W, "all"):
            assert 0.0 <= r["score"] <= 1.0
            assert all(0.0 <= f["score"] <= 1.0 for f in r["factors"])
    victim = next(r for r in recs if r["id"] == "flex")
    stripped = copy.deepcopy(victim)
    stripped["test_conditions"] = {"value": [], "status": "missing"}
    full = scoring.score_record(victim, ENVS["moon_base"], W)["score"]
    assert scoring.score_record(stripped, ENVS["moon_base"], W)["score"] <= full


def test_golden_top_five_per_environment(tmp_path):
    db = tmp_path / "g.db"
    store.build_db(ROOT / "data" / "records", db)
    recs = store.all_records(db)
    golden = json.loads(open(Path(__file__).parent / "golden.json").read())["rankings"]
    for env_id, expected in golden.items():
        got = [r["id"] for r in scoring.score_all(recs, ENVS[env_id], W, "all")[:5]]
        assert got == expected, f"{env_id}: {got} != {expected}"
