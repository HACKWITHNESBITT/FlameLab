# scoring-explainer

## When to use

Explaining why an investigation ranked where it did.

## Inputs

An investigation record, an environment profile, the factor breakdown from the scoring API.

## Steps

1. Read the per-factor contributions.
2. State the top two contributing factors and the largest drag.
3. Reference the field values behind each factor.
4. Add any data-quality flags that lowered confidence.

## Output

A two to four sentence explanation with field citations.

## Guardrails

Explain only what the breakdown shows; do not add reasons that are not factors.
