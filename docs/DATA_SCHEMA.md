# DATA_SCHEMA (v1 FROZEN 2026-11-14, gate G1)

Data dictionary for curated investigation records. Changes after the freeze need a migration and a note here.

## Record conventions

- One JSON file per investigation: `data/records/<investigation-id>.json`.
- Identity and link fields are plain JSON values: `id`, `psi_id`, `name`, `acronym_expansion`, `project`, `platform`, `psi_url`, `doi_citation`, `related`.
- Every other field is a wrapped object: `{ "value": ..., "unit": ..., "status": "read|inferred|missing|ambiguous", "source": {...}, "note": ... }`.
  `value` may be a scalar, a list, or a range `{ "min": ..., "max": ... }` (either bound may be `null` for open ranges).
- `source` identifies the PSI document or dataset and the location within it. Required when `status` is `read`, `inferred`, or `ambiguous`; omitted when `missing`.
- `unit` is required for quantities (original unit); converted standard values go in `value` with the original in `note` when they differ.
- Missing values are `{ "value": null, "status": "missing" }`. Never use `0` or an empty string to mean unknown.
- Record original units and the converted standard unit.

## Standard units

| Quantity | Standard unit |
| --- | --- |
| Oxygen concentration | percent by volume |
| Pressure | psi (record original too) |
| Airflow speed | cm/s |
| Sample size | mm |

## Top-level fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Stable slug, e.g. `bass-ii`. Primary key for URLs, API paths, and SI citation tokens |
| `psi_id` | string | PSI persistent identifier, e.g. `PSI-159` (see `docs/DATA_OPERATIONS_GUIDE.md`) |
| `name` | string | Display name |
| `acronym_expansion` | string | Full name, e.g. Burning and Suppression of Solids |
| `project` | string | Parent project if any, e.g. ACME |
| `hardware` | enum | `CIR`, `MSG`, `other` |
| `hardware_detail` | string | e.g. MDCA, SPICE flow duct, ACME modular hardware |
| `platform` | string | e.g. ISS |
| `investigation_type` | enum | `microgravity` (ISS/flight data) or `ground` (ground analysis/CFD modeling flight data) |
| `gravity_regime` | enum | `microgravity`, `normal_gravity`, `mimicked_partial` |
| `safety_pillars` | list | any of `prevention`, `detection`, `suppression` |
| `fuel_class` | enum | `solid`, `gas`, `liquid_droplet`, `aerosol_dust`, `other` |
| `objectives` | list of strings | Experimental objectives |
| `summary` | string | Short curated description (not SI-generated) |
| `psi_url` | string | Link to PSI record |
| `doi_citation` | string | Persistent DOI citation string from the investigation's "Cite this Investigation" link |
| `related` | list of ids | Related investigations |
| `data_quality` | object | Completeness flags and notes |

## `fuels` (list)

| Field | Description |
| --- | --- |
| `name` | Material or gas |
| `phase` | `solid`, `gas`, `liquid` |
| `shape` | e.g. sheet, cylinder, droplet, burner type |
| `size` | dimensions with units |
| `notes` | free text |

## `test_conditions` (list, one entry per test or test group)

| Field | Description |
| --- | --- |
| `label` | Test or group name |
| `oxygen_percent` | value or range |
| `diluent` | e.g. nitrogen, carbon dioxide, helium |
| `pressure_psi` | value or range |
| `airflow_cm_s` | value or range |
| `ignition_method` | if known |
| `gravity_level` | e.g. microgravity |

## `variables`

| Field | Description |
| --- | --- |
| `varied` | list of what changed between tests |
| `held_constant` | list of what stayed the same |

## `measurements`

| Field | Description |
| --- | --- |
| `sensor` | Sensor or instrument |
| `quantity` | What was measured |
| `notes` | Resolution, range or caveats if given |

## `relevance_tags`

Free tags used in filtering, e.g. `flammability_limits`, `smoke_detection`, `extinguishment`, `soot`, `material_selection`, `modeling_data`.

## `earth_applications` (optional)

| Field | Description |
| --- | --- |
| `application` | e.g. fine-water-mist extinguishers, smoke detection, firefighter protective clothing and air tanks |
| `source` | Where the link is documented |

## Derived tables (database)

- `investigations`, `fuels`, `test_conditions`, `variables`, `measurements`, `hardware`, `sources`.
- `environment_profiles` loaded from config, not from records.
- `scores` computed on request, not stored, unless cached.

## Validation rules

1. `id`, `name`, `hardware`, `gravity_regime`, `fuel_class` are required.
2. At least one `source` per record.
3. Oxygen must be between 0 and 100.
4. Ranges require `min <= max`.
5. Any field with `status: inferred` needs a note explaining the inference.
6. `gravity_regime` must never be set to a Moon or Mars gravity value; PSI has no such data.
7. `psi_id` and `doi_citation` are required on every record (NASA SMD citation rule).
8. `investigation_type` is required. Ground investigations set `gravity_regime` to the regime of the data they analyze or model; mixed 1g/0g comparisons capture both sides in record fields with a note.
