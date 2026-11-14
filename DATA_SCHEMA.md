# DATA_SCHEMA (v1 draft)

Data dictionary for curated investigation records. Freeze this in Phase 0. Changes after the freeze need a migration and a note here.

## Record conventions

- One JSON file per investigation: `data/records/<investigation-id>.json`.
- Every field value is an object: `{ "value": ..., "unit": ..., "status": "read|inferred|missing|ambiguous", "source": {...} }`.
- `source` identifies the PSI document or dataset and the location within it.
- Missing values are `null` with `status: "missing"`. Never use `0` or an empty string to mean unknown.
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
| `id` | string | Stable slug, e.g. `bass-ii` |
| `name` | string | Display name |
| `acronym_expansion` | string | Full name, e.g. Burning and Suppression of Solids |
| `project` | string | Parent project if any, e.g. ACME |
| `hardware` | enum | `CIR`, `MSG`, `other` |
| `hardware_detail` | string | e.g. MDCA, SPICE flow duct, ACME modular hardware |
| `platform` | string | e.g. ISS |
| `gravity_regime` | enum | `microgravity`, `normal_gravity`, `mimicked_partial` |
| `safety_pillars` | list | any of `prevention`, `detection`, `suppression` |
| `fuel_class` | enum | `solid`, `gas`, `liquid_droplet`, `aerosol_dust`, `other` |
| `objectives` | list of strings | Experimental objectives |
| `summary` | string | Short curated description (not SI-generated) |
| `psi_url` | string | Link to PSI record |
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
