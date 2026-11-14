"""Scoring engine tests: hand-checked factors, strict evidence properties, golden."""
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


def test_condition_factors_unevaluated_when_missing():
    assert scoring.oxygen_overlap(_rec(), ENVS["moon_base"])[0] is None
    assert scoring.pressure_overlap(_rec(), ENVS["moon_base"])[0] is None
    assert scoring.airflow_match(_rec(), ENVS["moon_base"])[0] is None
    # No environment reference range is also insufficient data, never neutral.
    assert scoring.airflow_match(_rec(test_conditions=_w([_tc(af=5)])),
                                 ENVS["earth_air"])[0] is None


def test_lookup_factors_unevaluated_when_unconfirmed():
    assert scoring.fuel_relevance(_rec(), None, "prevention")[0] == 1.0
    assert scoring.fuel_relevance(_rec(fuel_class={"value": None, "status": "missing"}),
                                  None, "prevention")[0] is None
    assert scoring.hardware_scale(_rec(project="Saffire"), None)[0] == 1.0
    assert scoring.hardware_scale(_rec(hardware={"value": None, "status": "missing"}),
                                  None)[0] is None
    # Genuine mismatch is evaluated evidence; unknown pillars are not.
    assert scoring.pillar_fit(_rec(), None, "prevention")[0] == 1.0
    assert scoring.pillar_fit(_rec(), None, "detection")[0] == 0.2
    assert scoring.pillar_fit(_rec(safety_pillars=_w([])), None, "all")[0] is None


def test_gravity_partial_envs_score_nothing_but_analogues():
    s, _ = scoring.gravity_relevance(_rec(), ENVS["spacecraft"])
    assert s == 1.0
    s, flags = scoring.gravity_relevance(_rec(), ENVS["moon_base"])
    assert s is None and any("partial gravity" in f for f in flags)
    s, flags = scoring.gravity_relevance(_rec(gravity_regime=_w("mimicked_partial")),
                                         ENVS["moon_base"])
    assert s == 0.7 and any("analogue" in f for f in flags)


def test_config_tables_cover_all_enums():
    t = scoring.TABLES
    assert t["provenance"]["status"] == "unreviewed"
    fuels = {"solid", "gas", "liquid_droplet", "aerosol_dust", "other"}
    for lens in ("all", "prevention", "detection", "suppression"):
        assert set(t["fuel_by_lens"][lens]) == fuels
    assert set(t["hardware_scale"]) == {"CIR", "MSG", "other"}
    assert set(t["gravity_score"]) == {"microgravity", "normal_gravity", "partial"}


def test_completeness_is_reported_not_weighted():
    assert scoring.data_completeness(_rec()) == 1.0
    out = scoring.score_record(_rec(), ENVS["moon_base"], W)
    assert "data_completeness" not in [f["factor"] for f in out["factors"]]
    assert out["evidence"]["completeness"] == 1.0


def test_scores_bounded_and_rank_value_monotone_in_evidence():
    recs = [json.loads(p.read_text()) for p in sorted((ROOT / "data" / "records").glob("*.json"))]
    for env in ENVS.values():
        ranked = scoring.score_all(recs, env, W, "all")
        vals = [r["rank_value"] for r in ranked]
        assert vals == sorted(vals, reverse=True)
        for r in ranked:
            assert 0.0 <= r["rank_value"] <= 1.0
            assert all(f["score"] is None or 0.0 <= f["score"] <= 1.0 for f in r["factors"])
    flex = next(r for r in recs if r["id"] == "flex")
    env = ENVS["moon_base"]
    full = scoring.score_record(flex, env, W)
    stripped = copy.deepcopy(flex)
    stripped["test_conditions"] = {"value": [], "status": "missing"}
    bare = scoring.score_record(stripped, env, W)
    assert bare["rank_value"] <= full["rank_value"]
    assert bare["evidence"]["coverage"] < full["evidence"]["coverage"]
    empty = scoring.score_record({"id": "void"}, env, W)
    assert empty["insufficient_data"] and empty["score"] is None


def test_equipment_null_propagates():
    out = scoring.score_record(_rec(), ENVS["moon_base"], W)
    assert out["equipment_relevance"] == 0.5  # pillar 1.0 x MSG 0.5
    out = scoring.score_record(_rec(hardware={"value": None, "status": "missing"}),
                               ENVS["moon_base"], W)
    assert out["equipment_relevance"] is None


def test_golden_top_five_per_environment(tmp_path):
    db = tmp_path / "g.db"
    store.build_db(ROOT / "data" / "records", db)
    recs = store.all_records(db)
    golden = json.loads(open(Path(__file__).parent / "golden.json").read())["rankings"]
    for env_id, expected in golden.items():
        got = [r["id"] for r in scoring.score_all(recs, ENVS[env_id], W, "all")[:5]]
        assert got == expected, f"{env_id}: {got} != {expected}"
