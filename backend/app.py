"""Ember Phase 0 mock API (gate G1).

Serves REAL data where Phase 0 produced it (environment profiles, weights,
investigation list, Earth applications) and clearly-marked MOCK shapes
everywhere else, so frontend and visualization work can start immediately.

Forward-compatible by design: GET /api/investigations/{id} serves
data/records/<id>.json as soon as Dev 1 lands it, with zero code change.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

ROOT = Path(__file__).resolve().parent
RECORDS = ROOT.parent / "data" / "records"
VERSION = "v0.1.0-mock"


def _load_yaml(name: str) -> dict:
    with open(ROOT / "config" / name) as f:
        return yaml.safe_load(f)


ENVIRONMENTS: list[dict[str, Any]] = _load_yaml("environments.yaml")["environments"]
WEIGHTS: dict[str, Any] = _load_yaml("weights.yaml")

# Real investigation roster from docs/INVESTIGATIONS.md (existence is real,
# test-condition details are mock until curated records land).
INVESTIGATIONS: list[dict[str, Any]] = [
    {"id": "bass", "psi_id": None, "name": "BASS", "type": "microgravity", "hardware": "MSG", "fuel_class": "solid", "pillars": [], "gravity": "microgravity"},
    {"id": "bass-ii", "psi_id": None, "name": "BASS-II", "type": "microgravity", "hardware": "MSG", "fuel_class": "solid", "pillars": [], "gravity": "microgravity"},
    {"id": "saffire-i", "psi_id": None, "name": "Saffire-I", "type": "microgravity", "hardware": "other", "fuel_class": "solid", "pillars": [], "gravity": "microgravity"},
    {"id": "saffire-ii", "psi_id": None, "name": "Saffire-II", "type": "microgravity", "hardware": "other", "fuel_class": "solid", "pillars": [], "gravity": "microgravity"},
    {"id": "saffire-iii", "psi_id": None, "name": "Saffire-III", "type": "microgravity", "hardware": "other", "fuel_class": "solid", "pillars": [], "gravity": "microgravity"},
    {"id": "same", "psi_id": None, "name": "SAME", "type": "microgravity", "hardware": "MSG", "fuel_class": "other", "pillars": ["detection"], "gravity": "microgravity"},
    {"id": "same-r", "psi_id": None, "name": "SAME-R", "type": "microgravity", "hardware": "MSG", "fuel_class": "other", "pillars": ["detection"], "gravity": "microgravity"},
    {"id": "daft", "psi_id": None, "name": "DAFT", "type": "microgravity", "hardware": "MSG", "fuel_class": "aerosol_dust", "pillars": ["detection"], "gravity": "microgravity"},
    {"id": "daft-2", "psi_id": None, "name": "DAFT-2", "type": "microgravity", "hardware": "MSG", "fuel_class": "aerosol_dust", "pillars": ["detection"], "gravity": "microgravity"},
    {"id": "flex", "psi_id": None, "name": "FLEX", "type": "microgravity", "hardware": "CIR", "fuel_class": "liquid_droplet", "pillars": ["suppression"], "gravity": "microgravity"},
    {"id": "flex-2", "psi_id": None, "name": "FLEX-2", "type": "microgravity", "hardware": "CIR", "fuel_class": "liquid_droplet", "pillars": ["suppression"], "gravity": "microgravity"},
    {"id": "bass-model", "psi_id": "PSI-62", "name": "Concurrent Flame Spread Modeling (BASS/BASS-II)", "type": "ground", "hardware": "other", "fuel_class": "solid", "pillars": [], "gravity": "microgravity"},
    {"id": "cfi", "psi_id": None, "name": "CFI", "type": "microgravity", "hardware": "CIR", "fuel_class": "liquid_droplet", "pillars": [], "gravity": "microgravity"},
    {"id": "cfi-g", "psi_id": "PSI-159", "name": "CFI-G", "type": "microgravity", "hardware": "CIR", "fuel_class": "gas", "pillars": [], "gravity": "microgravity"},
    {"id": "acme-bre", "psi_id": None, "name": "BRE (ACME)", "type": "microgravity", "hardware": "CIR", "fuel_class": "gas", "pillars": [], "gravity": "microgravity"},
    {"id": "acme-efield", "psi_id": None, "name": "E-FIELD Flames (ACME)", "type": "microgravity", "hardware": "CIR", "fuel_class": "gas", "pillars": [], "gravity": "mimicked_partial"},
    {"id": "acme-flame-design", "psi_id": "PSI-10", "name": "Flame Design (ACME)", "type": "microgravity", "hardware": "CIR", "fuel_class": "gas", "pillars": [], "gravity": "microgravity"},
    {"id": "coolflame-model", "psi_id": "PSI-117", "name": "Thermo-Convective Perturbation of Cool Flames", "type": "ground", "hardware": "other", "fuel_class": "liquid_droplet", "pillars": [], "gravity": "microgravity"},
    {"id": "spice", "psi_id": None, "name": "SPICE", "type": "microgravity", "hardware": "MSG", "fuel_class": "gas", "pillars": [], "gravity": "microgravity"},
    {"id": "spice-analysis", "psi_id": "PSI-60", "name": "Computational/Experimental Analysis of SPICE Data", "type": "ground", "hardware": "other", "fuel_class": "gas", "pillars": [], "gravity": "microgravity"},
    {"id": "slice", "psi_id": None, "name": "SLICE", "type": "microgravity", "hardware": "MSG", "fuel_class": "gas", "pillars": [], "gravity": "microgravity"},
]
BY_ID = {inv["id"]: inv for inv in INVESTIGATIONS}

EARTH_APPLICATIONS = [
    {"application": "firefighters' air tanks and breathing gear", "investigation": None,
     "source": "https://spinoff.nasa.gov/node/9582", "note": "1970s adaptation of spacesuit technology"},
    {"application": "smoke detector discriminating smoke from dust (industrial/mining use)", "investigation": None,
     "source": "https://spinoff.nasa.gov/node/9407", "note": "1970s shuttle smoke detector; fewer nuisance alarms"},
    {"application": "firefighter protective clothing", "investigation": None,
     "source": "https://spinoff.nasa.gov/node/9918", "note": "1980s application of spacesuit technology"},
]

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

app = FastAPI(title="Ember API (mock)", version=VERSION)


def err(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message}}, status_code=status)


@app.exception_handler(RequestValidationError)
async def _validation_as_contract(request: Request, exc: RequestValidationError) -> JSONResponse:
    return err("validation_error", str(exc.errors()), 422)


def _env_or_none(env_id: str | None) -> dict | None:
    return next((e for e in ENVIRONMENTS if e["id"] == env_id), None)


def _pseudo(seed: str) -> float:
    """Deterministic placeholder in [0,1]. Mock only; Dev 3 replaces with real factors."""
    return round(int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF, 3)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "version": VERSION}


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
) -> list[dict]:
    # NOTE (mock): oxygen_min/max activate with real records (Day 1 PM); the
    # mock carries no test-condition ranges, so they filter nothing yet.
    rows = INVESTIGATIONS
    if hardware:
        rows = [r for r in rows if r["hardware"] == hardware]
    if fuel_class:
        rows = [r for r in rows if r["fuel_class"] == fuel_class]
    if pillar:
        rows = [r for r in rows if pillar in r["pillars"]]
    if gravity_regime:
        rows = [r for r in rows if r["gravity"] == gravity_regime]
    if q:
        ql = q.lower()
        rows = [r for r in rows if ql in r["name"].lower() or ql in r["id"]]
    return [
        {"id": r["id"], "name": r["name"], "psi_id": r["psi_id"], "hardware": r["hardware"],
         "fuel_class": r["fuel_class"], "pillars": r["pillars"],
         "gravity_regime": r["gravity"], "investigation_type": r["type"]}
        for r in rows[offset:offset + limit]
    ]


@app.get("/api/investigations/{inv_id}")
def investigation_detail(inv_id: str):
    path = RECORDS / f"{inv_id}.json"
    if path.exists():
        return json.loads(path.read_text())  # real record as soon as Dev 1 lands it
    row = BY_ID.get(inv_id)
    if row is None:
        return err("unknown_id", f"Unknown investigation: {inv_id}", 404)
    missing = {"value": None, "status": "missing"}
    return {
        "id": row["id"], "psi_id": row["psi_id"], "name": row["name"],
        "mock": True,
        "hardware": {"value": row["hardware"], "status": "read", "source": {"doc": "docs/INVESTIGATIONS.md"}},
        "fuel_class": {"value": row["fuel_class"], "status": "read", "source": {"doc": "docs/INVESTIGATIONS.md"}},
        "gravity_regime": {"value": row["gravity"], "status": "read", "source": {"doc": "docs/INVESTIGATIONS.md"}},
        "investigation_type": {"value": row["type"], "status": "read", "source": {"doc": "docs/INVESTIGATIONS.md"}},
        "safety_pillars": {"value": row["pillars"], "status": "read", "source": {"doc": "docs/INVESTIGATIONS.md"}},
        "fuels": missing, "test_conditions": missing, "variables": missing,
        "measurements": missing, "objectives": missing, "summary": missing,
    }


@app.get("/api/rank")
def rank(environment: str = "moon_base", lens: str = "all"):
    if _env_or_none(environment) is None:
        return err("unknown_environment", f"Unknown environment: {environment}", 400)
    if lens not in ("all", "prevention", "detection", "suppression"):
        return err("invalid_lens", f"Invalid lens: {lens}", 400)
    weights = dict(WEIGHTS["default"])
    weights.update(WEIGHTS.get("lenses", {}).get(lens, {}))
    total = sum(weights.values())
    env = _env_or_none(environment)
    partial_g = str(env.get("gravity", "")).endswith("no_data")
    out = []
    for row in INVESTIGATIONS:
        factors = []
        for fname, w in weights.items():
            f = _pseudo(f"{row['id']}:{environment}:{fname}")
            factors.append({"factor": fname, "score": f, "weight": w,
                            "contribution": round(w * f / total, 4),
                            "fields": FACTOR_FIELDS[fname]})
        score = round(sum(f["contribution"] for f in factors), 4)
        flags = ["mock scores — real scoring lands Day 1 PM", "test conditions missing"]
        if partial_g:
            flags.append("partial gravity: PSI has no Moon/Mars-g data; microgravity and normal-gravity results bound it")
        out.append({"id": row["id"], "score": score,
                    "modeling_readiness": _pseudo(f"{row['id']}:mr"),
                    "equipment_relevance": _pseudo(f"{row['id']}:er"),
                    "factors": factors, "flags": flags})
    out.sort(key=lambda r: r["score"], reverse=True)
    return out


@app.get("/api/compare")
def compare(ids: str = Query("")):
    wanted = [i.strip() for i in ids.split(",") if i.strip()]
    if len(wanted) not in (2, 3):
        return err("invalid_ids", "Provide two or three ids", 400)
    unknown = [i for i in wanted if i not in BY_ID]
    if unknown:
        return err("unknown_id", f"Unknown ids: {', '.join(unknown)}", 404)
    rows = {i: BY_ID[i] for i in wanted}
    fields = ["hardware", "fuel_class", "pillars", "gravity", "type"]
    aligned = {i: {f: rows[i][f] for f in fields} for i in wanted}
    similarities, differences = [], []
    for f in fields:
        vals = {i: rows[i][f] for i in wanted}
        (similarities if len({json.dumps(v, sort_keys=True) for v in vals.values()}) == 1
         else differences).append({"field": f, "values": vals})
    return {"ids": wanted, "aligned": aligned, "similarities": similarities,
            "differences": differences, "mock": True}


@app.get("/api/conditions")
def conditions() -> dict:
    return {
        "investigations": [
            {"id": r["id"],
             "oxygen_percent": {"value": None, "status": "missing"},
             "pressure_psi": {"value": None, "status": "missing"},
             "airflow_cm_s": {"value": None, "status": "missing"}}
            for r in INVESTIGATIONS
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
        {"gap": "missing_oxygen_ranges", "title": "Oxygen ranges not yet curated",
         "detail": "Test-condition ranges land with Dev 1 records (Day 1 PM).",
         "bounds": ["cfi-g", "bass-ii"]},
        {"gap": "untested_combinations", "title": "Untested fuel/atmosphere combinations",
         "detail": "30%+ O2 at <=10.2 psi in partial gravity has no direct test.",
         "bounds": ["cfi-g", "saffire-i"]},
    ]


@app.get("/api/si/summary/{inv_id}")
def si_summary(inv_id: str, environment: str = "moon_base") -> JSONResponse:
    return err("si_unavailable", "SI provider unavailable; configure ANTHROPIC_API_KEY (Dev 4, Day 1 PM)", 503)


@app.post("/api/si/compare")
def si_compare(payload: dict) -> JSONResponse:
    return err("si_unavailable", "SI provider unavailable; configure ANTHROPIC_API_KEY (Dev 4, Day 1 PM)", 503)


@app.post("/api/ask")
def ask(payload: dict) -> JSONResponse:
    return err("si_unavailable", "SI provider unavailable; configure ANTHROPIC_API_KEY (Dev 4, Day 1 PM)", 503)


@app.get("/api/export")
def export(ids: str = Query(""), format: str = "json", fields: str = "") -> JSONResponse:
    wanted = [i.strip() for i in ids.split(",") if i.strip()]
    if not wanted:
        return err("invalid_ids", "Provide at least one id", 400)
    unknown = [i for i in wanted if i not in BY_ID]
    if unknown:
        return err("unknown_id", f"Unknown ids: {', '.join(unknown)}", 404)
    if format not in ("csv", "json"):
        return err("invalid_format", "format must be csv or json", 400)
    cols = [c.strip() for c in fields.split(",") if c.strip()] or ["id", "name", "hardware", "fuel_class", "pillars"]
    rows = [{c: BY_ID[i].get(c) for c in cols} for i in wanted]
    if format == "json":
        return JSONResponse({"ids": wanted, "fields": cols, "rows": rows, "mock": True})
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols)
    w.writeheader()
    w.writerows(rows)
    return JSONResponse({"ids": wanted, "fields": cols, "csv": buf.getvalue(), "mock": True})


@app.get("/api/earth-applications")
def earth_applications() -> list[dict]:
    return EARTH_APPLICATIONS
