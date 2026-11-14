# API (v1 draft)

Base path: `/api`. All responses are JSON. Errors use `{ "error": { "code": "...", "message": "..." } }`.

Dev 2 publishes a mocked version of these responses by the end of Phase 0 so the frontend and visualization work can start immediately.

## Health

`GET /api/health` returns `{ "status": "ok", "version": "<tag>" }`.

## Environments

`GET /api/environments`

Returns the available environment profiles.

```json
[
  {
    "id": "moon_base",
    "label": "Moon base",
    "oxygen_percent": { "min": 30, "max": null, "source": "brief" },
    "pressure_psi": { "min": null, "max": 10.2, "source": "brief" },
    "gravity": "partial_gravity_no_data",
    "assumptions": ["airflow range is an assumption"]
  }
]
```

## Investigations

`GET /api/investigations`

Query parameters: `hardware`, `fuel_class`, `pillar`, `gravity_regime`, `oxygen_min`, `oxygen_max`, `q` (text search), `limit`, `offset`.

Returns a list of summaries (id, name, hardware, fuel class, pillars, key condition ranges).

`GET /api/investigations/{id}`

Returns the full record, including per-field `status` and `source`.

## Ranking

`GET /api/rank?environment={id}&lens={all|prevention|detection|suppression}`

Returns investigations sorted by `rank_value` (descending). Factors with insufficient input are `status: insufficient_data` with `score: null`; they contribute 0 to `rank_value` and are excluded from `score`. See `docs/SCORING.md` for the evidence policy.

```json
[
  {
    "id": "bass-ii",
    "score": 0.87,
    "rank_value": 0.47,
    "insufficient_data": false,
    "evidence": {
      "completeness": 1.0,
      "coverage": 0.54,
      "evaluated": ["airflow_match", "fuel_relevance", "hardware_scale", "pillar_fit"],
      "unevaluated": [
        { "factor": "oxygen_overlap", "reason": "oxygen missing" }
      ]
    },
    "modeling_readiness": 1.0,
    "equipment_relevance": 0.5,
    "factors": [
      { "factor": "oxygen_overlap", "score": null, "weight": 3, "contribution": 0.0, "fields": ["test_conditions.oxygen_percent"], "status": "insufficient_data" }
    ],
    "flags": ["oxygen missing"]
  }
]
```

The numbers above illustrate the shape only. Returns 503 `scoring_disabled` when the operator kill-switch (`FLAMELAB_SCORING_ENABLED=off`) is set.

## Compare

`GET /api/compare?ids=a,b,c` (two or three ids)

Returns aligned fields for each investigation plus lists of similarities and differences computed from fields (SI commentary is a separate call).

## Conditions

`GET /api/conditions`

Returns oxygen, pressure and airflow ranges per investigation, plus reference zones for each environment profile. Missing ranges are returned as `null` with a status, never as zero.

## Gaps

`GET /api/gaps?environment={id}`

Returns named gaps: partial gravity, missing oxygen ranges, untested fuel and atmosphere combinations, with the records that bound each gap.

## SI summaries

`GET /api/si/summary/{id}?environment={id}`

Returns verified SI text with citations.

```json
{
  "id": "bass-ii",
  "findings": [{ "text": "...", "citations": ["rec:bass-ii#test_conditions.oxygen_percent"] }],
  "interpretation": [{ "text": "...", "citations": ["..."] }],
  "gaps": ["..."],
  "verification": { "passed": true }
}
```

`POST /api/si/compare` with `{ "ids": ["a","b"], "environment": "moon_base" }` returns `{ "ids", "environment", "similarities": [{text, citations}], "differences": [...], "verification": {"passed"} }`. Unverified sentences are dropped, never shown.

## Ask

`POST /api/ask`

```json
{ "question": "string", "environment": "moon_base" }
```

Response:

```json
{
  "answer": "string",
  "citations": ["rec:..."],
  "covered": true,
  "missing": [],
  "verification": { "passed": true }
}
```

When `covered` is `false`, `answer` says the data does not cover the question and `missing` names what is absent.

## Export

`GET /api/export?ids=a,b&format={csv|json}&fields=...`

Returns structured fields with source references for modeling use. CSV uses one row per test condition.

## Earth applications

`GET /api/earth-applications`

Returns documented links between investigations and terrestrial uses, each with its source.

## Status codes

| Code | Meaning |
| --- | --- |
| 200 | OK |
| 400 | Invalid parameters |
| 404 | Unknown id |
| 422 | Validation error |
| 429 | Rate limited (SI endpoints) |
| 500 | Server error |
| 503 | SI provider unavailable; the rest of the app keeps working |

## Versioning

Prefix with `/api/v1` once the schema is frozen. Breaking changes require a new version and a note in this file.
