# INVESTIGATIONS

The agreed list of PSI investigations to curate into `data/records/<id>.json` (see `docs/DATA_SCHEMA.md`). Agree and freeze this list in Phase 0.

IDs are stable slugs used in API paths and SI citation tokens (`rec:<id>#<field.path>`). PSI IDs are the persistent PSI identifiers stored in each record's `psi_id` field. Triage and exclusion rules live in `docs/DATA_OPERATIONS_GUIDE.md`.

Any cell marked **TBD** must be filled from PSI during curation (skill `psi-record-curation`), never from memory.

## In-scope investigations

| ID | PSI ID | Name | Type | Hardware | Fuel class | Pillars | Gravity | Curation block |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bass` | TBD | BASS | `microgravity` | MSG | `solid` | TBD | `microgravity` | Day 1 AM |
| `bass-ii` | TBD | BASS-II | `microgravity` | MSG | `solid` | TBD | `microgravity` | Day 1 AM |
| `saffire-i` | TBD | Saffire-I | `microgravity` | `other` | `solid` (TBD) | TBD | `microgravity` | Day 1 AM |
| `saffire-ii` | TBD | Saffire-II | `microgravity` | `other` | `solid` (TBD) | TBD | `microgravity` | Day 1 AM |
| `saffire-iii` | TBD | Saffire-III | `microgravity` | `other` | `solid` (TBD) | TBD | `microgravity` | Day 1 AM |
| `same` | TBD | SAME | `microgravity` | TBD | TBD | detection | `microgravity` | Day 1 PM |
| `same-r` | TBD | SAME-R | `microgravity` | TBD | TBD | detection | `microgravity` | Day 1 PM |
| `daft` | TBD | DAFT | `microgravity` | TBD | `aerosol_dust` | detection | `microgravity` | Day 1 PM |
| `daft-2` | TBD | DAFT-2 | `microgravity` | TBD | `aerosol_dust` | detection | `microgravity` | Day 1 PM |
| `flex` | TBD | FLEX | `microgravity` | CIR (MDCA) | `liquid_droplet` | suppression | `microgravity` | Day 1 PM |
| `flex-2` | TBD | FLEX-2 | `microgravity` | CIR (MDCA) | `liquid_droplet` | suppression | `microgravity` | Day 1 PM |
| `bass-model` | PSI-62 | Concurrent Flame Spread Modeling (BASS/BASS-II) | `ground` | `other` (FGM modeling) | `solid` | TBD | `microgravity` | Day 1 PM |
| `cfi` | TBD | CFI | `microgravity` | CIR (MDCA) | `liquid_droplet` | TBD | `microgravity` | Day 2 AM |
| `cfi-g` | PSI-159 | CFI-G | `microgravity` | TBD | `gas` (TBD) | TBD | `microgravity` | Day 2 AM |
| `acme-bre` | TBD | BRE (ACME) | `microgravity` | CIR (modular) | `gas` | TBD | `microgravity` | Day 2 AM |
| `acme-efield` | TBD | E-FIELD Flames (ACME) | `microgravity` | CIR (modular) | `gas` | TBD | `mimicked_partial` | Day 2 AM |
| `acme-flame-design` | PSI-10 | Flame Design (ACME) | `microgravity` | CIR (modular) | `gas` | TBD | `microgravity` | Day 2 AM |
| `coolflame-model` | PSI-117 | Thermo-Convective Perturbation of Cool Flames | `ground` | `other` (OpenFOAM CFD) | `liquid_droplet` | TBD | `microgravity` | Day 2 AM |
| `spice` | TBD | SPICE | `microgravity` | TBD (SPICE flow duct) | TBD | TBD | `microgravity` | Day 2 AM |
| `spice-analysis` | PSI-60 | Computational/Experimental Analysis of SPICE Data | `ground` | `other` (imagery analysis) | `gas` (TBD) | TBD | `microgravity` * | Day 2 AM |
| `slice` | TBD | SLICE | `microgravity` | TBD (uses SPICE duct) | TBD | TBD | `microgravity` | Day 2 AM |

Notes:

- `TBD` PSI IDs are confirmed from PSI landing pages during Phase 0 / Day 1 curation, together with each record's DOI citation.
- BASS and BASS-II use a fan-driven flow duct reused from SPICE. Saffire runs are large-scale spacecraft fire experiments.
- FLEX and FLEX-2 dilute the atmosphere with carbon dioxide and helium.
- ACME is a parent project with six gaseous-flame experiments sharing modular CIR hardware. BRE, E-FIELD Flames, and Flame Design (PSI-10) are confirmed; the remaining three are TBD from PSI (see open questions). BRE studies flammability in still atmospheres. E-FIELD Flames is the only `mimicked_partial` record (electric-field effects mimic partial gravity); never use a Moon or Mars value.
- Ground investigations (`bass-model`, `coolflame-model`, `spice-analysis`) analyze or model flight data; their `gravity_regime` reflects the underlying data per schema rule 8.
- \* `spice-analysis` (PSI-60) compares 1g and 0g SPICE imagery; capture both sides in record fields with a note.
- `same` / `same-r` fuel class is TBD: confirm the smoked fuels in PSI (`aerosol_dust` describes what is measured, not the fuel).
- `cfi-g` reached the highest microgravity oxygen concentrations (up to 85%); prioritize its oxygen-range accuracy for Moon-base overlap.

## Not in the dataset (tracked as gaps)

| Name | Status | How to treat it |
| --- | --- | --- |
| FM2 | Expected future partial-gravity experiment | No data. Mention only in the gaps view; do not create a record |
| LUCI | Expected future partial-gravity experiment | As FM2 |

## Out of scope

- Rocket and propellant fires (see `docs/SI_GUIDELINES.md`, rule 8).
- Complex Fluids, Materials Science, and Fluid Physics research areas (see triage guide).
- Crew response procedures; point to mission safety authorities.

## Coverage by pillar (target)

| Pillar | Investigations |
| --- | --- |
| Prevention (ignition, material selection) | BASS, BASS-II, Saffire, BRE (TBD) |
| Detection | SAME, SAME-R, DAFT, DAFT-2 |
| Suppression | FLEX, FLEX-2, BASS and BASS-II (TBD) |

Confirm and correct these against PSI.

## Curation order

Solids first (BASS, BASS-II, Saffire), then detection (SAME, SAME-R, DAFT), suppression (FLEX, FLEX-2), and solid-fuel modeling (`bass-model`); then gaseous/droplet flight records (ACME constituents, CFI, CFI-G, SPICE, SLICE) and ground analyses (`coolflame-model`, `spice-analysis`).

## Record checklist (per investigation)

- [ ] All required schema fields present (`id`, `psi_id`, `name`, `hardware`, `gravity_regime`, `fuel_class`, `investigation_type`, `doi_citation`)
- [ ] At least one source per record
- [ ] Original and converted units recorded
- [ ] Missing and ambiguous values flagged, not filled
- [ ] Inferred values carry a note
- [ ] `related` links set (for example BASS to BASS-II, FLEX to FLEX-2)
- [ ] Passes schema validation
- [ ] Data-quality note written

## Open questions

1. What are the remaining three ACME experiments and their individual record ids? (BRE, E-FIELD Flames, and Flame Design are confirmed.)
2. Which Saffire runs have PSI data that fits the schema?
3. Which investigations belong in which safety pillar? Confirm with a domain expert.
4. Do SoFIE and FLARE (listed as current experiments on the NASA Glenn combustion page) have PSI data yet, or do they join FM2/LUCI as future gaps?
