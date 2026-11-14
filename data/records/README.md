# records

One JSON file per investigation: `<investigation-id>.json` (see `docs/INVESTIGATIONS.md` for the ID list).

Each file follows `docs/DATA_SCHEMA.md`: every field value is `{ value, unit, status, source }`, missing is `null` with `status: missing`. Curate via the `psi-record-curation` skill, then run `make validate-records`.
