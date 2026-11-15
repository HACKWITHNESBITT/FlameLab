# FlameLab

Spacecraft fire-safety research explorer. It ranks NASA PSI combustion
investigations (BASS, Saffire, FLEX, SAME, DAFT, …) by relevance to a target
atmosphere such as a Moon base, and serves grounded, cited AI summaries of
each investigation. Audience: engineers and graduate students working on
spacecraft fire safety.

## Quickstart

Prerequisites: Python 3.9+ and Node 18+.

```sh
# 1. Backend
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
make validate-records

# 2. Frontend
cd frontend && npm install && cd ..

# 3. Run (two terminals)
make run-api     # http://localhost:8000
make run-ui      # http://localhost:5173
```

Open http://localhost:5173 in a browser. Without `MODEL_API_KEY`, SI panels
show an unavailable state and all data views keep working.

## Layout

| Path | Contents |
| --- | --- |
| `backend/` | FastAPI app, SQLite store, scoring engine, configs, tests |
| `frontend/` | React + TypeScript + Vite UI (see `frontend/README.md`) |
| `data/records/` | Curated investigation JSON (source of truth, 11 records) |
| `data/sources/` | Glenn fact sheets and combustion guide used for curation |
| `si/` | Provider client, keyword retrieval, citation verifier, prompts, eval |
| `docs/` | API, schema, scoring, SI rules, runbook, plans |
| `skills/` | Workflow checklists (curation, review, release) |
| `scripts/` | Record validation and eval-shape checks |

## Core rules

- **Scoring is deterministic.** A weighted sum over seven factors in
  `backend/scoring.py`; weights live in `backend/config/weights.yaml`.
  Missing input leaves a factor unevaluated — it is never filled in, and
  removing evidence can never improve a rank. See `docs/SCORING.md`.
- **No partial-gravity claims.** PSI holds microgravity and normal-gravity data
  only. The UI must always show that caveat for Moon/Mars environments.
- **SI output is verified or dropped.** Every generated sentence must carry a
  `[rec:<id>#<field.path>]` citation resolving to a real field, and every
  number must appear in the cited field. Failures are removed, not shown.
  See `docs/SI_GUIDELINES.md`.
- **Out of scope:** rocket/propellant fires and crew response procedures
  (direct those to mission safety authorities).

## Commands

| Command | Purpose |
| --- | --- |
| `make run-api` / `make run-ui` | Start backend / frontend dev servers |
| `make test` / `make test-ui` | Backend pytest / frontend Vitest suites |
| `cd frontend && npm run test:e2e` | Playwright journey tests (needs `npx playwright install` once) |
| `make validate-records` | Validate all records against `docs/DATA_SCHEMA.md` |
| `make eval-si` | Run the SI evaluation set (needs provider key) |
| `make check-gaps` | Verify required docs, configs, and skills exist |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MODEL_API_KEY` | — | Meta Model API key for Muse; SI endpoints 503 without it |
| `FLAMELAB_SI_MODEL` | `muse-spark-1.3` | SI model override |
| `FLAMELAB_SI_API_BASE` | `https://api.meta.ai/v1` | SI API base override |
| `FLAMELAB_SI_LOG` | `si/audit.log` | SI audit log path |
| `FLAMELAB_SCORING_ENABLED` | `on` | Set to `off` to disable `/api/rank` (kill-switch) |

Environment profiles and scoring weights: `backend/config/environments.yaml`,
`backend/config/weights.yaml`. Values from the project brief are marked
`source: brief`; everything else is a visible `source: assumption`.

## Docs

Start with `docs/BRIEF.md` (what the project is), then `docs/API.md`,
`docs/DATA_SCHEMA.md`, `docs/SCORING.md`, and `docs/RUNBOOK.md` (operations,
release checklist, rollback).
