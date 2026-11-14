# BRIEF (reconstructed for Phase 0)

The project brief is the `source: brief` authority for environment values. This file pins what the team agreed the brief says, so `source: brief` vs `source: assumption` stays auditable. If the actual brief document disagrees, update this file and `backend/config/environments.yaml` together.

## Values from the brief

| Environment | Oxygen | Pressure | Source |
| --- | --- | --- | --- |
| Spacesuit (reference) | 100% | 4.3 psi | brief |
| Moon base and pressurized rover | 30% or more | 10.2 psi or less | brief; exact values to confirm |
| Earth air (reference) | about 21% | 14.7 psi sea level | brief (pressure); oxygen is reference knowledge |

Everything else (spacecraft/station atmospheres, Mars base, cabin airflow ranges, gravity notes, pillar emphasis) is `source: assumption` until confirmed. Assumptions must stay visible in the UI.

## Audience

Engineers and graduate students working on spacecraft fire safety, plus equipment/controls designers using the modeling and equipment views. Tone: clear, concise, technical, no hype.

## Three core questions

1. For my target atmosphere, which investigations are most relevant and why?
2. What did each investigation test (fuels, conditions, variables, measurements) and what does it imply for prevention, detection, or suppression?
3. What gaps remain (partial gravity, untested combinations, missing ranges) and what data can I export for modeling?

## Three core journeys (UI)

1. Select environment (+ lens) → ranked list with score breakdowns → investigation detail.
2. Detail → verified SI summary with citations → conditions and measurements.
3. Gaps view → compare → export structured fields for modeling.

The `dashboard-ui-review` skill checks these three journeys before merge.

## Out of scope

- Rocket and propellant fires.
- Crew response procedures (point to mission safety authorities).
- Partial-gravity predictions (PSI has no Moon/Mars-g combustion data; microgravity and normal-gravity results may only bound intermediate gravity).
