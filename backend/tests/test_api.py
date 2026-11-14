"""API contract tests against loader-backed data (generic: pass with 1..N records)."""
from fastapi.testclient import TestClient

from backend.app import app

c = TestClient(app)


def _roster():
    r = c.get("/api/investigations")
    assert r.status_code == 200
    assert len(r.json()) >= 1
    return r.json()


def test_health_reports_records():
    j = c.get("/api/health").json()
    assert j["status"] == "ok" and j["records"] >= 1


def test_detail_serves_full_record():
    first = _roster()[0]["id"]
    j = c.get(f"/api/investigations/{first}").json()
    assert j["id"] == first and "test_conditions" in j and "mock" not in j


def test_detail_404_shape():
    r = c.get("/api/investigations/nope")
    assert r.status_code == 404 and r.json()["error"]["code"] == "unknown_id"


def test_filters_compose():
    ids = [r["id"] for r in c.get("/api/investigations", params={"hardware": "MSG"}).json()]
    assert "bass" in ids
    assert c.get("/api/investigations", params={"oxygen_min": 90}).json() == []
    hits = c.get("/api/investigations", params={"oxygen_min": 15, "oxygen_max": 20}).json()
    assert "bass" in [r["id"] for r in hits]


def test_rank_over_real_roster():
    r = c.get("/api/rank", params={"environment": "moon_base"}).json()
    assert len(r) == len(_roster())
    assert all("factors" in x and "flags" in x for x in r)
    assert any("partial gravity" in f for f in r[0]["flags"])
    assert c.get("/api/rank", params={"environment": "nope"}).status_code == 400


def test_conditions_real_groups_and_zones():
    j = c.get("/api/conditions").json()
    assert len(j["zones"]) == 7
    bass = [x for x in j["investigations"] if x["id"] == "bass"][0]
    assert len(bass["groups"]) >= 2
    assert all("status" in g["oxygen_percent"] for g in bass["groups"])


def test_compare_export_gaps_shapes():
    ids = ",".join(r["id"] for r in _roster()[:2])
    j = c.get("/api/compare", params={"ids": ids}).json()
    assert "similarities" in j and "differences" in j
    assert c.get("/api/compare", params={"ids": "bass"}).status_code == 400
    j = c.get("/api/export", params={"ids": "bass", "format": "csv"}).json()
    assert "o2_min" in j["csv"].splitlines()[0]
    assert len(c.get("/api/gaps", params={"environment": "mars_base"}).json()) == 3


def test_si_still_unavailable():
    r = c.get("/api/si/summary/bass")
    assert r.status_code == 503 and r.json()["error"]["code"] == "si_unavailable"
    assert c.post("/api/ask", json={"question": "hi"}).status_code == 503


def test_list_includes_condition_ranges():
    rows = {r["id"]: r for r in c.get("/api/investigations").json()}
    bass_o2 = rows["bass"]["condition_ranges"]["oxygen_percent"]
    assert bass_o2["status"] == "present" and bass_o2["min"] == 17 and bass_o2["max"] == 17
    flex_o2 = rows["flex"]["condition_ranges"]["oxygen_percent"]
    assert (flex_o2["min"], flex_o2["max"]) == (10, 50)
    assert rows["saffire-i"]["condition_ranges"]["oxygen_percent"]["status"] == "missing"


def test_compare_rejects_duplicate_ids():
    r = c.get("/api/compare", params={"ids": "bass,bass"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_ids"
