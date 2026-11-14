"""Loader tests: validation gate, derived tables, range filters."""
import json
import sqlite3
from pathlib import Path

import pytest

from backend import store

ROOT = Path(__file__).resolve().parent.parent.parent
RECORDS = ROOT / "data" / "records"


@pytest.fixture()
def db(tmp_path):
    path = tmp_path / "test.db"
    stats = store.build_db(RECORDS, path)
    assert stats["investigations"] >= 1
    return path


def test_build_counts_and_tables(db):
    con = sqlite3.connect(db)
    try:
        tables = {r[0] for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"investigations", "test_conditions", "fuels"} <= tables
        assert con.execute("SELECT COUNT(*) FROM investigations").fetchone()[0] >= 1
    finally:
        con.close()


def test_bass_loaded_with_conditions(db):
    rec = store.get_investigation(db, "bass")
    assert rec and rec["id"] == "bass"
    conds = [c for c in store.all_conditions(db) if c["id"] == "bass"][0]["groups"]
    assert len(conds) >= 2  # flight tests + drop-tower example at minimum
    o2 = [(g["o2_min"], g["o2_max"]) for g in conds]
    assert (17, 17) in o2  # drop-tower PMMA sphere example


def test_unknown_id_returns_none(db):
    assert store.get_investigation(db, "nope") is None


def test_oxygen_filter_matches_overlap_only(db):
    hits = store.list_investigations(db, oxygen_min=15, oxygen_max=20)
    assert "bass" in [r["id"] for r in hits]
    assert store.list_investigations(db, oxygen_min=90) == []


def test_missing_oxygen_never_matches_range(db, tmp_path):
    rec = {
        "id": "nodata", "psi_id": "TBD", "name": "No Data", "platform": "ISS",
        "project": None, "psi_url": "https://example.invalid/nodata",
        "doi_citation": "TBD", "related": [],
        "hardware": {"value": "MSG", "status": "read", "source": {"doc": "t"}},
        "gravity_regime": {"value": "microgravity", "status": "read", "source": {"doc": "t"}},
        "fuel_class": {"value": "solid", "status": "read", "source": {"doc": "t"}},
        "investigation_type": {"value": "microgravity", "status": "read", "source": {"doc": "t"}},
        "test_conditions": {"value": [{
            "label": "unstated", "oxygen_percent": {"value": None, "status": "missing"},
            "pressure_psi": {"value": None, "status": "missing"},
            "airflow_cm_s": {"value": None, "status": "missing"}}],
            "status": "read", "source": {"doc": "t"}},
    }
    d = tmp_path / "recs"
    d.mkdir()
    (d / "nodata.json").write_text(json.dumps(rec))
    tdb = tmp_path / "t.db"
    assert store.build_db(d, tdb)["investigations"] == 1
    assert store.list_investigations(tdb, oxygen_min=0, oxygen_max=100) == []
    assert [r["id"] for r in store.list_investigations(tdb)] == ["nodata"]


def test_invalid_record_fails_build(tmp_path):
    d = tmp_path / "recs"
    d.mkdir()
    (d / "bad.json").write_text(json.dumps({"id": "bad"}))
    with pytest.raises(ValueError, match="bad.json"):
        store.build_db(d, tmp_path / "t.db")
    assert not (tmp_path / "t.db").exists()  # nothing half-loaded
