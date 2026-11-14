# psi-record-curation

## When to use

Turning a PSI investigation into a structured record.

## Inputs

Investigation name; PSI documents, datasets and descriptions.

## Steps

1. Locate the investigation in PSI and list its documents and datasets.
2. Fill every field in `docs/DATA_SCHEMA.md`: objective, fuels (type, shape, size), oxygen concentration, pressure, airflow speed, variables changed and held constant, sensors and measurements, hardware, gravity regime, safety pillar.
3. For each field record its source (document and section) and whether it was read directly or inferred.
4. Flag missing or ambiguous values with `status: missing` or `status: ambiguous`.
5. Validate against the schema and write to `data/records/<investigation-id>.json`.

## Output

One validated JSON record plus a short data-quality note.

## Guardrails

Never fill a field from memory; never convert units without recording the original; mark inferred values.
