# INVESTIGATIONS

The agreed list of PSI investigations to curate into `data/records/<id>.json` (see `docs/DATA_SCHEMA.md`). Agree and freeze this list in Phase 0.

Everything here comes from `docs/GLOSSARY.md` and `docs/TWO_DAY_PLAN.md`. Any cell marked **TBD** must be filled from PSI during curation (skill `psi-record-curation`), never from memory.

## In-scope investigations

| Proposed id | Name | Fuel class | Hardware | Pillar(s) | Curation block (Owner: Dev 1) | Notes from project docs |
| --- | --- | --- | --- | --- | --- | --- |
| `bass` | BASS | solid | MSG | TBD | Day 1 AM | Burning and Suppression of Solids; fan-driven flow duct reused from SPICE |
| `bass-ii` | BASS-II | solid | MSG | TBD | Day 1 AM | Same flow duct as BASS |
| `saffire-i` | Saffire-I | solid (TBD) | other | TBD | Day 1 AM | Large-scale spacecraft fire experiment |
| `saffire-ii` | Saffire-II | TBD | other | TBD | Day 1 AM | Large-scale |
| `saffire-iii` | Saffire-III | TBD | other | TBD | Day 1 AM | Large-scale |
| `same` | SAME | aerosol_dust (TBD) | TBD | detection | Day 1 PM | Smoke and Aerosol Measurement Experiment |
| `same-r` | SAME-R | TBD | TBD | detection | Day 1 PM | Fire detection studies |
| `daft` | DAFT | aerosol_dust | TBD | detection | Day 1 PM | Used a SAME smoke-detection instrument to detect dust |
| `daft-2` | DAFT-2 | aerosol_dust | TBD | detection | Day 1 PM | As DAFT |
| `flex` | FLEX | liquid_droplet | CIR (MDCA) | suppression | Day 1 PM | Atmosphere dilution with CO2 and helium |
| `flex-2` | FLEX-2 | liquid_droplet | CIR (MDCA) | suppression | Day 1 PM | As FLEX |
| `acme-*` | ACME (six experiments, including BRE and E-FIELD Flames) | gas | CIR | TBD | Day 2 AM | Same modular hardware for all six; one record per experiment. BRE studies flammability in still atmospheres. E-FIELD Flames mimics partial gravity through electric-field effects, so use `mimicked_partial` and never a Moon or Mars value |
| `cfi` | CFI | liquid_droplet | CIR (MDCA) | TBD | Day 2 AM | Cool flames; burning droplets |
| `cfi-g` | CFI-G | gas (TBD) | TBD | TBD | Day 2 AM | Reached up to 85% oxygen in microgravity, the highest in the set |
| `spice` | SPICE | TBD | other (SPICE flow duct) | TBD | Day 2 AM | Smoke Point In Co-flow Experiment |
| `slice` | SLICE | TBD | other | TBD | Day 2 AM | Structure and Liftoff In Combustion Experiment; uses the SPICE flow duct |

The six ACME experiment names beyond BRE and E-FIELD Flames are **TBD** (take them from PSI).

## Not in the dataset (tracked as gaps)

| Name | Status | How to treat it |
| --- | --- | --- |
| FM2 | Expected future partial-gravity experiment | No data. Mention only in the gaps view; do not create a record |
| LUCI | Expected future partial-gravity experiment | As FM2 |

## Out of scope

Rocket and propellant fires (see `docs/SI_GUIDELINES.md`, rule 8).

## Coverage by pillar (target)

| Pillar | Investigations |
| --- | --- |
| Prevention (ignition, material selection) | BASS, BASS-II, Saffire, BRE (TBD) |
| Detection | SAME, SAME-R, DAFT, DAFT-2 |
| Suppression | FLEX, FLEX-2, BASS and BASS-II (TBD) |

Confirm and correct these against PSI.

## Record checklist (per investigation)

- [ ] All required schema fields present (`id`, `name`, `hardware`, `gravity_regime`, `fuel_class`)
- [ ] At least one source per record
- [ ] Original and converted units recorded
- [ ] Missing and ambiguous values flagged, not filled
- [ ] Inferred values carry a note
- [ ] `related` links set (for example BASS to BASS-II, FLEX to FLEX-2)
- [ ] Passes schema validation
- [ ] Data-quality note written

## Open questions

1. What are the six ACME experiments and their individual record ids?
2. Which Saffire runs have PSI data that fits the schema?
3. Which investigations belong in which safety pillar? Confirm with a domain expert.
