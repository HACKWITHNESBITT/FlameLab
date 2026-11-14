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

Each factor returns a score from 0 to 1, or is unevaluated when its input is insufficient (see Evidence policy).

| Factor | What it measures | Fields used |
| --- | --- | --- |
| `oxygen_overlap` | How much of the investigation's tested oxygen range overlaps the environment's | `test_conditions.oxygen_percent` |
| `pressure_overlap` | Overlap with the environment's pressure | `test_conditions.pressure_psi` |
| `airflow_match` | Closeness of tested airflow to expected cabin airflow | `test_conditions.airflow_cm_s` |
| `fuel_relevance` | Whether fuel class matches materials of concern (solids for flammability limits, gases for models, droplets for suppression science) | `fuels`, `fuel_class` |
| `hardware_scale` | Relevance of test scale to real habitat fires | `hardware`, `fuels.size` |
| `gravity_relevance` | Microgravity evidence for orbital environments; normal-gravity bounds for surface environments, with a flag | `gravity_regime` |
| `pillar_fit` | Match between the investigation's safety pillars and the selected lens | `safety_pillars` |

`data_completeness` (share of key fields `read`) is reported in the evidence block, not weighted into the score.

## Combination

```
score       = sum(weight_i * factor_i) / sum(weight_i)   over EVALUATED factors
rank_value  = sum(weight_i * factor_i) / sum(weight_i)   over ALL factors (unevaluated = 0)
```

`score` is what the evidence says; `rank_value` orders the ranking. Because unevaluated factors contribute 0 to `rank_value`, removing evidence can never improve a rank.

## Evidence policy (strict)

A factor with insufficient input is UNEVALUATED (`score: null` with a reason) — never a number. In particular: condition factors with no record data, airflow with no environment reference range, fuel/hardware/pillar inputs unconfirmed, and micro/normal-gravity records in partial-gravity environments (no partial-gravity data exists; only `mimicked_partial` evaluates there, as an analogue).

- Reported `score` = weighted mean over EVALUATED factors only ("given what we know").
- `rank_value` = weighted sum over ALL weights with unevaluated contributing 0. This orders the ranking, which guarantees removing evidence can never improve a rank.
- `evidence` block reports `completeness` (share of ten key fields `read`), `coverage` (evaluated weight / total weight), and the evaluated/unevaluated factor lists with reasons. Completeness is never multiplied into the score.
- Records with no evaluated factors get `score: null`, `insufficient_data: true`, and sort last.

## Factor formulas (v1)

Implemented verbatim in `backend/scoring.py`. Heuristic tables live in `backend/config/scoring_tables.yaml` with provenance and review ownership; they are engineering judgments pending domain-expert review.

- `oxygen_overlap`: measure of (union of tested O2 ranges ∩ environment range, capped to 0–100%) divided by the capped environment width. Fixed-point environments: 1 if covered, else `1 − distance/100`. No record data: unevaluated.
- `pressure_overlap`: same, with floor 0 and open maxima capped at 20 psi; fixed points decay over 20 psi. No record data: unevaluated.
- `airflow_match`: 1 on any range overlap, else `1 / (1 + gap/env_width)`. No record data or no environment reference: unevaluated.
- `fuel_relevance`: lens-keyed config table (prevention → `solid`, detection → `aerosol_dust`, suppression → `liquid_droplet`). Genuine mismatch scores low but evaluated; unconfirmed fuel class is unevaluated.
- `hardware_scale`: config table (Saffire project 1.0, CIR 0.6, MSG 0.5, other 0.4). Unconfirmed hardware is unevaluated.
- `gravity_relevance`: config table per environment class. Orbital/normal envs score by regime; partial envs leave micro/normal records unevaluated with the no-partial-data flag.
- `pillar_fit`: 1 on lens match; 0.2 on genuine mismatch (evaluated); unevaluated when pillars are unassigned.
- Modeling readiness: quarters for numeric conditions, sized fuels, measurements, and non-empty varied variables.
- Equipment relevance: `pillar_fit × hardware_scale` (null when either input is unevaluated).

## Rollback

Set `FLAMELAB_SCORING_ENABLED=off` and restart: `/api/rank` returns 503 `scoring_disabled` while every data endpoint keeps working. See `docs/RUNBOOK.md`.

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
- **Equipment relevance:** `pillar_fit × hardware_scale` (null when either input is unevaluated), to highlight research informing next-generation detection, suppression and material selection.

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
