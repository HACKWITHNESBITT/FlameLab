# FlameLab frontend

React + TypeScript + Vite + Tailwind. D3 draws the oxygen–airflow conditions map;
a radial wheel shows per-factor breakdown scores and a custom SVG radar overlays
compared investigations. Thin client: no scoring, retrieval, or verification
logic lives here — everything renders the [`docs/API.md`](../docs/API.md) contract.

## Develop

```sh
npm install
npm run dev      # http://localhost:5173; /api is proxied to localhost:8000
```

Start the backend first with `make run-api` from the repo root (or `make run-ui`
for this server). Without `MODEL_API_KEY`, SI panels show an unavailable state
and all data views keep working.

## Test

```sh
npm test          # Vitest: unit tests + full-app smoke test
npm run test:e2e  # Playwright: the three core journeys (needs `npx playwright install` once)
npm run build     # typecheck + production bundle
npm run lint      # oxlint
```

## Routes (hash routing, so deep links survive static hosting)

| Route | Journey |
| --- | --- |
| `#/` | overview — what FlameLab is and how to use it |
| `#/rank` | 1 — environment + lens → ranked list with breakdowns → detail |
| `#/investigations/:id` | 2 — detail → verified SI summary → conditions and measurements |
| `#/conditions` | 2 — oxygen vs airflow map with target zones |
| `#/gaps` | 3 — gaps with bounding records |
| `#/compare?ids=a,b` | 3 — field comparison + SI commentary + export |
| `#/ask` | grounded Q&A with explicit not-covered answers |
| `#/earth` | documented terrestrial applications |
