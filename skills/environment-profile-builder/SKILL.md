# environment-profile-builder

## When to use

Defining or revising a target environment (spacecraft, station, Moon base, pressurized rover, Mars base).

## Inputs

Assumptions about oxygen, pressure, airflow, gravity and hardware scale.

## Steps

1. Start from the values in `docs/SCORING.md` (spacesuit 100% oxygen at 4.3 psi; expected Moon base and rover 30% or more oxygen at 10.2 psi or less; Earth air as reference).
2. Write each value with a label `source: brief` or `source: assumption`.
3. Save to `backend/config/environments.yaml`.
4. Re-run ranking tests.

## Output

Updated environment config and a diff summary.

## Guardrails

Assumptions must be visible in the UI; do not set gravity values as if measured data existed.
