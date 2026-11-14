"""Records loader: validated JSON -> SQLite (+ read queries).

The source of truth stays in data/records/*.json; the database is a derived,
rebuild-on-boot query layer. Every file is schema-validated before anything is
loaded, so a bad record fails the build instead of half-loading.
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts.validate_records import validate  # noqa: E402

SCHEMA = """
CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  psi_id TEXT,
  name TEXT NOT NULL,
  platform TEXT,
  project TEXT,
  investigation_type TEXT,
  hardware TEXT,
  gravity_regime TEXT,
  fuel_class TEXT,
  pillars_json TEXT NOT NULL DEFAULT '[]',
  full_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS test_conditions (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  investigation_id TEXT NOT NULL REFERENCES investigations(id),
  label TEXT,
  o2_min REAL, o2_max REAL,
  p_min REAL, p_max REAL,
  af_min REAL, af_max REAL,
  diluent TEXT, ignition TEXT, gravity_level TEXT
);
CREATE TABLE IF NOT EXISTS fuels (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  investigation_id TEXT NOT NULL REFERENCES investigations(id),
  name TEXT, phase TEXT, shape TEXT, size TEXT
);
"""


def _val(field, default=None):
    if isinstance(field, dict) and "value" in field:
        return field.get("value", default)
    return field if field is not None else default


def _text(field):
    v = _val(field)
    return v if isinstance(v, str) else None


def _bounds(field):
    v = _val(field)
    if v is None:
        return (None, None)
    if isinstance(v, dict):
        return (v.get("min"), v.get("max"))
    if isinstance(v, (int, float)):
        return (v, v)
    return (None, None)


def _present_block(lo, hi):
    if lo is None and hi is None:
        return {"min": None, "max": None, "status": "missing"}
    return {"min": lo, "max": hi, "status": "present"}


def build_db(records_dir: Path, db_path: Path) -> dict[str, int]:
    """Validate every record, then (re)build the database. Returns row counts."""
    paths = sorted(records_dir.glob("*.json"))
    records = []
    for p in paths:
        errors = validate(str(p))
        if errors:
            extra = f" (+{len(errors) - 1} more)" if len(errors) > 1 else ""
            raise ValueError(f"{p.name}: {errors[0]}{extra}")
        records.append(json.loads(p.read_text()))
    if db_path.exists():
        db_path.unlink()
    con = sqlite3.connect(db_path)
    try:
        con.executescript(SCHEMA)
        n_tc = n_f = 0
        for rec in records:
            pillars = _val(rec.get("safety_pillars"), []) or []
            con.execute(
                "INSERT INTO investigations VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (rec.get("id"), rec.get("psi_id"), rec.get("name"), rec.get("platform"),
                 rec.get("project"), _text(rec.get("investigation_type")),
                 _text(rec.get("hardware")), _text(rec.get("gravity_regime")),
                 _text(rec.get("fuel_class")), json.dumps(pillars), json.dumps(rec)))
            for tc in _val(rec.get("test_conditions"), []) or []:
                if not isinstance(tc, dict):
                    continue
                o2 = _bounds(tc.get("oxygen_percent"))
                pr = _bounds(tc.get("pressure_psi"))
                af = _bounds(tc.get("airflow_cm_s"))
                con.execute(
                    "INSERT INTO test_conditions (investigation_id,label,o2_min,o2_max,"
                    "p_min,p_max,af_min,af_max,diluent,ignition,gravity_level)"
                    " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (rec["id"], tc.get("label"), *o2, *pr, *af,
                     _text(tc.get("diluent")), _text(tc.get("ignition_method")),
                     _text(tc.get("gravity_level"))))
                n_tc += 1
            for f in _val(rec.get("fuels"), []) or []:
                if not isinstance(f, dict):
                    continue
                con.execute(
                    "INSERT INTO fuels (investigation_id,name,phase,shape,size)"
                    " VALUES (?,?,?,?,?)",
                    (rec["id"], f.get("name"), f.get("phase"), f.get("shape"), f.get("size")))
                n_f += 1
        con.commit()
    finally:
        con.close()
    return {"investigations": len(records), "test_conditions": n_tc, "fuels": n_f}


def _connect(db_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    return con


def list_investigations(db_path: Path, *, hardware=None, fuel_class=None, pillar=None,
                        gravity=None, oxygen_min=None, oxygen_max=None, q=None,
                        limit=50, offset=0) -> list[dict]:
    """Filtered roster. Oxygen filters match overlapping ranges only — a record
    with no oxygen data never matches a range query."""
    con = _connect(db_path)
    try:
        rows = con.execute(
            """
            SELECT * FROM investigations i
            WHERE (:hardware IS NULL OR i.hardware = :hardware)
              AND (:fuel IS NULL OR i.fuel_class = :fuel)
              AND (:grav IS NULL OR i.gravity_regime = :grav)
              AND (:o2min IS NULL AND :o2max IS NULL OR EXISTS (
                SELECT 1 FROM test_conditions t
                WHERE t.investigation_id = i.id
                  AND (t.o2_min IS NOT NULL OR t.o2_max IS NOT NULL)
                  AND (t.o2_min IS NULL OR :o2max IS NULL OR t.o2_min <= :o2max)
                  AND (t.o2_max IS NULL OR :o2min IS NULL OR t.o2_max >= :o2min)))
            ORDER BY i.id
            """,
            {"hardware": hardware, "fuel": fuel_class, "grav": gravity,
             "o2min": oxygen_min, "o2max": oxygen_max}).fetchall()
        agg = con.execute(
            "SELECT investigation_id, MIN(o2_min), MAX(o2_max), MIN(p_min), MAX(p_max),"
            " MIN(af_min), MAX(af_max) FROM test_conditions GROUP BY investigation_id"
        ).fetchall()
    finally:
        con.close()
    ranges = {a[0]: {"oxygen_percent": _present_block(a[1], a[2]),
                     "pressure_psi": _present_block(a[3], a[4]),
                     "airflow_cm_s": _present_block(a[5], a[6])} for a in agg}
    _MISSING_ALL = {k: {"min": None, "max": None, "status": "missing"}
                    for k in ("oxygen_percent", "pressure_psi", "airflow_cm_s")}
    out = []
    for r in rows:
        pillars = json.loads(r["pillars_json"])
        if pillar and pillar not in pillars:
            continue
        if q and q.lower() not in (r["name"] or "").lower() and q.lower() not in r["id"]:
            continue
        out.append({"id": r["id"], "name": r["name"], "psi_id": r["psi_id"],
                    "hardware": r["hardware"], "fuel_class": r["fuel_class"],
                    "pillars": pillars, "gravity_regime": r["gravity_regime"],
                    "investigation_type": r["investigation_type"],
                    "condition_ranges": ranges.get(r["id"], _MISSING_ALL)})
    return out[offset:offset + limit]


def all_records(db_path: Path) -> list[dict]:
    con = _connect(db_path)
    try:
        rows = con.execute("SELECT full_json FROM investigations ORDER BY id").fetchall()
    finally:
        con.close()
    return [json.loads(r["full_json"]) for r in rows]


def get_investigation(db_path: Path, inv_id: str) -> dict | None:
    con = _connect(db_path)
    try:
        row = con.execute("SELECT full_json FROM investigations WHERE id = ?",
                          (inv_id,)).fetchone()
    finally:
        con.close()
    return json.loads(row["full_json"]) if row else None


def all_conditions(db_path: Path) -> list[dict]:
    """Per-investigation test groups with ranges (null bounds = missing)."""
    con = _connect(db_path)
    try:
        ids = [r["id"] for r in con.execute("SELECT id FROM investigations ORDER BY id")]
        out = []
        for iid in ids:
            tcs = con.execute(
                "SELECT label,o2_min,o2_max,p_min,p_max,af_min,af_max"
                " FROM test_conditions WHERE investigation_id = ? ORDER BY rowid",
                (iid,)).fetchall()
            out.append({"id": iid, "groups": [dict(t) for t in tcs]})
    finally:
        con.close()
    return out
