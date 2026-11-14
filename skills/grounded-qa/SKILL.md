# grounded-qa

## When to use

Answering user questions in the Ask panel.

## Inputs

The question; retrieved records.

## Steps

1. Retrieve the most relevant records and fields.
2. If coverage is insufficient, answer "not covered by the available data" and name what is missing.
3. Otherwise answer from the retrieved fields only, with citations.
4. Run `citation-check`.

## Output

Answer with citations, or an explicit not-covered response.

## Guardrails

No speculation; no operational safety procedures. Point to mission safety authorities for procedures.
