"""SI tests: verifier, retrieval/coverage, endpoints with mocked provider. Keyless."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from si import retrieval, verifier

ROOT = Path(__file__).resolve().parent.parent.parent


def _recs():
    return [json.loads(p.read_text()) for p in sorted((ROOT / "data" / "records").glob("*.json"))]


@pytest.fixture()
def by_id():
    return {r["id"]: r for r in _recs()}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    import backend.app as appmod
    monkeypatch.setattr(appmod, "SI_LOG", tmp_path / "audit.log")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    return TestClient(appmod.app)


# Verifier


def test_valid_sentences_pass(by_id):
    ok, _ = verifier.verify_sentence("BASS ran in the MSG [rec:bass#hardware].", by_id.get)
    assert ok
    ok, _ = verifier.verify_sentence(
        "The drop-tower sphere burned at 17 percent oxygen "
        "[rec:bass#test_conditions.value.1.oxygen_percent].", by_id.get)
    assert ok


def test_verifier_rejects_bad_citations(by_id):
    assert not verifier.verify_sentence("BASS ran in the MSG [rec:nope#hardware].", by_id.get)[0]
    assert not verifier.verify_sentence("BASS ran in the MSG [rec:bass#nope].", by_id.get)[0]
    assert not verifier.verify_sentence("BASS ran in the MSG.", by_id.get)[0]
    ok, reasons = verifier.verify_sentence(
        "BASS tested 99 percent oxygen [rec:bass#test_conditions.value.1.oxygen_percent].",
        by_id.get)
    assert not ok and any("99" in r for r in reasons)


def test_verify_text_drops_failures_and_fails_closed(by_id):
    out = verifier.verify_text(
        "BASS ran in the MSG [rec:bass#hardware]. BASS tested 99 percent oxygen "
        "[rec:bass#test_conditions.value.1.oxygen_percent].", by_id.get)
    assert out["kept"] == 1 and out["dropped"] == 1 and not out["passed"]
    assert "99" not in out["text"]


# Retrieval + coverage


def test_retrieval_prefers_named_record():
    top = retrieval.retrieve("What oxygen range did BASS-II test?", _recs())[0]
    assert top["record"]["id"] == "bass-ii"


def test_coverage_gate():
    recs = _recs()

    def cov(q):
        return retrieval.coverage(q, retrieval.retrieve(q, recs))

    # bass-ii has no oxygen data: topic matches but values are missing.
    c = cov("What oxygen range did BASS-II test?")
    assert not c["covered"] and "test_conditions.oxygen_percent" in c["missing"]
    assert cov("Tell me about Saffire")["covered"]
    assert cov("What should the crew do after a fire alarm?")["kind"] == "procedure"
    assert cov("How does a rocket engine fire behave?")["kind"] == "scope"
    assert cov("How does flame spread behave at Moon gravity?")["kind"] == "gap"
    assert not cov("xqzzy flurb")["covered"]


# Endpoints (mocked provider)


def test_summary_verifies_and_shapes(client, monkeypatch):
    monkeypatch.setattr(
        "backend.app.si_provider.generate",
        lambda *a, **k: {"findings": [{"text": "BASS ran in the MSG [rec:bass#hardware]."}],
                         "interpretation": [], "gaps": ["oxygen ranges pending"]})
    r = client.get("/api/si/summary/bass").json()
    assert r["verification"]["passed"] and r["findings"][0]["citations"] == ["rec:bass#hardware"]
    assert client.get("/api/si/summary/nope").status_code == 404


def test_summary_drops_unverified(client, monkeypatch):
    monkeypatch.setattr(
        "backend.app.si_provider.generate",
        lambda *a, **k: {"findings": [{"text": "BASS tested 99 percent oxygen "
                                                "[rec:bass#test_conditions.value.1.oxygen_percent]."}],
                         "interpretation": [], "gaps": []})
    r = client.get("/api/si/summary/bass").json()
    assert r["findings"] == [] and not r["verification"]["passed"]


def test_summary_503_without_key(client):
    assert client.get("/api/si/summary/bass").status_code == 503


def test_ask_gap_without_provider(client):
    r = client.post("/api/ask", json={"question": "How does flame spread behave at Moon gravity?"})
    j = r.json()
    assert r.status_code == 200 and not j["covered"] and j["verification"]["passed"]
    assert "partial-gravity" in " ".join(j["missing"])


def test_ask_answerable_flows(client, monkeypatch):
    assert client.post("/api/ask", json={"question": "Tell me about Saffire"}).status_code == 503
    monkeypatch.setattr(
        "backend.app.si_provider.generate",
        lambda *a, **k: {"answer": "Saffire-I burned a large fabric sample [rec:saffire-i#fuels]."})
    j = client.post("/api/ask", json={"question": "Tell me about Saffire"}).json()
    assert j["covered"] and j["citations"] == ["rec:saffire-i#fuels"]
    assert client.post("/api/ask", json={"question": "  "}).status_code == 400


def test_compare_shapes_and_validation(client, monkeypatch):
    monkeypatch.setattr(
        "backend.app.si_provider.generate",
        lambda *a, **k: {"similarities": [{"text": "Both burned solids "
                                                     "[rec:bass#fuel_class] [rec:bass-ii#fuel_class]."}],
                         "differences": []})
    r = client.post("/api/si/compare", json={"ids": ["bass", "bass-ii"]}).json()
    assert r["verification"]["passed"] and len(r["similarities"][0]["citations"]) == 2
    assert client.post("/api/si/compare", json={"ids": ["bass", "bass"]}).status_code == 400
    assert client.post("/api/si/compare", json={"ids": ["bass", "nope"]}).status_code == 404
