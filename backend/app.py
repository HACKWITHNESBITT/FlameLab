"""FlameLab API.

Reads real curated data through the loader-backed SQLite store. Rank scores
are still interim placeholders — the scoring engine replaces them —
and SI endpoints stay 503 until the SI layer lands a provider key.
"""

from __future__ import annotations

import csv
import io
import os
import json
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend import scoring, store

ROOT = Path(__file__).resolve().parent
RECORDS = ROOT.parent / "data" / "records"
DB_PATH = ROOT / "flamelab.db"
VERSION = "v0.2.0-loader"


def _load_yaml(name: str) -> dict:
    with open(ROOT / "config" / name) as f:
        return yaml.safe_load(f)


ENVIRONMENTS: list[dict[str, Any]] = _load_yaml("environments.yaml")["environments"]
WEIGHTS: dict[str, Any] = _load_yaml("weights.yaml")
LOAD_STATS = store.build_db(RECORDS, DB_PATH)

EARTH_APPLICATIONS = [
    {"application": "firefighters' air tanks and breathing gear", "investigation": None,
     "source": "https://spinoff.nasa.gov/node/9582", "note": "1970s adaptation of spacesuit technology"},
    {"application": "smoke detector discriminating smoke from dust (industrial/mining use)", "investigation": None,
     "source": "https://spinoff.nasa.gov/node/9407", "note": "1970s shuttle smoke detector; fewer nuisance alarms"},
    {"application": "firefighter protective clothing", "investigation": None,
     "source": "https://spinoff.nasa.gov/node/9918", "note": "1980s application of spacesuit technology"},
]

FACTOR_FIELDS = scoring.FACTOR_FIELDS

app = FastAPI(title="FlameLab API", version=VERSION)


def err(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message}}, status_code=status)


@app.exception_handler(RequestValidationError)
async def _validation_as_contract(request: Request, exc: RequestValidationError) -> JSONResponse:
    return err("validation_error", str(exc.errors()), 422)


def _env_or_none(env_id: str | None) -> dict | None:
    return next((e for e in ENVIRONMENTS if e["id"] == env_id), None)


# Roster and factor math live in backend.store / backend.scoring.


@app.get("/api/health")
def health():
    return {"status": "ok", "version": VERSION, "records": LOAD_STATS["investigations"]}


@app.get("/api/environments")
def environments() -> list[dict]:
    return ENVIRONMENTS


