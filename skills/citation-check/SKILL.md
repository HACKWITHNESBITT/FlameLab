# citation-check

## When to use

Verifying SI output before display.

## Inputs

SI text with citation tokens; the record store.

## Steps

1. Parse every citation token.
2. Confirm the record and field exist.
3. Confirm the cited field supports the sentence (value match, no overreach).
4. Mark failures and remove or flag the sentence.

## Output

Pass/fail report and cleaned text.

## Guardrails

Fail closed; a missing citation is a failure.
