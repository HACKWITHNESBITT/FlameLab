# conditions-map-data

## When to use

Preparing data for the oxygen versus airflow map.

## Inputs

Investigation records.

## Steps

1. Extract oxygen, pressure and airflow ranges per investigation.
2. Convert units to a documented standard (percent oxygen, psi, cm/s) and record originals.
3. Output points and ranges plus the target atmosphere reference zones.

## Output

JSON consumed by the conditions endpoint.

## Guardrails

Show missing ranges as gaps, not zeros.
