# FlameLab Makefile. See docs/RUNBOOK.md for what each target means.

.PHONY: test test-ui eval-si validate-records audit run-api run-ui check-gaps

test:
	@echo "TODO: backend unit + API contract tests (Dev 2, Day 1 PM)" && exit 1

test-ui:
	@echo "TODO: frontend journey tests (Dev 5/6, Day 2)" && exit 1

eval-si:
	python3 scripts/eval_si_shape.py

validate-records:
	python3 scripts/validate_records.py

audit:
	@echo "TODO: content audit (Dev 6, Day 2 AM)" && exit 1

install:
	python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt

run-api:
	.venv/bin/python -m uvicorn backend.app:app --port 8000

run-ui:
	@echo "TODO: frontend dev server (Dev 5, Day 1 AM)" && exit 1

check-gaps:
	@for f in docs/API.md docs/DATA_SCHEMA.md docs/INVESTIGATIONS.md docs/RUNBOOK.md docs/SCORING.md docs/SI_GUIDELINES.md docs/BRIEF.md backend/config/environments.yaml backend/config/weights.yaml si/eval/questions.yaml si/prompts/summary.md si/prompts/comparison.md si/prompts/environment.md si/prompts/ask.md; do [ -e "$$f" ] && echo "OK $$f" || { echo "MISSING $$f"; exit 1; }; done
	@for s in psi-record-curation environment-profile-builder scoring-explainer grounded-si-summary citation-check grounded-qa conditions-map-data dashboard-ui-review release-readiness; do [ -e "skills/$$s/SKILL.md" ] && echo "OK skills/$$s" || { echo "MISSING skills/$$s"; exit 1; }; done
	python3 scripts/eval_si_shape.py
	python3 scripts/validate_records.py
	@echo "All gap checks passed."