@app.get("/api/investigations")
def list_investigations(
    hardware: str | None = None,
    fuel_class: str | None = None,
    pillar: str | None = None,
    gravity_regime: str | None = None,
    oxygen_min: float | None = None,
    oxygen_max: float | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    return store.list_investigations(
        DB_PATH, hardware=hardware, fuel_class=fuel_class, pillar=pillar,
        gravity=gravity_regime, oxygen_min=oxygen_min, oxygen_max=oxygen_max,
        q=q, limit=limit, offset=offset)


@app.get("/api/investigations/{inv_id}")
def investigation_detail(inv_id: str):
    rec = store.get_investigation(DB_PATH, inv_id)
    if rec is None:
        return err("unknown_id", f"Unknown investigation: {inv_id}", 404)
    return rec


@app.get("/api/rank")
def rank(environment: str = "moon_base", lens: str = "all"):
    if os.getenv("FLAMELAB_SCORING_ENABLED", "on").lower() not in ("1", "true", "yes", "on"):
        return err("scoring_disabled", "Scoring engine disabled by operator flag", 503)
    if _env_or_none(environment) is None:
        return err("unknown_environment", f"Unknown environment: {environment}", 400)
    if lens not in ("all", "prevention", "detection", "suppression"):
        return err("invalid_lens", f"Invalid lens: {lens}", 400)
    env = _env_or_none(environment)
    return scoring.score_all(store.all_records(DB_PATH), env, WEIGHTS, lens)


@app.get("/api/compare")
def compare(ids: str = Query("")):
    wanted = [i.strip() for i in ids.split(",") if i.strip()]
    if len(wanted) not in (2, 3):
        return err("invalid_ids", "Provide two or three ids", 400)
    if len(set(wanted)) != len(wanted):
        return err("invalid_ids", "Duplicate ids", 400)
    rows = {}
    for i in wanted:
        rec = store.get_investigation(DB_PATH, i)
        if rec is None:
            return err("unknown_id", f"Unknown id: {i}", 404)
        rows[i] = rec
    fields = ["hardware", "fuel_class", "safety_pillars", "gravity_regime", "investigation_type"]

    def _v(rec, f):
        v = rec.get(f)
        return v.get("value") if isinstance(v, dict) and "value" in v else v

    aligned = {i: {f: _v(rows[i], f) for f in fields} for i in wanted}
    similarities, differences = [], []
    for f in fields:
        vals = {i: aligned[i][f] for i in wanted}
        (similarities if len({json.dumps(v, sort_keys=True, default=str) for v in vals.values()}) == 1
         else differences).append({"field": f, "values": vals})
    return {"ids": wanted, "aligned": aligned, "similarities": similarities,
            "differences": differences}


def _range_block(lo, hi) -> dict:
    if lo is None and hi is None:
        return {"min": None, "max": None, "status": "missing"}
    return {"min": lo, "max": hi, "status": "present"}


@app.get("/api/conditions")
def conditions():
    return {
        "investigations": [
            {"id": c["id"], "groups": [
                {"label": g["label"],
                 "oxygen_percent": _range_block(g["o2_min"], g["o2_max"]),
                 "pressure_psi": _range_block(g["p_min"], g["p_max"]),
                 "airflow_cm_s": _range_block(g["af_min"], g["af_max"])}
                for g in c["groups"]]}
            for c in store.all_conditions(DB_PATH)
        ],
        "zones": [
            {"environment": e["id"], "label": e["label"],
             "oxygen_percent": e["oxygen_percent"], "pressure_psi": e["pressure_psi"],
             "airflow_cm_s": e["airflow_cm_s"]}
            for e in ENVIRONMENTS
        ],
    }


@app.get("/api/gaps")
def gaps(environment: str = "moon_base"):
    if _env_or_none(environment) is None:
        return err("unknown_environment", f"Unknown environment: {environment}", 400)
    return [
        {"gap": "partial_gravity", "title": "No partial-gravity combustion data",
         "detail": "PSI holds microgravity and normal-gravity results only; nothing at Moon or Mars gravity.",
         "bounds": ["bass-ii", "saffire-i"]},
        {"gap": "missing_oxygen_ranges", "title": "Oxygen ranges still being curated",
         "detail": "Numeric ranges land per record with curation; see data_quality notes.",
         "bounds": ["cfi-g", "bass-ii"]},
        {"gap": "untested_combinations", "title": "Untested fuel/atmosphere combinations",
         "detail": "30%+ O2 at <=10.2 psi in partial gravity has no direct test.",
         "bounds": ["cfi-g", "saffire-i"]},
    ]


@app.get("/api/si/summary/{inv_id}")
def si_summary(inv_id: str, environment: str = "moon_base") -> JSONResponse:
    return err("si_unavailable", "SI provider unavailable; configure ANTHROPIC_API_KEY", 503)


@app.post("/api/si/compare")
def si_compare(payload: dict) -> JSONResponse:
    return err("si_unavailable", "SI provider unavailable; configure ANTHROPIC_API_KEY", 503)


@app.post("/api/ask")
def ask(payload: dict) -> JSONResponse:
    return err("si_unavailable", "SI provider unavailable; configure ANTHROPIC_API_KEY", 503)


@app.get("/api/export")
def export(ids: str = Query(""), format: str = "json", fields: str = ""):
    wanted = [i.strip() for i in ids.split(",") if i.strip()]
    if not wanted:
        return err("invalid_ids", "Provide at least one id", 400)
    for i in wanted:
        if store.get_investigation(DB_PATH, i) is None:
            return err("unknown_id", f"Unknown id: {i}", 404)
    if format not in ("csv", "json"):
        return err("invalid_format", "format must be csv or json", 400)
    if format == "json":
        cols = [c.strip() for c in fields.split(",") if c.strip()] or ["id", "name", "hardware", "fuel_class"]
        rows = []
        for i in wanted:
            rec = store.get_investigation(DB_PATH, i)

            def _v(f):
                v = rec.get(f)
                return v.get("value") if isinstance(v, dict) and "value" in v else v

            rows.append({c: _v(c) for c in cols})
        return {"ids": wanted, "fields": cols, "rows": rows}
    buf = io.StringIO()
    conds = {c["id"]: c["groups"] for c in store.all_conditions(DB_PATH)}
    w = csv.DictWriter(buf, fieldnames=["id", "label", "o2_min", "o2_max", "p_min", "p_max", "af_min", "af_max"])
    w.writeheader()
    for i in wanted:
        for g in conds.get(i, []):
            w.writerow({"id": i, "label": g["label"], "o2_min": g["o2_min"], "o2_max": g["o2_max"],
                        "p_min": g["p_min"], "p_max": g["p_max"], "af_min": g["af_min"], "af_max": g["af_max"]})
    return {"ids": wanted, "format": "csv", "csv": buf.getvalue()}


@app.get("/api/earth-applications")
def earth_applications() -> list[dict]:
    return EARTH_APPLICATIONS
