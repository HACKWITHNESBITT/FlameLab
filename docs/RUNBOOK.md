# RUNBOOK

Operations guide for running, checking and releasing FlameLab. Stack: see `TECHNICAL_STACK_AND_ARCHITECTURE.md` (React + TypeScript + Vite frontend, FastAPI backend, JSON + SQLite data, Claude SI layer).

## Components

| Component | Location | Notes |
| --- | --- | --- |
| Curated records | `data/records/*.json` | Source of truth; schema in `docs/DATA_SCHEMA.md` |
| Backend and API | `backend/` | FastAPI; endpoints in `docs/API.md` |
| Config | `backend/config/environments.yaml`, `backend/config/weights.yaml` | Profiles and scoring weights; see `docs/SCORING.md` |
| SI layer | `si/` (`si/prompts/`, `si/eval/questions.yaml`) | Muse API; rules in `docs/SI_GUIDELINES.md` |
| Frontend | `frontend/` | React + TypeScript + Vite; Recharts + D3 for visualizations |

## Setup

1. Create and activate the project virtualenv inside the repo (`.venv`), install backend dependencies; `npm install` in `frontend/`.
2. Validate records: `make validate-records` (schema per `docs/DATA_SCHEMA.md`).
3. Start the API: `make run-api` (serves `/api` per `docs/API.md`).
4. Start the frontend: `make run-ui` (reads the same `/api` base path).
5. SI provider key: export `MODEL_API_KEY` (Meta Model API key for Muse); without it SI endpoints return `503` and the rest of the app keeps working.

## Common commands

| Task | Command |
| --- | --- |
| Run backend tests | `make test` (pytest) |
| Run frontend tests | `make test-ui` (Vitest) |
| Validate records against schema | `make validate-records` |
| Evaluate the SI layer | `make eval-si` |
| Content audit | `make audit` |
| Start the API locally | `make run-api` |
| Start the frontend locally | `make run-ui` |

## Health check

`GET /api/health` returns `{ "status": "ok", "version": "<tag>" }`.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| 503 from `/api/si/*` or `/api/ask` | SI provider unavailable | The rest of the app should keep working. Check provider status and credentials; the UI should show SI as unavailable, not blank |
| 429 from SI endpoints | Rate limiting | Wait and retry; check client call volume |
| 422 when loading a record | Schema validation failure | Run validation, then fix the record (not the schema) unless the schema itself is wrong |
| Scores look wrong | Config or data change | Check `weights.yaml` and `environments.yaml`, then run the golden tests |
| SI text missing | Verifier failed closed | This is intended. Check the audit log for the failed citation and fix the record or prompt |
| A range shows as zero | Bug | Missing values must be `null` with `status: missing`; fix the loader or record |

## Audit log

The SI layer logs the question, generated text, sources and verification result. Check it for unverified text before every release.

## Release checklist

Used by the `release-readiness` skill before any demo or deploy.

- [ ] All tests pass
- [ ] `make eval-si` passes with zero unsupported claims
- [ ] At least five records spot-checked against PSI
- [ ] Audit log shows no unverified SI text displayed
- [ ] Weights and profiles are in config, with assumptions labelled `source: assumption`
- [ ] The partial-gravity gap is visible in the UI; the flag appears for Moon and Mars
- [ ] The three core journeys work (see `docs/BRIEF.md`)
- [ ] Accessibility pass: keyboard navigation, focus states, contrast
- [ ] `docs/` matches current behavior (API, schema, scoring, SI)
- [ ] No secrets in prompts, logs or the repo
- [ ] Version tag set and `/api/health` reports it

**Decision:** go or no-go, with reasons recorded.

## Rollback

Redeploy the previous tag on the demo host (Render/Fly.io); configs (`environments.yaml`, `weights.yaml`) roll back with code. Record fixes go forward as new commits, never as edits to a release tag. At minimum, keep the previous tag deployable and record the data version alongside it.

## Schema and data changes

After the schema freeze (G1), changes need a migration and a note in `docs/DATA_SCHEMA.md`. Breaking API changes need a new version and a note in `docs/API.md`.

## Safety note

FlameLab summarizes research data only. It must not give crew response procedures; direct users to mission safety authorities.
