# SCORING

How FlameLab ranks investigations for a target environment. The ranking is a transparent weighted sum. Every result carries its per-factor breakdown.

## Principles

1. **Explainable:** users can see why an investigation ranked where it did.
2. **Configurable:** weights and profiles live in config files.
3. **Honest about gaps:** missing data lowers confidence and is flagged, not silently filled.
4. **No partial-gravity claims:** PSI has no partial-gravity data. Gravity relevance only considers microgravity and normal-gravity evidence, plus a flag when an environment sits between them.

## Environment profiles

Defined in `backend/config/environments.yaml`. Values from the project brief are labelled `source: brief`; anything else is `source: assumption`.

| Environment | Oxygen | Pressure | Notes |
| --- | --- | --- | --- |
| Spacesuit (reference) | 100% | 4.3 psi | From brief |
| Moon base and pressurized rover | 30% or more | 10.2 psi or less | From brief; exact values to confirm |
| Earth air (reference) | about 21% | 14.7 psi | Earth sea-level pressure from brief |
| Spacecraft and station | assumption | assumption | Set in Phase 0 |
| Mars base | assumption | assumption | Set in Phase 0 |

Each profile also stores: expected airflow range (assumption), gravity regime note, and which safety pillars are emphasized.

## Factors

Each factor returns a score from 0 to 1.

| Factor | What it measures | Fields used |
| --- | --- | --- |
| `oxygen_overlap` | How much of the investigation's tested oxygen range overlaps the environment's | `test_conditions.oxygen_percent` |
| `pressure_overlap` | Overlap with the environment's pressure | `test_conditions.pressure_psi` |
| `airflow_match` | Closeness of tested airflow to expected cabin airflow | `test_conditions.airflow_cm_s` |
| `fuel_relevance` | Whether fuel class matches materials of concern (solids for flammability limits, gases for models, droplets for suppression science) | `fuels`, `fuel_class` |
| `hardware_scale` | Relevance of test scale to real habitat fires | `hardware`, `fuels.size` |
| `gravity_relevance` | Microgravity evidence for orbital environments; normal-gravity bounds for surface environments, with a flag | `gravity_regime` |
| `pillar_fit` | Match between the investigation's safety pillars and the selected lens | `safety_pillars` |
| `data_completeness` | Share of required fields that are `read` rather than `missing` or `inferred` | all |

## Combination

```
score = sum(weight_i * factor_i) / sum(weight_i)
```

Then apply a confidence multiplier from `data_completeness`. Report the multiplier separately in the breakdown.

## Factor formulas (v1)

Implemented verbatim in `backend/scoring.py`. All factors return 0 to 1. Missing inputs score 0 with a flag.

- `oxygen_overlap`: measure of (union of tested O2 ranges ∩ environment range, capped to 0–100%) divided by the capped environment width. Fixed-point environments (min = max): 1 if covered, else `1 − distance/100`.
- `pressure_overlap`: same, with floor 0 and open maxima capped at 20 psi; fixed points decay over 20 psi.
- `airflow_match`: 1 on any range overlap, else `1 / (1 + gap/env_width)`. 0 when the record has no airflow data; 0.5 when the environment has no reference airflow.
- `fuel_relevance`: lens-keyed table — prevention favors `solid` (1.0), detection favors `aerosol_dust` (1.0), suppression favors `liquid_droplet` (1.0); see `FUEL_BY_LENS`. Unconfirmed fuel class scores 0.
- `hardware_scale`: Saffire project 1.0 (meter scale), CIR 0.6, MSG 0.5, other 0.4, unconfirmed 0.
- `gravity_relevance`: orbital envs score microgravity 1.0; normal-gravity envs score normal 1.0; partial-gravity envs score every regime 0.6–0.7 (`mimicked_partial` highest) with the partial-gravity flag. The suit profile is treated as orbital.
- `pillar_fit`: 1 if the lens matches the record's pillars (or lens is `all` with any pillars); 0.2 on mismatch; 0.3 when unassigned under `all`.
- `data_completeness`: share of ten key fields with `status: read`.
- Confidence multiplier: `0.5 + 0.5 × data_completeness`. Final score = weighted mean × multiplier; `raw_score` and the multiplier are reported separately.
- Modeling readiness: quarters for numeric conditions, sized fuels, measurements, and non-empty varied variables.
- Equipment relevance: `pillar_fit × hardware_scale × confidence_multiplier`.

## Lenses

A lens raises the weight of related factors:

| Lens | Raised factors |
| --- | --- |
| All | none |
| Prevention (ignition, material selection) | `oxygen_overlap`, `fuel_relevance`, `pillar_fit` |
| Detection | `pillar_fit`, `hardware_scale`, `airflow_match` |
| Suppression | `pillar_fit`, `oxygen_overlap`, `fuel_relevance` |

## Additional scores

- **Modeling readiness:** share of required modeling fields present (conditions, sample geometry, measurements, variables changed and held constant).
- **Equipment relevance:** pillar fit weighted by hardware scale and data completeness, to highlight research informing next-generation detection, suppression and material selection.

## Example weights file

```yaml
# backend/config/weights.yaml
default:
  oxygen_overlap: 3
  pressure_overlap: 1
  airflow_match: 2
  fuel_relevance: 2
  hardware_scale: 1
  gravity_relevance: 2
  pillar_fit: 2
  data_completeness: 1
lenses:
  prevention:
    oxygen_overlap: 4
    fuel_relevance: 3
    pillar_fit: 3
  detection:
    pillar_fit: 4
    hardware_scale: 2
    airflow_match: 3
  suppression:
    pillar_fit: 4
    oxygen_overlap: 4
    fuel_relevance: 3
```

These numbers are starting points for the team to tune; they are not derived from data.

## Output shape

See `docs/API.md` for the response format. Each factor contribution lists the fields it used so the interface can link to them.

## Testing

- Unit tests for each factor with hand-checked inputs.
- Golden tests: for each environment, the top five must match a reviewed expectation (reviewed with Dev 1 and, if possible, a domain expert).
- Property tests: scores stay within 0 to 1; missing data never raises a score.

## Review checklist for scoring changes

- [ ] Weights remain in config.
- [ ] Breakdown still returned.
- [ ] Tests updated.
- [ ] This document updated.
- [ ] The partial-gravity flag still appears for Moon and Mars environments.
