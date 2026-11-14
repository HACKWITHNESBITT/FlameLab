# Extraction template and procedure

## Order of work

1. **Glenn fact sheet first** (`data/sources/glenn/`): objectives, fuels, hardware, qualitative conditions. Fast map of the record.
2. **Researcher's Guide** (`data/sources/guide/`): corroboration and examples. It predates Saffire-I (July 2016) and some flights — PSI wins on conflicts.
3. **PSI in the browser** (`https://psi.nasa.gov/physci/repo/search?q=combustion`): landing page gives `psi_id`, `doi_citation`, `psi_url`; data packages (ZIP/CSV) give numeric test conditions. PSI has no usable backend API (verified 2026-11-14: API paths 404, pages are an Angular SPA shell), so this step is manual.

## Per record

1. Copy `record-template.json` to `data/records/<id>.json` (ids in `docs/INVESTIGATIONS.md`).
2. Fill identity fields plain; wrap everything else with `status` + `source` (doc path + section).
3. Ranges as `{min, max}` with open bounds `null`; converted standard units in `value`, originals in `note`.
4. Missing is `{value: null, status: missing}`. Partial info (e.g. "higher flow than Saffire-I") goes in a `note`, never as a guessed value.
5. `inferred` always carries a `note` explaining the inference.
6. Run `make validate-records`. Fix the record, not the schema.
7. Write the `data_quality` note: what is still TBD and where it comes from.

## Guardrails

- Never fill from memory; never convert units without recording the original.
- `gravity_regime` is never a Moon/Mars value.
- Ground investigations set `gravity_regime` to the regime of the data they model (schema rule 8).
