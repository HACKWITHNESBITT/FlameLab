# release-readiness

## When to use

Before any demo or deploy.

## Inputs

The release candidate (code + configs + records).

## Steps

Run tests and the SI evaluation set; spot-check at least five records against PSI; confirm the audit log shows no unverified SI text; confirm `docs/` matches behavior; follow `docs/RUNBOOK.md` release checklist.

## Output

Go or no-go with reasons.
