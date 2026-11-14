# skills.md

Catalogue of reusable skills for this project. A skill is a repeatable procedure with defined inputs, steps, outputs and guardrails. Use them in Claude Code or in the SI pipeline so work stays consistent.

Each skill below can be saved as its own `SKILL.md` folder. The structure for each is: **when to use**, **inputs**, **steps**, **output**, **guardrails**.

---

## 1. `psi-record-curation`

**When to use:** turning a PSI investigation into a structured record.

**Inputs:** investigation name; PSI documents, datasets and descriptions.

**Steps:**
1. Locate the investigation in PSI and list its documents and datasets.
2. Fill every field in `docs/DATA_SCHEMA.md`: objective, fuels (type, shape, size), oxygen concentration, pressure, airflow speed, variables changed and held constant, sensors and measurements, hardware, gravity regime, safety pillar.
3. For each field record its source (document and section) and whether it was read directly or inferred.
4. Flag missing or ambiguous values with `status: missing` or `status: ambiguous`.
5. Validate against the schema and write to `data/records/<investigation-id>.json`.

**Output:** one validated JSON record plus a short data-quality note.

**Guardrails:** never fill a field from memory; never convert units without recording the original; mark inferred values.

---

## 2. `environment-profile-builder`

**When to use:** defining or revising a target environment (spacecraft, station, Moon base, pressurized rover, Mars base).

**Inputs:** assumptions about oxygen, pressure, airflow, gravity and hardware scale.

**Steps:**
1. Start from the values in `docs/SCORING.md` (spacesuit 100% oxygen at 4.3 psi; expected Moon base and rover 30% or more oxygen at 10.2 psi or less; Earth air as reference).
2. Write each value with a label `source: brief` or `source: assumption`.
3. Save to `backend/config/environments.yaml`.
4. Re-run ranking tests.

**Output:** updated environment config and a diff summary.

**Guardrails:** assumptions must be visible in the UI; do not set gravity values as if measured data existed.

---

## 3. `scoring-explainer`

**When to use:** explaining why an investigation ranked where it did.

**Inputs:** an investigation record, an environment profile, the factor breakdown from the scoring API.

**Steps:**
1. Read the per-factor contributions.
2. State the top two contributing factors and the largest drag.
3. Reference the field values behind each factor.
4. Add any data-quality flags that lowered confidence.

**Output:** a two to four sentence explanation with field citations.

**Guardrails:** explain only what the breakdown shows; do not add reasons that are not factors.

---

## 4. `grounded-si-summary`

**When to use:** generating summaries, comparisons and environment interpretations for the UI.

**Inputs:** one or more curated records; the SI grounding rules in `docs/SI_GUIDELINES.md`.

**Steps:**
1. Use only supplied record fields.
2. Write short sentences, each ending with a citation token such as `[rec:bass-ii#oxygen]`.
3. Separate **findings** (from fields) from **interpretation** (labelled as interpretation).
4. List open questions and named gaps (partial gravity, missing oxygen ranges, untested combinations).
5. Run the `citation-check` skill before output.

**Output:** structured summary with citations.

**Guardrails:** never state a number that is not in a field; never imply partial-gravity measurements; hide anything unverified.

---

## 5. `citation-check`

**When to use:** verifying SI output before display.

**Inputs:** SI text with citation tokens; the record store.

**Steps:**
1. Parse every citation token.
2. Confirm the record and field exist.
3. Confirm the cited field supports the sentence (value match, no overreach).
4. Mark failures and remove or flag the sentence.

**Output:** pass/fail report and cleaned text.

**Guardrails:** fail closed; a missing citation is a failure.

---

## 6. `grounded-qa`

**When to use:** answering user questions in the Ask panel.

**Inputs:** the question; retrieved records.

**Steps:**
1. Retrieve the most relevant records and fields.
2. If coverage is insufficient, answer "not covered by the available data" and name what is missing.
3. Otherwise answer from the retrieved fields only, with citations.
4. Run `citation-check`.

**Output:** answer with citations, or an explicit not-covered response.

**Guardrails:** no speculation; no operational safety procedures. Point to mission safety authorities for procedures.

---

## 7. `conditions-map-data`

**When to use:** preparing data for the oxygen versus airflow map.

**Inputs:** investigation records.

**Steps:**
1. Extract oxygen, pressure and airflow ranges per investigation.
2. Convert units to a documented standard (percent oxygen, psi, cm/s) and record originals.
3. Output points and ranges plus the target atmosphere reference zones.

**Output:** JSON consumed by the conditions endpoint.

**Guardrails:** show missing ranges as gaps, not zeros.

---

## 8. `dashboard-ui-review`

**When to use:** reviewing a UI change before merge.

**Steps:**
1. Check the three core journeys still work.
2. Check keyboard navigation, focus states and contrast.
3. Check every displayed number traces to a record field.
4. Check the partial-gravity gap is still visible.
5. Check loading, empty and error states.

**Output:** checklist with pass/fail and notes.

---

## 9. `release-readiness`

**When to use:** before any demo or deploy.

**Steps:** run tests and the SI evaluation set; spot-check at least five records against PSI; confirm the audit log shows no unverified SI text; confirm `docs/` matches behavior; follow `docs/RUNBOOK.md` release checklist.

**Output:** go or no-go with reasons.

---

## Adding a new skill

1. Create `skills/<name>/SKILL.md` with the five sections above.
2. Add it to this file.
3. Add any test fixtures under `skills/<name>/examples/`.
