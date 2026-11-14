# grounded-si-summary

## When to use

Generating summaries, comparisons and environment interpretations for the UI.

## Inputs

One or more curated records; the SI grounding rules in `docs/SI_GUIDELINES.md`.

## Steps

1. Use only supplied record fields.
2. Write short sentences, each ending with a full-path citation token such as `[rec:bass-ii#test_conditions.value.0.oxygen_percent]`.
3. Separate **findings** (from fields) from **interpretation** (labelled as interpretation).
4. List open questions and named gaps (partial gravity, missing oxygen ranges, untested combinations).
5. Run the `citation-check` skill before output.

## Output

Structured summary with citations.

## Guardrails

Never state a number that is not in a field; never imply partial-gravity measurements; hide anything unverified.
